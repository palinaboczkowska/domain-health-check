import tls from "node:tls";
import {
  interpretCertificate,
  unreachableCertificateResult,
  type RawCertificateInfo,
} from "./certificateInterpreter.js";
import type { CheckResult, DomainChecker } from "./types.js";

function getPeerCertificateInfo(
  domain: string,
  timeoutMs: number,
): Promise<RawCertificateInfo> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        // Deliberately NOT the default (true): with rejectUnauthorized left
        // on, Node aborts the handshake before we ever get to inspect an
        // expired or otherwise-untrusted certificate. Setting it false is
        // safe here because we're only reading metadata, never sending
        // anything sensitive over this connection.
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        const cert = socket.getPeerCertificate();
        const info: RawCertificateInfo = {
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          issuer: cert.issuer as unknown as Record<string, string>,
          subject: cert.subject as unknown as Record<string, string>,
          authorized: socket.authorized,
          authorizationError: socket.authorized ? null : String(socket.authorizationError),
        };
        socket.end();
        resolve(info);
      },
    );
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS connection timed out"));
    });
    socket.on("error", (error) => {
      reject(error);
    });
  });
}

export function createCertificateChecker(): DomainChecker {
  return {
    checkId: "certificate",
    checkName: "TLS Certificate",
    async run(domain: string): Promise<CheckResult> {
      let interpreted;
      try {
        const info = await getPeerCertificateInfo(domain, 5000);
        interpreted = interpretCertificate(info, new Date());
      } catch (error) {
        const code = (error as NodeJS.ErrnoException | undefined)?.code;
        if (code === "ECONNREFUSED") {
          interpreted = unreachableCertificateResult(code);
        } else {
          throw error;
        }
      }

      return {
        checkId: "certificate",
        checkName: "TLS Certificate",
        checkedAt: new Date().toISOString(),
        ...interpreted,
      };
    },
  };
}
