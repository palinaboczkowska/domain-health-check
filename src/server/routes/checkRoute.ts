import type { Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { parseDomain } from "../../validation/domainSchema.js";
import type { DomainHealthService } from "../domainHealthService.js";

export function createCheckRoute(service: DomainHealthService): RequestHandler {
  return async (req: Request, res: Response) => {
    let domain: string;
    try {
      domain = parseDomain((req.body as { domain?: unknown } | undefined)?.domain);
    } catch (error) {
      const message = error instanceof ZodError ? error.issues[0]?.message : undefined;
      res.status(400).json({ error: message ?? "Invalid domain" });
      return;
    }

    // domainHealthService never throws -- see domainHealthService.ts -- so
    // there's no 5xx path here the way discount-code-finder's searchRoute
    // needed one for its agent.
    const report = await service.checkDomain(domain);
    res.status(200).json(report);
  };
}
