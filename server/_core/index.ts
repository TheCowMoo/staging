import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { attachmentRouter } from "../attachmentUpload";
import { flaggedVisitorUploadRouter } from "../flaggedVisitorUpload";
import { trainingModuleUploadRouter } from "../trainingModuleUpload";
import { eapPdfRouter } from "../eapPdf";
import { liabilityScanPdfRouter } from "../liabilityScanPdf";
import { webhookRouter } from "./webhookRouter";
import { apiKeyRouter } from "../apiKeyRouter";
import { rasDesktopApi } from "../rasDesktopApi";
import { startViolentLogScheduler } from "../violentIncidentLogScheduler";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ─── Security Headers (Helmet.js) ────────────────────────────────────────────
  // HSTS and strict COOP are disabled when not behind HTTPS to allow plain HTTP
  // testing (e.g. IP-only access). Re-enable hsts once a TLS certificate is in place.
  const isHttps = process.env.HTTPS === "true";
  const hasLocalCourses = !!process.env.LOCAL_COURSES_PATH;
  // When serving local courses (Articulate Storyline), CSP must be relaxed
  // because Storyline loads hundreds of inline scripts, blobs, and data URIs.
  const cspDirectives = hasLocalCourses ? {
    defaultSrc: ["*"],
    scriptSrc: ["*", "'unsafe-inline'", "'unsafe-eval'", "blob:", "data:"],
    styleSrc: ["*", "'unsafe-inline'", "blob:", "data:"],
    fontSrc: ["*", "data:"],
    imgSrc: ["*", "data:", "blob:"],
    connectSrc: ["*"],
    frameSrc: ["*"],
    mediaSrc: ["*"],
    childSrc: ["*"],
    objectSrc: ["*"],
    workerSrc: ["*", "blob:"],
  } : {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://fonts.googleapis.com",
      "https://maps.googleapis.com",
      "https://forge.butterfly-effect.dev",
      "https://www.googletagmanager.com",
      "https://*.google-analytics.com",
      "https://www.google.com",
      "https://www.gstatic.com",
    ],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "data:", "blob:", "https:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
    connectSrc: [
      "'self'",
      "https:",
      "wss:",
      "ws:",
      "https://forge.butterfly-effect.dev",
    ],
    frameSrc: [
      "'self'",
      "https://*.s3.amazonaws.com",
      "https://www.google.com",
      "https://www.recaptcha.net",
      ...(process.env.S3_ENDPOINT ? [process.env.S3_ENDPOINT.replace(/\/+$/, "")] : []),
    ],
    mediaSrc: ["'self'"],
    childSrc: ["'self'"],
    objectSrc: ["'none'"],
    ...(isHttps ? { upgradeInsecureRequests: [] } : { upgradeInsecureRequests: null }),
  };
  app.use(helmet({
    contentSecurityPolicy: hasLocalCourses ? false : { directives: cspDirectives },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: isHttps ? { policy: "same-origin" } : false,
    hsts: isHttps ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }));
  if (hasLocalCourses) {
    console.log("[Server] Local courses enabled — CSP disabled for Storyline compatibility");
  }

  // ─── Trust Proxy ─────────────────────────────────────────────────────────────
  // Required when running behind a reverse proxy (Nginx, Caddy, etc.)
  // so that express-rate-limit reads the real client IP from X-Forwarded-For
  app.set("trust proxy", 1);

  // ─── Rate Limiting ────────────────────────────────────────────────────────────
  // General API rate limit: 1000 requests per 15 minutes per IP
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/api/trpc", apiLimiter);

  // Stricter limit for auth endpoints (login/register/reset) to slow brute-force
  // attempts. reCAPTCHA v3 already provides bot detection; this adds IP throttling
  // as a second layer.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please try again later." },
  });
  app.use("/api/auth", authLimiter);

  // Stricter limit for anonymous incident report submission: 10 per hour per IP
  const incidentSubmitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many incident reports submitted. Please try again later." },
  });
  app.use("/api/trpc/incident.submit", incidentSubmitLimiter);

  // ─── Body Parser ─────────────────────────────────────────────────────────────
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ─── Debug Endpoint (dev only) ───────────────────────────────────────────────
  // Visit /debug to see server status, env vars (masked), and request headers.
  // Disabled in production to avoid leaking configuration/headers.
  if (process.env.NODE_ENV !== "production") {
    app.get("/debug", (_req, res) => {
      const env = process.env;
      const mask = (val?: string) => val ? (val.length > 8 ? val.slice(0, 4) + "****" + val.slice(-4) : "****") : "(not set)";
      res.setHeader("Content-Type", "text/plain");
      res.send([
        "=== SAFEGUARD DEBUG ===",
        `Time: ${new Date().toISOString()}`,
        `Node: ${process.version}`,
        `ENV: ${env.NODE_ENV || "(not set)"}`,
        `PORT: ${env.PORT || "3000 (default)"}`,
        `HTTPS flag: ${env.HTTPS || "(not set)"}`,
        "",
        "--- Config ---",
        `APP_ID: ${env.APP_ID || "(not set)"}`,
        `DATABASE_URL: ${mask(env.DATABASE_URL)}`,
        `OPENAI_API_KEY: ${mask(env.OPENAI_API_KEY)}`,
        `GEMINI_API_KEY: ${mask(env.GEMINI_API_KEY)}`,
        `LLM_MODEL: ${env.LLM_MODEL || "(not set)"}`,
        `S3_BUCKET_NAME: ${env.S3_BUCKET_NAME || "(not set)"}`,
        `S3_REGION: ${env.S3_REGION || "(not set)"}`,
        `S3_ACCESS_KEY_ID: ${mask(env.S3_ACCESS_KEY_ID)}`,
        `GOOGLE_MAPS_API_KEY: ${mask(env.GOOGLE_MAPS_API_KEY)}`,
        "",
        "--- dist/public contents ---",
        `cwd: ${process.cwd()}`,
        `resolved: ${path.resolve(process.cwd(), "dist", "public")}`,
        (() => { try { return fs.readdirSync(path.resolve(process.cwd(), "dist", "public")).join(", "); } catch (e) { return `(not found: ${e})`; } })(),
        "",
        "--- Request Headers ---",
        ...Object.entries(_req.headers).map(([k, v]) => `${k}: ${v}`),
      ].join("\n"));
    });
  }

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Serve local courses from filesystem (for VPS local course hosting, no S3 needed)
  if (process.env.LOCAL_COURSES_PATH) {
    const localCoursesPath = path.resolve(process.env.LOCAL_COURSES_PATH);
    if (fs.existsSync(localCoursesPath)) {
      app.use("/courses", express.static(localCoursesPath));
      console.log(`[Server] Serving local courses from: ${localCoursesPath}`);
    } else {
      console.warn(`[Server] LOCAL_COURSES_PATH set but not found: ${localCoursesPath}`);
    }
  }

  // File upload routes (multipart)
  app.use(attachmentRouter);
  app.use(flaggedVisitorUploadRouter);
  app.use(trainingModuleUploadRouter);

  // API key protected external endpoints
  app.use(apiKeyRouter);

  // RAS Desktop Alert REST API (polling, acknowledgment, auto-update)
  app.use(rasDesktopApi);

  // Generic RAS Desktop Alert installer download (pre-built prototype)
  // Try local filesystem first, then fall back to S3 shared installer
  const _rasCandidates = [
    path.resolve(process.cwd(), "ras-desktop-alert", "dist", "FiveStonesRASAlert.exe"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "ras-desktop-alert", "dist", "FiveStonesRASAlert.exe"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "ras-desktop-alert", "dist", "FiveStonesRASAlert.exe"),
  ];
  const _rasExePath = _rasCandidates.find(p => fs.existsSync(p));
  app.get("/api/ras/installer/FiveStonesRASAlert.exe", async (_req, res) => {
    if (_rasExePath && fs.existsSync(_rasExePath)) {
      res.download(_rasExePath, "FiveStonesRASAlert.exe");
      return;
    }
    // Fallback: redirect to S3 shared installer
    try {
      const { storageGet } = await import("../storage");
      const result = await storageGet("installers/ras-alert/shared/v1.1.0/FiveStonesRASAlert.exe");
      if (result.url) {
        res.redirect(result.url);
        return;
      }
    } catch {
      // Fall through to error
    }
    res.status(404).json({ error: "Installer not found. Build it first with 'cd ras-desktop-alert && dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ./dist'" });
  });

  // EAP PDF download
  app.use(eapPdfRouter);

  // Liability Scan PDF export
  app.use(liabilityScanPdfRouter);

  // Privileged webhook endpoints (register, plan changes, ultra-admin creation):
  // rate-limit by IP. Shared-secret HMAC hardening is tracked separately (F-10).
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many webhook requests. Please try again later." },
  });
  app.use("/api/webhook", webhookLimiter);

  // Plan upgrade/downgrade webhook (called by payment processor)
  app.use(webhookRouter);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Increase server timeout to 5 minutes to allow long-running LLM calls (EAP generation)
  server.timeout = 300000; // 5 minutes
  server.keepAliveTimeout = 305000;
  server.headersTimeout = 310000;
  // California Violent Incident Log (SB 553) - 15-day request scheduler
  startViolentLogScheduler();

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
