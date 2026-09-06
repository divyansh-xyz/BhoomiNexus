import crypto from 'crypto';
import { pool } from '../../config/db';
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
   * Processes incoming WhatsApp message and persists grievance into the real database
   */
  async processIncomingMessage(msg: WhatsAppIncomingMessage, contactName?: string): Promise<any> {
    const rawText = msg.text?.body || msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
    const phone = msg.from;
    const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');
    const citizenName = contactName || `Citizen (+${phone})`;

    logger.info(`[WhatsApp Webhook] Processing message from ${phone}: "${rawText}"`);

    // Check for existing WhatsApp message idempotency
    const existingMsg = await pool.query(
      'SELECT id, reference_number FROM grievances WHERE wa_message_id = $1',
      [msg.id]
    );
    if (existingMsg.rows.length > 0) {
      logger.info(`[WhatsApp] Duplicate message ID ${msg.id} ignored.`);
      return { processed: false, duplicate: true, reference: existingMsg.rows[0].reference_number };
    }

    // Attempt to match project code or title from text
    // E.g., PRJ-MH-4421, MH-4421, Mumbai-Pune, PRJ-KA-8890, etc.
    const projectMatch = await pool.query(`
      SELECT id, code, title FROM projects
      WHERE code ILIKE '%' || $1 || '%'
         OR title ILIKE '%' || $1 || '%'
      LIMIT 1
    `, [rawText.trim()]);

    let targetProjectId: string | null = null;
    let targetProjectCode: string = 'NIP';

    if (projectMatch.rows.length > 0) {
      targetProjectId = projectMatch.rows[0].id;
      targetProjectCode = projectMatch.rows[0].code;
    } else {
      // Look for regex pattern PRJ-XX-XXXX
      const codeRegex = /PRJ-[A-Z]{2}-\d{4}/i;
      const match = rawText.match(codeRegex);
      if (match) {
        const found = await pool.query('SELECT id, code FROM projects WHERE code = $1', [match[0].toUpperCase()]);
        if (found.rows.length > 0) {
          targetProjectId = found.rows[0].id;
          targetProjectCode = found.rows[0].code;
        }
      }
    }

    // Default fallback to first active project if no project explicitly matched
    if (!targetProjectId) {
      const defaultProj = await pool.query(
        "SELECT id, code FROM projects WHERE code = 'PRJ-MH-4421' LIMIT 1"
      );
      if (defaultProj.rows.length > 0) {
        targetProjectId = defaultProj.rows[0].id;
        targetProjectCode = defaultProj.rows[0].code;
      }
    }

    // Determine category based on message content
    let category = 'COMPENSATION_VALUATION';
    const lower = rawText.toLowerCase();
    if (lower.includes('boundary') || lower.includes('demarcation') || lower.includes('encroach')) {
      category = 'BOUNDARY_DISPUTE';
    } else if (lower.includes('resettle') || lower.includes('rehab') || lower.includes('r&r') || lower.includes('tenan')) {
      category = 'REHABILITATION_RESETTLEMENT';
    } else if (lower.includes('title') || lower.includes('khasra') || lower.includes('ownership') || lower.includes('mutation')) {
      category = 'TITLE_OWNERSHIP';
    } else if (lower.includes('road') || lower.includes('access') || lower.includes('tree') || lower.includes('environ')) {
      category = 'ENVIRONMENTAL_CONCERN';
    }

    // Extract survey number if mentioned (e.g. SV-117, Survey 142)
    const surveyMatch = rawText.match(/(?:survey|sv|gat|khasra)[\s#.:-]*(\d+)/i);
    const surveyNumber = surveyMatch ? `SV-${surveyMatch[1]}` : null;

    // Generate unique reference number
    const seqResult = await pool.query(
      'SELECT COUNT(*) FROM grievances WHERE project_id = $1',
      [targetProjectId]
    );
    const nextNum = parseInt(seqResult.rows[0].count, 10) + 1;
    const refYear = new Date().getFullYear();
    const referenceNumber = `GRV-${refYear}-${targetProjectCode.replace(/[^A-Za-z0-9]/g, '')}-${String(nextNum).padStart(2, '0')}`;

    // Insert grievance directly into Postgres database
    const insertRes = await pool.query(
      `INSERT INTO grievances
       (reference_number, project_id, source, citizen_name, citizen_phone, citizen_phone_hash,
        survey_number, wa_message_id, grievance_type, subject, description, status, sla_days, metadata)
       VALUES ($1, $2, 'WHATSAPP', $3, $4, $5, $6, $7, $8, $9, $10, 'OPEN', 15, $11)
       RETURNING *`,
      [
        referenceNumber,
        targetProjectId,
        citizenName,
        phone,
        phoneHash,
        surveyNumber,
        msg.id,
        category,
        `WhatsApp Statutory Representation: ${rawText.slice(0, 70)}...`,
        rawText,
        JSON.stringify({
          rawWebhookMessage: msg,
          channel: 'META_WHATSAPP_CLOUD_API',
          receivedAt: new Date().toISOString(),
        }),
      ]
    );

    const createdGrievance = insertRes.rows[0];

    // Send automated acknowledgement reply to citizen via WhatsApp
    const replyText =
      `🏛️ *Government of India • Land Acquisition Grievance Redressal*\n\n` +
      `Your statutory representation has been registered in the Sovereign Ledger.\n\n` +
      `📌 *Reference No:* \`${referenceNumber}\`\n` +
      `🏗️ *Project:* ${targetProjectCode}\n` +
      `⚖️ *Statutory SLA:* 15 Days per RFCTLARR Act 2013\n` +
      `📊 *Status:* PENDING SUPERVISING OFFICER REVIEW\n\n` +
      `You can track live updates by replying with: \`STATUS ${referenceNumber}\``;

    await this.sendMessage(phone, replyText);

    logger.info(`[WhatsApp] Created database grievance ${referenceNumber} for WhatsApp citizen ${phone}`);
    return { processed: true, reference: referenceNumber, grievance: createdGrievance };
  },
};
