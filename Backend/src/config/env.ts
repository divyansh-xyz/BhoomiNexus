import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("7d"),
  WHATSAPP_API_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default(""),
  WHATSAPP_VERIFY_TOKEN: z.string().default("bhoomi_nexus_wa_webhook_verify_token_2026"),
  WHATSAPP_API_VERSION: z.string().default("v20.0"),
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error: any) {
  console.error("❌ Invalid environment variables:");
  console.error(error.format());
  process.exit(1);
}

export const env = parsedEnv;
