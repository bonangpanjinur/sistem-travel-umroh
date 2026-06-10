import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import router from "./routes";
import { supabaseProxyRouter } from "./routes/supabaseProxy.js";
import { logger } from "./lib/logger";
import sitemapRouter from "./routes/sitemap.js";

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), "uploads");
if (!existsSync(uploadsDir)) {
  try { mkdirSync(uploadsDir, { recursive: true }); } catch { /* ignore */ }
}

const app: Express = express();

// Rate limiting — protects public API endpoints from spam/abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,                  // 100 request per IP per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Terlalu banyak permintaan. Coba lagi dalam 15 menit." },
  skip: (req) => req.method === "OPTIONS",
});

const leadsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 10,                   // maks 10 submit lead per jam per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Terlalu banyak pengiriman. Coba lagi dalam 1 jam." },
  skip: (req) => req.method === "OPTIONS",
});

// Explicit CORS config — allows all origins with full method list so browser
// preflight (OPTIONS) is handled correctly for /auth/v1/* and /rest/v1/*
const corsOptions = {
  origin: true,                   // reflect request origin
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "apikey",
    "x-client-info",
    "Prefer",
    "Range",
    "Accept",
  ],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
  credentials: true,
  maxAge: 86400,                  // 24h preflight cache
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// cors() with preflightContinue:false (default) automatically responds 204
// to OPTIONS preflight requests — no separate app.options() needed.
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiters
app.use("/api/v1/leads", leadsLimiter);  // Strict limit for lead submission
app.use("/api", generalLimiter);         // General limit for all API routes

// Static file serving for uploaded payment proofs
app.use("/uploads", express.static(join(process.cwd(), "uploads")));

app.use("/api", router);

// Sitemap — mounted at root (no /api prefix) so search engines can access /sitemap.xml
app.use(sitemapRouter);

// Supabase-compatible proxy — mounted at root so the Supabase JS client can
// hit /auth/v1/* and /rest/v1/* via the Vite dev-server proxy.
// These routes are intentionally AFTER the rate limiter (which only covers /api).
app.use(supabaseProxyRouter);

export default app;
