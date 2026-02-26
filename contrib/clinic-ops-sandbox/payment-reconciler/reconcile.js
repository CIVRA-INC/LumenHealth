#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const pendingArg = argv.find((arg) => arg.startsWith("--pending="));
  const chainArg = argv.find((arg) => arg.startsWith("--chain="));
  const outputArg = argv.find((arg) => arg.startsWith("--output="));
  const nowArg = argv.find((arg) => arg.startsWith("--now="));

  return {
    pendingPath: pendingArg ? pendingArg.split("=").slice(1).join("=") : "pending-intents.json",
    chainPath: chainArg ? chainArg.split("=").slice(1).join("=") : "mock-chain-events.json",
    outputPath: outputArg ? outputArg.split("=").slice(1).join("=") : "report.json",
    now: nowArg ? nowArg.split("=").slice(1).join("=") : "2026-02-25T14:30:00.000Z",
  };
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sameAmount(a, b) {
  return Number(a).toFixed(2) === Number(b).toFixed(2);
}

function reconcileIntent(intent, chainEvents, nowIso) {
  const now = new Date(nowIso);
  const expiresAt = new Date(intent.expiresAt);

  const memoEvents = chainEvents.filter((event) => event.memo === intent.memo);

  const exactMatch = memoEvents.find(
    (event) =>
      event.asset === intent.asset &&
      sameAmount(event.amount, intent.amount) &&
      new Date(event.confirmedAt) <= expiresAt,
  );

  if (exactMatch) {
    return {
      intentId: intent.intentId,
      clinicId: intent.clinicId,
      status: "verified",
      reason: "Matching on-chain payment found before expiry",
      txHash: exactMatch.txHash,
      memo: intent.memo,
      expectedAmount: intent.amount,
      actualAmount: exactMatch.amount,
      expiresAt: intent.expiresAt,
    };
  }

  const mismatchEvent = memoEvents.find((event) => new Date(event.confirmedAt) <= expiresAt);
  if (mismatchEvent) {
    return {
      intentId: intent.intentId,
      clinicId: intent.clinicId,
      status: "mismatch",
      reason:
        mismatchEvent.asset !== intent.asset
          ? "Asset mismatch for matching memo"
          : "Amount mismatch for matching memo",
      txHash: mismatchEvent.txHash,
      memo: intent.memo,
      expectedAmount: intent.amount,
      actualAmount: mismatchEvent.amount,
      expiresAt: intent.expiresAt,
    };
  }

  if (now > expiresAt) {
    return {
      intentId: intent.intentId,
      clinicId: intent.clinicId,
      status: "expired",
      reason: "No matching payment found before expiry",
      txHash: null,
      memo: intent.memo,
      expectedAmount: intent.amount,
      actualAmount: null,
      expiresAt: intent.expiresAt,
    };
  }

  return {
    intentId: intent.intentId,
    clinicId: intent.clinicId,
    status: "pending",
    reason: "Intent is still active and awaiting chain confirmation",
    txHash: null,
    memo: intent.memo,
    expectedAmount: intent.amount,
    actualAmount: null,
    expiresAt: intent.expiresAt,
  };
}

function summarize(results) {
  return results.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { total: 0, verified: 0, mismatch: 0, expired: 0, pending: 0 },
  );
}

(function main() {
  const args = parseArgs(process.argv.slice(2));

  const pendingPath = path.resolve(process.cwd(), args.pendingPath);
  const chainPath = path.resolve(process.cwd(), args.chainPath);
  const outputPath = path.resolve(process.cwd(), args.outputPath);

  try {
    const pendingIntents = loadJson(pendingPath);
    const chainEvents = loadJson(chainPath);

    const results = pendingIntents.map((intent) =>
      reconcileIntent(intent, chainEvents, args.now),
    );

    const report = {
      generatedAt: args.now,
      summary: summarize(results),
      results,
    };

    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          status: "ok",
          output: outputPath,
          summary: report.summary,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
})();
