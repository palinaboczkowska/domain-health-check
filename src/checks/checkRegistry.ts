import { createRegistrationChecker } from "./registrationChecker.js";
import { createCertificateChecker } from "./certificateChecker.js";
import { createDnsChecker } from "./dnsChecker.js";
import { createHttpSecurityChecker } from "./httpSecurityChecker.js";
import type { DomainChecker } from "./types.js";

export function createDomainCheckers(): DomainChecker[] {
  return [
    createRegistrationChecker(),
    createCertificateChecker(),
    createDnsChecker(),
    createHttpSecurityChecker(),
  ];
}
