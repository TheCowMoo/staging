/**
 * API Key authentication middleware for express routes.
 * Accepts either Authorization: Bearer <token> or x-api-key: <token>.
 */
import type { Request, Response, NextFunction } from "express";
import { sdk } from "./sdk";
import type { User } from "../../drizzle/schema";

export interface ApiKeyAuthenticatedRequest extends Request {
  user?: User;
}

export async function requireApiKey(req: ApiKeyAuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await sdk.authenticateApiKeyRequest(req);
    req.user = user;
    return next();
  } catch (error: any) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }
}
