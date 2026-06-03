export const ENV = {
  appId: process.env.APP_ID ?? "pursuitpathways",
  cookieSecret: process.env.JWT_SECRET ?? "change-me",
  databaseUrl: process.env.DATABASE_URL ?? 'mysql://root:password@127.0.0.1:3306/safeguard',
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // LLM — supports OpenAI or Google Gemini (via OpenAI-compatible endpoint)
  // For Gemini: set GEMINI_API_KEY and optionally LLM_MODEL (e.g. gemini-2.0-flash)
  // For OpenAI: set OPENAI_API_KEY and optionally LLM_MODEL (e.g. gpt-4o-mini)
  openAiApiKey:
    process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || undefined,
  llmBaseUrl:
    process.env.LLM_BASE_URL || (process.env.GEMINI_API_KEY?.trim() ? "https://generativelanguage.googleapis.com/v1beta/openai" : ""),
  llmModel:
    process.env.LLM_MODEL || (process.env.GEMINI_API_KEY?.trim() ? "gemini-2.5-flash" : "gpt-4o-mini"),

  // File storage — AWS S3 (or any S3-compatible service e.g. Cloudflare R2, MinIO)
  s3BucketName: process.env.S3_BUCKET_NAME ?? "fivestones-pursuit-pathways",
  s3Region: process.env.S3_REGION ?? "us-east-2",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "", // optional: for S3-compatible services

  // RAS push notifications — VAPID keys
  // vapidPrivateKey is server-only and must NEVER be returned in API responses or logs
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",

  // GoHighLevel CRM integration
  ghlApiKey: process.env.GHL_API_KEY ?? "",
  ghlLocationId: process.env.GHL_LOCATION_ID ?? "",
  ghlFromEmail: process.env.GHL_FROM_EMAIL ?? "info@example.com",

  // App base URL — used for building verification/reset links in emails
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",

  // Webhook secret
  webhookSecret: process.env.WEBHOOK_SECRET ?? "change-me",
};
