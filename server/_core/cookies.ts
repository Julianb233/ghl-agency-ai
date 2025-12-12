import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  // On Vercel, always treat as secure
  if (process.env.VERCEL === "1") return true;

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
  const hostname = req.hostname || req.headers.host?.split(":")[0] || "";
  const isLocal = LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
  const secure = isSecureRequest(req);

  // On Vercel production, we need to be explicit about cookie settings
  const isVercel = process.env.VERCEL === "1";

  // Debug logging for cookie issues
  console.log("[Cookies] Setting cookie options:", {
    hostname,
    isLocal,
    secure,
    isVercel,
    protocol: req.protocol,
    forwardedProto: req.headers["x-forwarded-proto"],
  });

  // For Vercel deployments, use 'lax' sameSite for better compatibility
  // 'none' requires third-party cookie support which some browsers block
  return {
    httpOnly: true,
    path: "/",
    // Use 'lax' for same-site requests (better browser compatibility)
    // 'lax' allows cookies on top-level navigations (redirects after OAuth)
    sameSite: "lax",
    secure: secure,
    // Don't set domain - let browser use the current domain
  };
}
