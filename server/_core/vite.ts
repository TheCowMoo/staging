import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Serve the built frontend from dist/public.
 *
 * esbuild bundles the server into dist/index.js and is run via:
 *   pm2 start dist/index.js (from the project root)
 * so process.cwd() == /home/ubuntu/pursuitpathways-workplace
 * and dist/public is always at process.cwd()/dist/public.
 */
export function serveStatic(app: Express) {
  // Always resolve relative to the project root (process.cwd())
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `[Static] Build directory not found: ${distPath}\n` +
      `Run "npm run build" first, then restart the server.`
    );
    app.use("*", (_req, res) => {
      res.status(503).send(
        `App is not built yet. Run "npm run build" on the server.\n` +
        `Expected: ${distPath}`
      );
    });
    return;
  }

  console.log(`[Static] Serving frontend from: ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback — serve index.html for all non-API routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
