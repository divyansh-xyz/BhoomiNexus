import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface WhatsAppIncomingMessage {
  from: string; // phone number e.g. "919876543210"
  id: string; // wamid.HBgL...
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'document' | string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  contact?: {
    name?: string;
  };
}

export const whatsappService = {
  /**
   * Sends an outgoing WhatsApp text message via Meta WhatsApp Business Cloud API
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      logger.warn({ to, message }, '[WhatsApp] Meta Cloud API credentials not fully configured; message simulation');
      return true;
    }

    const cleanTo = to.replace(/[^0-9]/g, '');
    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[WhatsApp] Failed to send message to ${cleanTo}: ${response.status} ${errorText}`);
        return false;
      }

      const data = await response.json();
      logger.info({ data }, `[WhatsApp] Outgoing message sent successfully to ${cleanTo}`);
      return true;
    } catch (error: any) {
      logger.error(`[WhatsApp] Failed to send message to ${cleanTo}: ${error.message}`);
      return false;
    }
  },



  /**
   * Sends an interactive list message to a WhatsApp user
   */
  async sendInteractiveList(
    to: string,
    headerText: string | undefined,
    bodyText: string,
    footerText: string | undefined,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<boolean> {
    if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      logger.warn({ to, bodyText }, '[WhatsApp] Meta Cloud API credentials not fully configured; interactive list simulation');
      return true;
    }

    const cleanTo = to.replace(/[^0-9]/g, '');
    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    try {
      const interactivePayload: any = {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections
        }
      };

      if (headerText) {
        interactivePayload.header = { type: 'text', text: headerText };
      }
      if (footerText) {
        interactivePayload.footer = { text: footerText };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'interactive',
          interactive: interactivePayload
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[WhatsApp] Failed to send interactive list to ${cleanTo}: ${response.status} ${errorText}`);
        return false;
      }

      logger.info(`[WhatsApp] Outgoing interactive list sent successfully to ${cleanTo}`);
      return true;
    } catch (error: any) {
      logger.error(`[WhatsApp] Failed to send interactive list to ${cleanTo}: ${error.message}`);
      return false;
    }
  },
};
