import { Request, Response, Router } from "express";
import { authorize, Roles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { splitTextForSse, toSsePayload } from "./stream.utils";
import { StreamSummaryQueryDto, streamSummaryQuerySchema } from "./stream.validation";
import { ClinicalAlertModel } from "./models/clinical-alert.model";
import {
  AlertIdParamsDto,
  EncounterAlertsParamsDto,
  alertIdParamsSchema,
  encounterAlertsParamsSchema,
} from "./cds.validation";

const router = Router();
const ALL_ROLES: Roles[] = Object.values(Roles);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeEvent = (res: Response, event: string, payload: unknown) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const loadGeminiSdk = async () => {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<unknown>;

  return dynamicImport("@google/generative-ai") as Promise<{
    GoogleGenerativeAI: new (apiKey: string) => {
      getGenerativeModel: (input: { model: string }) => {
        streamGenerateContent?: (prompt: string) => Promise<{
          stream: AsyncIterable<{ text?: () => string }>;
        }>;
        generateContentStream?: (prompt: string) => Promise<{
          stream: AsyncIterable<{ text?: () => string }>;
        }>;
      };
    };
  }>;
};

const streamFromGemini = async (res: Response, encounterId: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const sdk = await loadGeminiSdk();
  const client = new sdk.GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  });

  const streamMethod = model.streamGenerateContent ?? model.generateContentStream;
  if (!streamMethod) {
    throw new Error("Gemini stream method not available in installed SDK");
  }

  const prompt = [
    "You are a clinical summarizer.",
    "Return only concise, clinically safe text.",
    `Encounter ID: ${encounterId}`,
    "Context source: mocked scrubbed context for streaming integration.",
  ].join("\n");

  const streamResult = await streamMethod.call(model, prompt);

  for await (const chunk of streamResult.stream) {
    const text = typeof chunk.text === "function" ? chunk.text() : "";
    if (!text) {
      continue;
    }

    res.write(toSsePayload(text));
  }
};

const streamFromMock = async (res: Response, encounterId: string) => {
  const mockText =
    `Mock summary for ${encounterId}: patient presented with fever, ` +
    "received triage assessment, and is stable for follow-up.";

  const chunks = splitTextForSse(mockText);
  for (const chunk of chunks) {
    res.write(toSsePayload(chunk));
    await wait(50);
  }
};

type StreamSummaryRequest = Request<Record<string, string>, unknown, unknown, StreamSummaryQueryDto>;
type EncounterAlertsRequest = Request<EncounterAlertsParamsDto>;
type AlertByIdRequest = Request<AlertIdParamsDto>;

router.get(
  "/stream-summary",
  authorize(ALL_ROLES),
  validateRequest({ query: streamSummaryQuerySchema }),
  async (req: StreamSummaryRequest, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    writeEvent(res, "start", { encounterId: req.query.encounterId });

    try {
      try {
        await streamFromGemini(res, req.query.encounterId);
      } catch {
        await streamFromMock(res, req.query.encounterId);
      }

      if (!closed) {
        writeEvent(res, "done", { complete: true });
      }
    } catch (error) {
      if (!closed) {
        writeEvent(res, "error", {
          message: "Streaming failed",
          detail: (error as Error).message,
        });
      }
    } finally {
      if (!closed) {
        res.end();
      }
    }
  },
);

router.get(
  "/alerts/encounter/:encounterId",
  authorize(ALL_ROLES),
  validateRequest({ params: encounterAlertsParamsSchema }),
  async (req: EncounterAlertsRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const alerts = await ClinicalAlertModel.find({
      clinicId,
      encounterId: req.params.encounterId,
      isDismissed: false,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      status: "success",
      data: alerts.map((item) => ({
        id: String(item._id),
        encounterId: item.encounterId,
        message: item.message,
        source: item.source,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : null,
      })),
    });
  },
);

router.patch(
  "/alerts/:id/dismiss",
  authorize(ALL_ROLES),
  validateRequest({ params: alertIdParamsSchema }),
  async (req: AlertByIdRequest, res: Response) => {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const updated = await ClinicalAlertModel.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { $set: { isDismissed: true, dismissedAt: new Date() } },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({
        error: "NotFound",
        message: "Alert not found",
      });
    }

    return res.json({
      status: "success",
      data: {
        id: String(updated._id),
        isDismissed: updated.isDismissed,
        dismissedAt: updated.dismissedAt ? new Date(updated.dismissedAt).toISOString() : null,
      },
    });
  },
);

export const aiRoutes = router;
