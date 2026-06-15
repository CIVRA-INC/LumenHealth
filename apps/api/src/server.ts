import { serverConfig } from "@lumen/config";
import { app } from "./app.js";

app.listen(serverConfig.apiPort, () => {
  console.log(`LumenHealth API running on http://localhost:${serverConfig.apiPort}`);
});
