import { ClinicalAlertModel } from "./models/clinical-alert.model";
import { cdsEvents, VitalsCreatedEvent } from "./cds.events";
import { VitalsModel } from "../vitals/models/vitals.model";
import { EncounterModel } from "../encounters/models/encounter.model";
import { DiagnosisModel } from "../diagnoses/models/diagnosis.model";
import { ClinicalNoteModel } from "../notes/models/clinical-note.model";

type CdsJsonResponse = {
  hasAlert: boolean;
  message: string;
};

let workerInitialized = false;

const loadGeminiSdk = async () => {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<unknown>;

  return dynamicImport("@google/generative-ai") as Promise<{
    GoogleGenerativeAI: new (apiKey: string) => {
      getGenerativeModel: (input: {
        model: string;
        generationConfig?: Record<string, unknown>;
      }) => {
        generateContent: (input: string) => Promise<{
          response?: { text?: () => string };
        }>;
      };
    };
  }>;
};

const fallbackRuleAlert = (latestVitals: { temperature?: number; heartRate?: number }) => {
  const hasCriticalTemp = typeof latestVitals.temperature === "number" && latestVitals.temperature >= 39;
  const hasTachycardia = typeof latestVitals.heartRate === "number" && latestVitals.heartRate >= 120;

  if (hasCriticalTemp && hasTachycardia) {
    return {
      hasAlert: true,
      message: "AI Alert: Possible sepsis risk (critical fever with tachycardia). Urgent review recommended.",
    };
  }

  if (hasCriticalTemp) {
    return {
      hasAlert: true,
      message: "AI Alert: Critical fever detected. Escalate for clinician review.",
    };
  }

  return {
    hasAlert: false,
    message: "",
  };
};

const parseJsonResponse = (raw: string): CdsJsonResponse | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<CdsJsonResponse>;
    if (typeof parsed.hasAlert !== "boolean" || typeof parsed.message !== "string") {
      return null;
    }

    return { hasAlert: parsed.hasAlert, message: parsed.message.trim() };
  } catch {
    return null;
  }
};

const maybeExtractJson = (raw: string) => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }

  return parseJsonResponse(raw.slice(start, end + 1));
};

const buildCdsPrompt = (input: {
  encounterId: string;
  patientId: string;
  encounterStatus: string;
  vitals: Array<{ heartRate: number; temperature: number; bpSystolic: number; bpDiastolic: number; flags: string[] }>;
  diagnoses: Array<{ code: string; description: string; status: string }>;
  notes: Array<{ type: string; content: string }>;
}) => {
  const instruction = [
    "You are a clinical decision support agent.",
    'Return ONLY valid JSON with this exact shape: {"hasAlert": boolean, "message": "string"}',
    "No markdown. No explanations. No extra keys.",
    "Set hasAlert=true only when immediate attention is warranted.",
  ].join("\n");

  const context = JSON.stringify(input);

  return `${instruction}\n\nClinical Context:\n${context}`;
};

const runGeminiCds = async (prompt: string): Promise<CdsJsonResponse | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const sdk = await loadGeminiSdk();
  const client = new sdk.GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response?.text?.() ?? "";
  if (!text) {
    return null;
  }

  return parseJsonResponse(text) ?? maybeExtractJson(text);
};

const processVitalsCreated = async (event: VitalsCreatedEvent) => {
  const [latestVitals, encounter, diagnoses, notes] = await Promise.all([
    VitalsModel.findOne({ _id: event.vitalsId, clinicId: event.clinicId }).lean(),
    EncounterModel.findOne({ _id: event.encounterId, clinicId: event.clinicId }).lean(),
    DiagnosisModel.find({ encounterId: event.encounterId, clinicId: event.clinicId })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean(),
    ClinicalNoteModel.find({ encounterId: event.encounterId, clinicId: event.clinicId })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean(),
  ]);

  if (!latestVitals || !encounter) {
    return;
  }

  const prompt = buildCdsPrompt({
    encounterId: event.encounterId,
    patientId: encounter.patientId,
    encounterStatus: encounter.status,
    vitals: [
      {
        heartRate: latestVitals.heartRate,
        temperature: latestVitals.temperature,
        bpSystolic: latestVitals.bpSystolic,
        bpDiastolic: latestVitals.bpDiastolic,
        flags: latestVitals.flags ?? [],
      },
    ],
    diagnoses: diagnoses.map((item) => ({
      code: item.code,
      description: item.description,
      status: item.status,
    })),
    notes: notes.map((item) => ({
      type: item.type,
      content: item.content,
    })),
  });

  let decision: CdsJsonResponse | null = null;
  let source: "GEMINI" | "RULE_ENGINE" = "GEMINI";

  try {
    decision = await runGeminiCds(prompt);
  } catch (error) {
    console.error("[cds-worker] gemini evaluation failed", {
      clinicId: event.clinicId,
      encounterId: event.encounterId,
      error,
    });
  }

  if (!decision) {
    source = "RULE_ENGINE";
    decision = fallbackRuleAlert({
      temperature: latestVitals.temperature,
      heartRate: latestVitals.heartRate,
    });
  }

  if (!decision.hasAlert || !decision.message) {
    return;
  }

  await ClinicalAlertModel.create({
    clinicId: event.clinicId,
    encounterId: event.encounterId,
    message: decision.message,
    source,
    isDismissed: false,
    dismissedAt: null,
    metadata: {
      vitalsId: String(latestVitals._id),
      flags: latestVitals.flags,
    },
  });
};

export const startCdsWorker = () => {
  if (workerInitialized) {
    return;
  }

  workerInitialized = true;

  cdsEvents.on("VitalsCreated", (payload) => {
    queueMicrotask(() => {
      void processVitalsCreated(payload).catch((error) => {
        console.error("[cds-worker] failed processing VitalsCreated event", {
          clinicId: payload.clinicId,
          encounterId: payload.encounterId,
          error,
        });
      });
    });
  });
};

export const __testables = {
  fallbackRuleAlert,
  parseJsonResponse,
  maybeExtractJson,
};

