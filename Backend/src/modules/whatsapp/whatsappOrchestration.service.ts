import crypto from 'crypto';
import { pool } from '../../config/db';
import { whatsappService } from './whatsapp.service';
import { ConversationSession } from './whatsappConversation.service';

let grievanceSequence = 1;

export class OrchestrationService {
  /**
   * PHASE 16: Handle Grievance Tracking
   */
  async handleGrievanceTracking(
    grievanceRef: string,
    phone: string
  ): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT g.*, p.title as project_name
         FROM grievances g
         LEFT JOIN projects p ON g.project_id = p.id
         WHERE g.reference_number = $1`,
        [grievanceRef]
      );

      if (result.rows.length === 0) {
        await whatsappService.sendMessage(
          phone,
          `⚠️ *Grievance Not Found*\n\n` +
          `We could not find a grievance matching reference "*${grievanceRef}*".\n\n` +
          `Please verify the reference number and try again.\n\n` +
          `*Format example:* GRV-2026-PRJMH4421-01`
        );
        return;
      }

      const grievance = result.rows[0];

      const statusIcon =
        grievance.status === 'OPEN' || grievance.status === 'PENDING' ? '⏳' :
          grievance.status === 'UNDER_REVIEW' ? '🔍' :
            grievance.status === 'RESOLVED' ? '✅' : '❌';

      const trackingMessage =
        `${statusIcon} *Grievance Tracking Result*\n\n` +
        `📌 *Reference No:* ${grievance.reference_number}\n` +
        `🏗️ *Project:* ${grievance.project_name}\n` +
        `📍 *Parcel / Survey:* ${grievance.survey_number}\n` +
        `📋 *Category:* ${grievance.grievance_type}\n` +
        `⚖️ *SLA Days:* ${grievance.sla_days || 15} Days (RFCTLARR Act 2013)\n` +
        `⏱️ *Status:* ${grievance.status}\n` +
        `📅 *Submitted:* ${new Date(grievance.created_at).toLocaleDateString()}\n\n` +
        `*Subject:* ${grievance.subject || 'Statutory Objection'}\n` +
        `*Description:*\n${grievance.description}\n\n` +
        `Thank you for using the BhoomiNexus Statutory Portal.`;

      await whatsappService.sendMessage(phone, trackingMessage);
    } catch (error) {
      console.error('[OrchestrationService] Grievance tracking error:', error);
      await whatsappService.sendMessage(
        phone,
        `❌ *System Error*\n\nWe encountered an error tracking your grievance.`
      );
    }
  }

  /**
   * PHASE 15: Handle Parcel Status Lookup
   */
  async handleParcelStatusQuery(
    query: string,
    phone: string
  ): Promise<void> {
    try {
      // First try to find a parcel
      const parcelResult = await pool.query(
        `SELECT lp.*, p.id as project_id, p.code as project_code, p.title as project_name, pp.status as current_stage
         FROM land_parcels lp
         LEFT JOIN project_parcels pp ON pp.parcel_id = lp.id
         LEFT JOIN projects p ON pp.project_id = p.id
         WHERE lp.id::text = $1 OR lp.survey_number = $1 OR lp.ulpin = $1`,
        [query]
      );

      // If no parcel, try to find a project
      const projectResult = parcelResult.rows.length === 0 ? await pool.query(
        `SELECT * FROM projects WHERE id::text = $1 OR code = $1`,
        [query]
      ) : { rows: [] };

      if (parcelResult.rows.length === 0 && projectResult.rows.length === 0) {
        await whatsappService.sendMessage(
          phone,
          `⚠️ *Record Not Found*\n\n` +
          `We could not find a land parcel or project matching "*${query}*".\n\n` +
          `Please verify your Parcel ID, ULPIN, or Project Reference and try again.\n\n` +
          `*Example valid formats:*\n` +
          `• SV-142\n` +
          `• PRJ-MH-4421\n` +
          `• ULPIN-482913`
        );
        return;
      }

      if (parcelResult.rows.length > 0) {
        const parcel = parcelResult.rows[0];
        const locationStr = `${parcel.village}, District ${parcel.district}, ${parcel.state}`;
        const statusMessage =
          `✅ *Parcel Status Query Result*\n\n` +
          `📍 *Parcel ID:* ${parcel.id}\n` +
          `🗺️ *Survey No:* ${parcel.survey_number}\n` +
          `🆔 *ULPIN:* ${parcel.ulpin || 'N/A'}\n` +
          `📍 *Location:* ${locationStr}\n` +
          `📏 *Area:* ${parcel.area_acres} acres\n\n` +
          `🏗️ *Project Information*\n` +
          `📋 *Code:* ${parcel.project_code || 'N/A'}\n` +
          `📝 *Name:* ${parcel.project_name || 'N/A'}\n` +
          `⏱️ *Stage:* ${parcel.current_stage || 'N/A'}\n\n` +
          `*For assistance or to file a grievance, send any message to launch the main menu.*`;
        await whatsappService.sendMessage(phone, statusMessage);
      } else if (projectResult.rows.length > 0) {
        const project = projectResult.rows[0];
        const statusMessage =
          `✅ *Project Status Query Result*\n\n` +
          `🏗️ *Project Code:* ${project.code}\n` +
          `📋 *Name:* ${project.title}\n` +
          `🏢 *Department:* ${project.department}\n` +
          `📍 *Location:* District ${project.district}, ${project.state}\n` +
          `📊 *Status:* ${project.status}\n\n` +
          `*For assistance or to file a grievance, send any message to launch the main menu.*`;
        await whatsappService.sendMessage(phone, statusMessage);
      }
    } catch (error) {
      console.error('[OrchestrationService] Status lookup error:', error);
      await whatsappService.sendMessage(
        phone,
        `❌ *System Error*\n\nWe encountered an error processing your request. Please try again later.`
      );
    }
  }

  /**
   * PHASE 13: Create Grievance from Session
   */
  async createGrievanceFromSession(
    session: ConversationSession,
    phone: string,
    description: string,
    messageId?: string
  ): Promise<any> {
    try {
      const year = new Date().getFullYear();
      const projCodeRaw = (session.selectedProjectCode || 'PRJMH4421').replace(/[^A-Z0-9]/g, '');
      
      const seqResult = await pool.query(
        'SELECT COUNT(*) FROM grievances WHERE project_id = $1',
        [session.selectedProjectId]
      );
      const nextNum = parseInt(seqResult.rows[0].count, 10) + 1;
      const refNum = `GRV-${year}-${projCodeRaw}-${String(nextNum).padStart(2, '0')}`;

      const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');
      const projectCode = session.selectedProjectCode || 'PRJ-MH-4421';
      const projectName = session.selectedProjectTitle || 'Infrastructure Expansion';
      const surveyNo = session.selectedSurveyNumber || 'SV-142';
      const categoryType = session.selectedCategory || 'OTHER';
      const categoryLabel = session.selectedCategoryLabel || categoryType;

      const subject = `WhatsApp Grievance: ${categoryLabel} — ${surveyNo} under ${projectCode}`;

      const insertRes = await pool.query(
        `INSERT INTO grievances
         (reference_number, project_id, parcel_id, source, citizen_name, citizen_phone, citizen_phone_hash,
          survey_number, wa_message_id, grievance_type, subject, description, status, sla_days, metadata)
         VALUES ($1, $2, $3, 'WHATSAPP', $4, $5, $6, $7, $8, $9, $10, $11, 'OPEN', 15, $12)
         RETURNING *`,
        [
          refNum,
          session.selectedProjectId,
          session.selectedParcelId,
          session.contactName || 'Citizen',
          phone,
          phoneHash,
          surveyNo,
          messageId || `wa_msg_${Date.now()}`,
          categoryType,
          subject,
          description,
          JSON.stringify({
            sessionContext: { ...session },
            channel: 'META_WHATSAPP_CLOUD_API',
            receivedAt: new Date().toISOString(),
          }),
        ]
      );

      const createdGrievance = insertRes.rows[0];

      const confirmationMessage =
        `✅ *Grievance Registered Successfully*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 *Reference No:* ${refNum}\n` +
        `🏗️ *Project:* ${projectCode} — ${projectName}\n` +
        `📍 *Parcel:* ${surveyNo}\n` +
        `📋 *Category:* ${categoryLabel}\n` +
        `⚖️ *Statutory SLA:* 15 Days per RFCTLARR Act 2013\n` +
        `📊 *Status:* OPEN — Pending Supervising Officer Review\n\n` +
        `You will receive updates on this channel once your grievance\n` +
        `is reviewed by the competent authority.\n\n` +
        `To check status later, reply: STATUS ${refNum}\n\n` +
        `Thank you for using the BhoomiNexus Statutory Portal.\n` +
        `🏛️ Government of India`;

      await whatsappService.sendMessage(phone, confirmationMessage);

      console.log(`[Phase 13 Grievance Created] ${refNum} for phone ${phone}`);
      return createdGrievance;
    } catch (error) {
      console.error('[OrchestrationService] Phase 13 Grievance creation error:', error);
      await whatsappService.sendMessage(
        phone,
        `❌ *Error Creating Grievance*\n\nWe encountered an error submitting your grievance. Please try again.`
      );
      return null;
    }
  }
}

export const orchestrationService = new OrchestrationService();
