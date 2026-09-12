import { Router } from 'express';
import {
  verifyWebhook,
  handleWebhook,
  getWhatsAppStatus,
  sendManualMessage,
  simulateIncomingWhatsApp,
} from './whatsapp.controller';

const router = Router();

// Meta WhatsApp Webhook endpoints (Public for Meta Verification & Webhook Delivery)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// Status & testing endpoints
router.get('/status', getWhatsAppStatus);
router.post('/send', sendManualMessage);
router.post('/simulate', simulateIncomingWhatsApp);

export default router;
