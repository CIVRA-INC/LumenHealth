#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4010);
const clinicPath = path.join(__dirname, "clinic.json");

function loadClinic() {
  return JSON.parse(fs.readFileSync(clinicPath, "utf8"));
}

function saveClinic(data) {
  fs.writeFileSync(clinicPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });
  });
}

function authenticate(req) {
  const role = req.headers["x-user-role"];
  const clinicId = req.headers["x-clinic-id"];

  if (typeof role !== "string" || typeof clinicId !== "string") {
    return {
      ok: false,
      error: {
        status: 401,
        payload: {
          error: "Unauthorized",
          message: "Missing authentication headers",
        },
      },
    };
  }

  return {
    ok: true,
    user: { role, clinicId },
  };
}

function validatePatchPayload(payload) {
  const allowedFields = [
    "name",
    "location",
    "contact",
    "stellarWalletAddress",
    "subscriptionExpiryDate",
  ];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Payload must be a JSON object" };
  }

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return { ok: false, message: "At least one field is required" };
  }

  const unknownFields = keys.filter((key) => !allowedFields.includes(key));
  if (unknownFields.length > 0) {
    return {
      ok: false,
      message: `Unknown field(s): ${unknownFields.join(", ")}`,
    };
  }

  return { ok: true };
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { error: "NotFound", message: "Route not found" });
    return;
  }

  if (req.url === "/health" && req.method === "GET") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (req.url !== "/clinics/me") {
    sendJson(res, 404, { error: "NotFound", message: "Route not found" });
    return;
  }

  const auth = authenticate(req);
  if (!auth.ok) {
    sendJson(res, auth.error.status, auth.error.payload);
    return;
  }

  const clinic = loadClinic();
  if (auth.user.clinicId !== clinic.id) {
    sendJson(res, 403, {
      error: "Forbidden",
      message: "Clinic scope mismatch",
    });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, {
      status: "success",
      data: clinic,
    });
    return;
  }

  if (req.method === "PATCH") {
    if (auth.user.role !== "CLINIC_ADMIN") {
      sendJson(res, 403, {
        error: "Forbidden",
        message: "Only CLINIC_ADMIN can update clinic settings",
      });
      return;
    }

    try {
      const body = await parseBody(req);
      const validation = validatePatchPayload(body);
      if (!validation.ok) {
        sendJson(res, 400, {
          error: "BadRequest",
          message: validation.message,
        });
        return;
      }

      const updated = { ...clinic, ...body };
      saveClinic(updated);

      sendJson(res, 200, {
        status: "success",
        data: updated,
      });
      return;
    } catch (error) {
      sendJson(res, 400, {
        error: "BadRequest",
        message: error instanceof Error ? error.message : "Invalid request",
      });
      return;
    }
  }

  sendJson(res, 405, {
    error: "MethodNotAllowed",
    message: "Supported methods: GET, PATCH",
  });
});

server.listen(PORT, () => {
  console.log(`Mock clinic settings API listening on http://localhost:${PORT}`);
});
