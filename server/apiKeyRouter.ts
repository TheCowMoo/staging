/**
 * API key protected external endpoints.
 * These routes demonstrate how to protect an external API using API keys.
 */
import { Router } from "express";
import { requireApiKey } from "./_core/apiKeyAuth";

export const apiKeyRouter = Router();

apiKeyRouter.get("/api/protected/ping", requireApiKey, (req, res) => {
  const authReq = req as any;
  return res.json({
    ok: true,
    message: "API key authentication succeeded.",
    user: authReq.user ? {
      id: authReq.user.id,
      email: authReq.user.email,
      role: authReq.user.role,
      name: authReq.user.name,
    } : null,
  });
});

apiKeyRouter.post("/api/protected/echo", requireApiKey, (req, res) => {
  const authReq = req as any;
  return res.json({
    ok: true,
    message: "API key protected endpoint reached.",
    user: authReq.user ? {
      id: authReq.user.id,
      email: authReq.user.email,
      role: authReq.user.role,
      name: authReq.user.name,
    } : null,
    body: req.body,
  });
});
