import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import * as ipaddr from "ipaddr.js";
import { Buffer } from "node:buffer";

function parseAllowlist(): string[] {
  return process.env.METRICS_ALLOWLIST?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
}

function normalizeAddress(address: ipaddr.IPv4 | ipaddr.IPv6): ipaddr.IPv4 | ipaddr.IPv6 {
  if (address.kind() === "ipv6" && (address as ipaddr.IPv6).isIPv4MappedAddress()) {
    return (address as ipaddr.IPv6).toIPv4Address();
  }
  return address;
}

function parseClientIp(rawIp: string | undefined): ipaddr.IPv4 | ipaddr.IPv6 | null {
  if (!rawIp) {
    return null;
  }
  try {
    const parsed = ipaddr.parse(rawIp);
    return normalizeAddress(parsed);
  } catch {
    return null;
  }
}

function matchAllowlist(allowlist: string[], clientIp: ipaddr.IPv4 | ipaddr.IPv6 | null): boolean {
  if (!clientIp) {
    return false;
  }

  return allowlist.some((entry) => {
    const [range, maybePrefix] = entry.split("/");
    try {
      const parsedRange = normalizeAddress(ipaddr.parse(range));
      const prefixLength = maybePrefix ? Number.parseInt(maybePrefix, 10) : parsedRange.kind() === "ipv4" ? 32 : 128;
      if (Number.isNaN(prefixLength)) {
        return false;
      }
      if (parsedRange.kind() !== clientIp.kind()) {
        return false;
      }
      return clientIp.match(parsedRange, prefixLength);
    } catch {
      return false;
    }
  });
}

function decodeBasicAuth(authorizationHeader: string | undefined): { username: string; password: string } | null {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }
  const token = authorizationHeader.slice(6).trim();
  try {
    const [username, password] = Buffer.from(token, "base64").toString("utf8").split(":");
    if (username && password !== undefined) {
      return { username, password };
    }
  } catch {
    return null;
  }
  return null;
}

@Injectable()
export class MetricsGuard implements CanActivate {
  private readonly allowlist = parseAllowlist();
  private readonly hasBasicAuthConfig = Boolean(process.env.METRICS_USER && process.env.METRICS_PASS);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!req?.path?.startsWith("/metrics")) {
      return true;
    }

    const clientIp = parseClientIp(req.ip || req.connection.remoteAddress || req.socket.remoteAddress || undefined);
    const isIpAllowed = matchAllowlist(this.allowlist, clientIp);

    if (isIpAllowed) {
      return true;
    }

    const credentials = decodeBasicAuth(req.headers.authorization);

    if (credentials) {
      if (credentials.username === process.env.METRICS_USER && credentials.password === process.env.METRICS_PASS) {
        return true;
      }
      throw new UnauthorizedException("Invalid metrics credentials");
    }

    if (this.hasBasicAuthConfig) {
      throw new UnauthorizedException("Metrics authentication required");
    }

    throw new ForbiddenException("IP address not allowed");
  }
}
