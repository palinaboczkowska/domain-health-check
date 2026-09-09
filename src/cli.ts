#!/usr/bin/env node
import pc from "picocolors";
import { createDomainCheckers } from "./checks/checkRegistry.js";
import { createDomainHealthService } from "./server/domainHealthService.js";
import { parseDomain } from "./validation/domainSchema.js";

function colorFor(status: string): (text: string) => string {
  switch (status) {
    case "ok":
      return pc.green;
    case "warning":
      return pc.yellow;
    case "critical":
      return pc.red;
    case "unavailable":
      return pc.dim;
    default:
      return pc.magenta;
  }
}

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npm run cli -- <domain>");
    process.exitCode = 1;
    return;
  }

  const domain = parseDomain(input);
  console.log(pc.bold(`Checking ${domain} (real network calls, no API key needed)...\n`));

  const service = createDomainHealthService(createDomainCheckers());
  const report = await service.checkDomain(domain);

  for (const check of report.checks) {
    const color = colorFor(check.status);
    console.log(`${color(check.status.toUpperCase().padEnd(12))} ${check.checkName}`);
    console.log(pc.dim(`             ${check.summary}`));
    if (check.error) {
      console.log(pc.red(`             error: ${check.error}`));
    }
    console.log();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
