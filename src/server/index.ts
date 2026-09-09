import "dotenv/config";
import pc from "picocolors";
import { createApp } from "./app.js";
import { createDomainHealthService } from "./domainHealthService.js";
import { createDomainCheckers } from "../checks/checkRegistry.js";

const port = Number(process.env.PORT ?? 3000);
const timeoutMs = Number(process.env.CHECK_TIMEOUT_MS ?? 5_000);

const service = createDomainHealthService(createDomainCheckers(), { timeoutMs });
const app = createApp(service);

app.listen(port, () => {
  console.log(pc.green(`domain-health-check listening on http://localhost:${port}`));
});
