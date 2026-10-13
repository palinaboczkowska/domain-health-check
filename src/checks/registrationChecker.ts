import { connect } from "node:net";
import {
  IanaBootstrapSchema,
  WHOIS_SERVERS,
  interpretSeWhoisResponse,
  findRdapBaseUrl,
  interpretRdapResponse,
  unavailableRegistrationResult,
  type IanaBootstrapFile,
} from "./registrationInterpreter.js";
import type { CheckResult, DomainChecker } from "./types.js";

const IANA_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedBootstrap: { data: IanaBootstrapFile; expiresAt: number } | null = null;

async function getBootstrap(): Promise<IanaBootstrapFile> {
  const now = Date.now();
  if (cachedBootstrap && cachedBootstrap.expiresAt > now) {
    return cachedBootstrap.data;
  }
  const response = await fetch(IANA_BOOTSTRAP_URL);
  if (!response.ok) {
    throw new Error(`IANA RDAP bootstrap fetch returned HTTP ${response.status}`);
  }
  const json: unknown = await response.json();
  const data = IanaBootstrapSchema.parse(json);
  cachedBootstrap = { data, expiresAt: now + BOOTSTRAP_CACHE_TTL_MS };
  return data;
}

const WHOIS_TIMEOUT_MS = 8000;

/** Plain WHOIS (RFC 3912): send the domain on port 43, read until the server closes. */
function whoisQuery(server: string, domain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(43, server);
    let text = "";
    socket.setEncoding("utf8");
    socket.setTimeout(WHOIS_TIMEOUT_MS, () => {
      socket.destroy(new Error(`WHOIS lookup on ${server} timed out`));
    });
    socket.on("connect", () => socket.write(`${domain}\r\n`));
    socket.on("data", (chunk: string) => (text += chunk));
    socket.on("end", () => resolve(text));
    socket.on("error", reject);
  });
}

function getTld(domain: string): string {
  const parts = domain.split(".");
  return parts[parts.length - 1] ?? domain;
}

/**
 * Checks the IANA bootstrap file first; if the domain's TLD isn't listed
 * (confirmed live for .se and .io during this project's research), it falls
 * back to WHOIS for the few TLDs with a known WHOIS server (.se, .nu), and
 * otherwise returns "unavailable" without attempting any guessed endpoint.
 */
export function createRegistrationChecker(): DomainChecker {
  return {
    checkId: "registration",
    checkName: "Domain Registration",
    async run(domain: string): Promise<CheckResult> {
      const bootstrap = await getBootstrap();
      const tld = getTld(domain);
      const baseUrl = findRdapBaseUrl(bootstrap, tld);

      if (!baseUrl) {
        const whoisServer = WHOIS_SERVERS[tld.toLowerCase()];
        if (whoisServer) {
          const text = await whoisQuery(whoisServer, domain);
          return {
            checkId: "registration",
            checkName: "Domain Registration",
            checkedAt: new Date().toISOString(),
            ...interpretSeWhoisResponse(text, new Date()),
          };
        }
        return {
          checkId: "registration",
          checkName: "Domain Registration",
          checkedAt: new Date().toISOString(),
          ...unavailableRegistrationResult(tld),
        };
      }

      const response = await fetch(`${baseUrl}domain/${domain}`);
      if (!response.ok) {
        throw new Error(`RDAP lookup for ${domain} returned HTTP ${response.status}`);
      }
      const json: unknown = await response.json();
      const interpreted = interpretRdapResponse(json, new Date());

      return {
        checkId: "registration",
        checkName: "Domain Registration",
        checkedAt: new Date().toISOString(),
        ...interpreted,
      };
    },
  };
}
