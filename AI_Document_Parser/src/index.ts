import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import documentsRouter from './routes/documents.js';

const app = express();

// Middlewares
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'SIH AI Document Parser',
    version: '2.0.0',
    tech_stack: 'Node.js + Express + TypeScript + Prisma/PostgreSQL + BullMQ + Gemini AI',
    timestamp: new Date().toISOString(),
  });
});

// Document Routes (V1 and root endpoints)
app.use('/api/v1/documents', documentsRouter);
app.use('/api/documents', documentsRouter);

// Global 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[GlobalError]', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, config.host, () => {
    console.log(`=======================================================`);
    console.log(`🚀 AI Document Intelligence Microservice Running!`);
    console.log(`📡 URL: http://${config.host}:${config.port}`);
    console.log(`🛠  Tech Stack: Node.js / Express / TypeScript / PostgreSQL / BullMQ`);
    console.log(`=======================================================`);
  });
}

export default app;
