import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config.js';
import { processDocumentJob } from './processor.js';

let documentQueue: Queue | null = null;

try {
  const redisConnection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy() {
      return null; // Stop retrying if Redis is not running
    },
  });

  redisConnection.on('error', () => {
    // Silently ignore connection errors when Redis is not running locally
  });

  // Test connection silently
  redisConnection.connect().then(() => {
    const bullConnection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });

    documentQueue = new Queue('document-processing', {
      connection: bullConnection,
    });

    new Worker(
      'document-processing',
      async (job) => {
        await processDocumentJob(job.data.documentId);
      },
      { connection: bullConnection }
    );
  }).catch(() => {
    documentQueue = null;
  });
} catch (e) {
  documentQueue = null;
}

export async function addDocumentJob(documentId: string): Promise<void> {
  if (documentQueue) {
    try {
      await documentQueue.add('process-document', { documentId });
      console.log(`[Queue] Enqueued job in BullMQ for document: ${documentId}`);
      return;
    } catch (e) {
      // Fall through to in-memory processing if queue push fails
    }
  }

  // Non-blocking async fallback
  setImmediate(() => {
    processDocumentJob(documentId).catch((err) => {
      console.error('Async fallback processing error:', err);
    });
  });
}

