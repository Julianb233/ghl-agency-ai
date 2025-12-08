import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure" | "domain"> {
  const hostname = req.hostname;
  
  // Remove 'www.' prefix to get the base domain
  const baseDomain = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
  
  const shouldSetDomain =
    baseDomain &&
    !LOCAL_HOSTS.has(baseDomain) &&
    !isIpAddress(baseDomain) &&
    baseDomain !== "127.0.0.1" &&
    baseDomain !== "::1" &&
    !baseDomain.endsWith(".localhost");

  // Set domain with leading dot to work across subdomains (e.g., .ghlagencyai.com)
  const domain = shouldSetDomain ? `.${baseDomain}` : undefined;

  const isLocal = LOCAL_HOSTS.has(req.hostname) || req.hostname.endsWith(".localhost");
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // Use 'lax' for better compatibility - OAuth redirect is same-site
    sameSite: "lax",
    secure: secure,
    ...(domain && { domain }),
  };
}
