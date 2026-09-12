import { Request, Response } from 'express';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { whatsappService } from './whatsapp.service';
import { conversationService } from './whatsappConversation.service';

/**
 * GET /api/v1/integrations/whatsapp/webhook
 * Verification endpoint required by Meta WhatsApp Cloud API
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      logger.info('[WhatsApp] Webhook verified successfully by Meta');
      res.status(200).send(challenge);
      return;
    }
    logger.warn('[WhatsApp] Webhook verification failed: token mismatch');
    res.sendStatus(403);
    return;
  }
  res.sendStatus(400);
};

/**
 * POST /api/v1/integrations/whatsapp/webhook
 * Ingests incoming messages & citizen objections from Meta WhatsApp Cloud API
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;

    // Meta sends a 200 OK fast to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');

    if (body.object === 'whatsapp_business_account' && body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
          const value = change.value;
          if (!value) continue;

          // Check for incoming messages
          if (value.messages && Array.isArray(value.messages)) {
            const contacts = value.contacts || [];
            const contactName = contacts[0]?.profile?.name;

            for (const msg of value.messages) {
              const isInteractive = msg.type === 'interactive';
              const isText = msg.type === 'text';

              if (isInteractive || isText) {
                await conversationService.handleMessage(msg, contactName);
              }
            }
          }
        }
      }
    }
  } catch (error: any) {
    logger.error('[WhatsApp] Error in handleWebhook:', error);
  }
};

/**
 * GET /api/v1/integrations/whatsapp/status
 * Returns WhatsApp Cloud API connection status and configuration
 */
export const getWhatsAppStatus = (req: Request, res: Response): void => {
  const configured = Boolean(env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);

  res.json({
    success: true,
    data: {
      provider: 'Meta WhatsApp Business Cloud API',
      configured,
      apiVersion: env.WHATSAPP_API_VERSION,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ? `...${env.WHATSAPP_PHONE_NUMBER_ID.slice(-4)}` : null,
      businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID ? `...${env.WHATSAPP_BUSINESS_ACCOUNT_ID.slice(-4)}` : null,
      webhookPath: '/api/v1/integrations/whatsapp/webhook',
      status: configured ? 'ACTIVE' : 'READY_FOR_CREDENTIALS',
    },
  });
};

/**
 * POST /api/v1/integrations/whatsapp/send
 * Allows sending a WhatsApp notification to a citizen
 */
export const sendManualMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      res.status(400).json({ success: false, error: { message: 'Parameters "to" and "message" are required.' } });
      return;
    }

    const success = await whatsappService.sendMessage(to, message);
    res.json({ success, data: { recipient: to, delivered: success } });
  } catch (error: any) {
    logger.error('[WhatsApp] Error in sendManualMessage:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to send WhatsApp message' } });
  }
};

/**
 * POST /api/v1/integrations/whatsapp/simulate
 * Simulates a citizen WhatsApp message to test database ingestion directly
 */
export const simulateIncomingWhatsApp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone = '919876543210', name = 'Kisan Citizen', text, interactiveReply } = req.body;

    if (!text && !interactiveReply) {
      res.status(400).json({ success: false, error: { message: '"text" or "interactiveReply" is required' } });
      return;
    }

    const fakeMsgId = `wamid.SIMULATED_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const msgPayload: any = {
      from: phone,
      id: fakeMsgId,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };

    if (interactiveReply) {
      msgPayload.type = 'interactive';
      msgPayload.interactive = {
        type: interactiveReply.type || 'list_reply',
        list_reply: interactiveReply
      };
    } else {
      msgPayload.type = 'text';
      msgPayload.text = { body: text };
    }

    await conversationService.handleMessage(msgPayload, name);

    res.status(201).json({ success: true, message: 'Message simulated and processed successfully' });
  } catch (error: any) {
    logger.error('[WhatsApp] Error in simulateIncomingWhatsApp:', error);
    res.status(500).json({ success: false, error: { message: 'Simulation failed' } });
  }
};
