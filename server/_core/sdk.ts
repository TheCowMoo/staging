/**
 * Auth SDK — Standard JWT session management (no external OAuth provider required)
 *
 * Replaces the previous Manus OAuth integration.
 * Sessions are signed with JWT_SECRET using HS256.
 */
import { jwtVerify, SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { createHash } from "crypto";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

class SDKServer {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) {
      // Fall back to a default dev secret so the server starts without crashing.
      // Sessions signed with this key are NOT secure — set JWT_SECRET in .env for production.
      console.warn("[Auth] JWT_SECRET is not set — using insecure default. Set JWT_SECRET in .env for production.");
      return new TextEncoder().encode("dev-insecure-default-secret-change-me");
    }
    return new TextEncoder().encode(secret);
  }

  private parseCookies(cookieHeader: string | undefined): Map<string, string> {
    if (!cookieHeader) return new Map();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      { openId, appId: ENV.appId || "app", name: options.name || "" },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return { openId, appId, name: String(name ?? "") };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  private getApiKeyFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.trim().toLowerCase().startsWith("bearer ")) {
      return authHeader.trim().substring(7).trim();
    }
    const keyHeader = req.headers["x-api-key"];
    if (typeof keyHeader === "string" && keyHeader.trim()) {
      return keyHeader.trim();
    }
    return null;
  }

  async authenticateApiKeyRequest(req: Request): Promise<User> {
    const apiKey = this.getApiKeyFromRequest(req);
    if (!apiKey) {
      throw ForbiddenError("Missing API key");
    }

    const hash = createHash("sha256").update(apiKey).digest("hex");
    const row = await db.getApiKeyByHash(hash);
    if (!row) {
      throw ForbiddenError("Invalid API key");
    }
    if (row.revokedAt) {
      throw ForbiddenError("API key revoked");
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      throw ForbiddenError("API key expired");
    }

    const user = await db.getUserById(row.userId);
    if (!user) throw ForbiddenError("User not found");
    await db.touchApiKeyLastUsed(row.id);
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return user;
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (session) {
      let user = await db.getUserByOpenId(session.openId);
      if (!user) throw ForbiddenError("User not found");
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      return user;
    }
    return this.authenticateApiKeyRequest(req);
  }
}

export const sdk = new SDKServer();
