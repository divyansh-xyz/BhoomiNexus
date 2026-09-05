import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/land_acquisition',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  llmProvider: process.env.LLM_PROVIDER || 'google',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gemini-1.5-flash',
  storagePath: path.resolve(process.env.STORAGE_PATH || './uploads'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
};
