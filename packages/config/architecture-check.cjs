const { workspaceBoundarySummary } = require("./workspace-boundaries.cjs");

console.log("LumenHealth reset baseline");
workspaceBoundarySummary.forEach((line) => console.log(`- ${line}`));
