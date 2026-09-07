import { redisClient } from '../../config/redis';
import { pool } from '../../config/db';
import { whatsappService, WhatsAppIncomingMessage } from './whatsapp.service';
import { orchestrationService } from './whatsappOrchestration.service';

export type ConversationState =
  | 'IDLE'
  | 'AWAITING_ACTION'
  | 'AWAITING_PROJECT'
  | 'AWAITING_PARCEL'
  | 'AWAITING_CATEGORY'
  | 'AWAITING_DESCRIPTION'
  | 'CONFIRMED';

export interface ConversationSession {
  phone: string;
  contactName: string;
  state: ConversationState;
  selectedProjectId?: string;
  selectedProjectCode?: string;
  selectedProjectTitle?: string;
  selectedParcelId?: string;
  selectedSurveyNumber?: string;
  selectedCategory?: string;
  selectedCategoryLabel?: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'COMPENSATION_VALUATION': 'Compensation Issue',
  'BOUNDARY_DISPUTE': 'Boundary Dispute',
  'REHABILITATION_RESETTLEMENT': 'R&R / Rehabilitation',
  'TITLE_OWNERSHIP': 'Title / Ownership',
  'ENVIRONMENTAL_CONCERN': 'Environmental Concern',
  'OTHER': 'Other'
};

class WhatsAppConversationService {
  private getRedisKey(phone: string): string {
    return `wa:session:${phone}`;
  }

  public async getSession(phone: string): Promise<ConversationSession | null> {
    const data = await redisClient.get(this.getRedisKey(phone));
    if (data) {
      return JSON.parse(data) as ConversationSession;
    }
    return null;
  }

  public async setSession(session: ConversationSession): Promise<void> {
    // 30-minute TTL (1800 seconds)
    await redisClient.setEx(this.getRedisKey(session.phone), 1800, JSON.stringify(session));
  }

  public async clearSession(phone: string): Promise<void> {
    await redisClient.del(this.getRedisKey(phone));
  }

  private async getOrCreateSession(phone: string, senderName?: string): Promise<ConversationSession> {
    let session = await this.getSession(phone);
    if (!session) {
      session = {
        phone,
        contactName: senderName || 'Citizen',
        state: 'IDLE',
        createdAt: new Date().toISOString()
      };
    } else if (senderName && (session.contactName === 'Citizen' || !session.contactName)) {
      session.contactName = senderName;
    }
    return session;
  }

  public async handleMessage(msg: WhatsAppIncomingMessage, senderName?: string): Promise<void> {
    const phone = msg.from;
    const textInput = (msg.text?.body || '').trim();
    const inputId = (msg.interactive?.list_reply?.id || msg.interactive?.button_reply?.id || '').trim();
    const upperText = textInput.toUpperCase();
    const messageId = msg.id;

    const session = await this.getOrCreateSession(phone, senderName);

    console.log(`[WhatsAppConversation] Incoming from ${phone} (State: ${session.state}): text="${textInput}", inputId="${inputId}"`);

    // GLOBAL COMMANDS
    if (upperText === 'CANCEL' || upperText === 'RESET' || upperText === 'RESTART' || upperText === 'MAIN MENU') {
      await this.clearSession(phone);
      await this.sendGreetingAndActionList(phone, senderName || 'Citizen');
      return;
    }

    if (upperText.startsWith('STATUS ') || upperText.startsWith('TRACK ')) {
      const query = textInput.substring(textInput.indexOf(' ') + 1).trim();
      if (query.startsWith('GRV-')) {
        await orchestrationService.handleGrievanceTracking(query, phone);
      } else {
        await orchestrationService.handleParcelStatusQuery(query, phone);
      }
      return;
    }

    // STATE MACHINE PROCESSING
    switch (session.state) {
      case 'IDLE':
      case 'AWAITING_ACTION':
        await this.handleAwaitingActionStep(phone, session, textInput, inputId);
        break;

      case 'AWAITING_PROJECT':
        await this.handleAwaitingProjectStep(phone, session, textInput, inputId);
        break;

      case 'AWAITING_PARCEL':
        await this.handleAwaitingParcelStep(phone, session, textInput, inputId);
        break;

      case 'AWAITING_CATEGORY':
        await this.handleAwaitingCategoryStep(phone, session, textInput, inputId);
        break;

      case 'AWAITING_DESCRIPTION':
        await this.handleAwaitingDescriptionStep(phone, session, textInput, messageId);
        break;

      case 'CONFIRMED':
        // Session complete, start fresh on new message
        await this.clearSession(phone);
        await this.sendGreetingAndActionList(phone, senderName || 'Citizen');
        break;

      default:
        await this.sendGreetingAndActionList(phone, session.contactName);
    }
  }

  /**
   * STEP 0: Citizen sends initial message -> Send Greeting + Service List
   */
  private async sendGreetingAndActionList(phone: string, contactName: string): Promise<void> {
    const session = await this.getOrCreateSession(phone, contactName);
    session.state = 'AWAITING_ACTION';
    await this.setSession(session);

    const greetingBody =
      `🏛️ *BhoomiNexus — Government of India*\n` +
      `*Land Acquisition Grievance & Information Portal*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Welcome, ${contactName}. This is the official statutory communication channel under RFCTLARR Act 2013.\n\n` +
      `How can we assist you today?\n\n` +
      `Please select an option below 👇`;

    const sections = [
      {
        title: 'Available Services',
        rows: [
          {
            id: 'ACTION_FILE_GRIEVANCE',
            title: 'File a Grievance',
            description: 'Submit a statutory objection or complaint'
          }
        ]
      }
    ];

    await whatsappService.sendInteractiveList(
      phone,
      'BhoomiNexus Services',
      greetingBody,
      'RFCTLARR Act 2013 • Statutory Portal',
      'Select an Option',
      sections
    );
  }

  /**
   * STEP 1: Process Step 0 selection ("File a Grievance") -> Query projects -> Send Project List
   */
  private async handleAwaitingActionStep(
    phone: string,
    session: ConversationSession,
    textInput: string,
    inputId: string
  ): Promise<void> {
    if (inputId === 'ACTION_FILE_GRIEVANCE' || textInput.toUpperCase().includes('GRIEVANCE') || textInput.toUpperCase().includes('FILE')) {
      
      const result = await pool.query(
        `SELECT id, code, title, district, state 
         FROM projects 
         WHERE status IN ('WORKFLOW_ACTIVE', 'COMPLETED', 'PARCELS_CONFIRMED', 'PENDING_CONFIGURATION')
         ORDER BY created_at DESC 
         LIMIT 10`
      );

      const projects = result.rows;
      if (projects.length === 0) {
        await whatsappService.sendMessage(phone, `⚠️ Currently there are no active land acquisition projects.`);
        return;
      }

      session.state = 'AWAITING_PROJECT';
      await this.setSession(session);

      const bodyText = `The following infrastructure projects are currently active in the acquisition pipeline.\n\nPlease select the project related to your grievance:`;

      const sections = [
        {
          title: 'Active Projects',
          rows: projects.map(p => ({
            id: `PROJECT_${p.id}`,
            title: (p.code || 'PRJ-CODE').substring(0, 24),
            description: (p.title || p.name || '').substring(0, 72)
          }))
        }
      ];

      await whatsappService.sendInteractiveList(
        phone,
        undefined,
        bodyText,
        undefined,
        'Select a Project',
        sections
      );
    } else {
      // Any other text, send the greeting & action list
      await this.sendGreetingAndActionList(phone, session.contactName);
    }
  }

  /**
   * STEP 2: Process project selection -> Query parcels -> Send Parcel List
   */
  private async handleAwaitingProjectStep(
    phone: string,
    session: ConversationSession,
    textInput: string,
    inputId: string
  ): Promise<void> {
    let projectId = '';
    if (inputId.startsWith('PROJECT_')) {
      projectId = inputId.replace('PROJECT_', '');
    } else if (textInput) {
      const found = await pool.query(`SELECT id FROM projects WHERE code = $1 OR title = $1 LIMIT 1`, [textInput]);
      if (found.rows.length > 0) projectId = found.rows[0].id;
    }

    if (!projectId) {
      await whatsappService.sendMessage(phone, `⚠️ Please select a valid project from the menu list or reply with \`CANCEL\`.`);
      return;
    }

    const projResult = await pool.query(`SELECT id, code, title FROM projects WHERE id = $1`, [projectId]);
    if (projResult.rows.length === 0) {
      await whatsappService.sendMessage(phone, `⚠️ Selected project not found.`);
      return;
    }
    const project = projResult.rows[0];

    const parcelResult = await pool.query(
      `SELECT lp.id, lp.survey_number, lp.ulpin, lp.area_acres, pp.status, lp.owner_reference as owner_name
       FROM land_parcels lp
       JOIN project_parcels pp ON pp.parcel_id = lp.id
       WHERE pp.project_id = $1 AND pp.status IN ('CONFIRMED', 'CANDIDATE')
       ORDER BY lp.survey_number
       LIMIT 10`,
      [projectId]
    );

    const parcels = parcelResult.rows;
    if (parcels.length === 0) {
      await whatsappService.sendMessage(phone, `⚠️ No confirmed parcels found for project ${project.code}.`);
      return;
    }

    session.state = 'AWAITING_PARCEL';
    session.selectedProjectId = project.id;
    session.selectedProjectCode = project.code;
    session.selectedProjectTitle = project.title;
    await this.setSession(session);

    const bodyText = `📍 *Project: ${project.code}*\n${project.title}\n\nThe following confirmed land parcels are associated with this project.\n\nSelect the parcel related to your grievance:`;

    const sections = [
      {
        title: 'Confirmed Parcels',
        rows: parcels.map(p => ({
          id: `PARCEL_${p.id}`,
          title: `${p.survey_number} • ${p.area_acres} acres`.substring(0, 24),
          description: `ULPIN: ${p.ulpin || 'N/A'} • ${p.owner_name || 'Owner N/A'}`.substring(0, 72)
        }))
      }
    ];

    await whatsappService.sendInteractiveList(
      phone,
      undefined,
      bodyText,
      undefined,
      'Select a Parcel',
      sections
    );
  }

  /**
   * STEP 3: Process parcel selection -> Send Category List
   */
  private async handleAwaitingParcelStep(
    phone: string,
    session: ConversationSession,
    textInput: string,
    inputId: string
  ): Promise<void> {
    let parcelId = '';
    if (inputId.startsWith('PARCEL_')) {
      parcelId = inputId.replace('PARCEL_', '');
    }

    if (!parcelId) {
      await whatsappService.sendMessage(phone, `⚠️ Please select a valid land parcel from the menu list or reply with \`CANCEL\`.`);
      return;
    }

    const parcelResult = await pool.query(`SELECT id, survey_number, area_acres FROM land_parcels WHERE id = $1`, [parcelId]);
    if (parcelResult.rows.length === 0) {
      await whatsappService.sendMessage(phone, `⚠️ Selected parcel not found.`);
      return;
    }
    const parcel = parcelResult.rows[0];

    session.state = 'AWAITING_CATEGORY';
    session.selectedParcelId = parcel.id;
    session.selectedSurveyNumber = parcel.survey_number;
    await this.setSession(session);

    const bodyText = `Parcel: ${parcel.survey_number} (${parcel.area_acres} acres)\nProject: ${session.selectedProjectCode || 'PRJ'}\n\nWhat is the nature of your complaint?\n\nSelect the most appropriate category:`;

    const sections = [
      {
        title: 'Grievance Categories',
        rows: Object.entries(CATEGORY_LABELS).map(([k, v]) => ({
          id: `CATEGORY_${k}`,
          title: v.substring(0, 24),
        }))
      }
    ];

    await whatsappService.sendInteractiveList(
      phone,
      '📋 Grievance Category',
      bodyText,
      'RFCTLARR Act 2013',
      'Select Category',
      sections
    );
  }

  /**
   * STEP 4: Process category selection -> Prompt for text description
   */
  private async handleAwaitingCategoryStep(
    phone: string,
    session: ConversationSession,
    textInput: string,
    inputId: string
  ): Promise<void> {
    let categoryKey = '';
    if (inputId.startsWith('CATEGORY_')) {
      categoryKey = inputId.replace('CATEGORY_', '');
    }

    if (!categoryKey || !CATEGORY_LABELS[categoryKey]) {
      await whatsappService.sendMessage(phone, `⚠️ Please select a valid category from the menu list or reply with \`CANCEL\`.`);
      return;
    }

    const categoryLabel = CATEGORY_LABELS[categoryKey];
    session.state = 'AWAITING_DESCRIPTION';
    session.selectedCategory = categoryKey;
    session.selectedCategoryLabel = categoryLabel;
    await this.setSession(session);

    const promptText =
      `✍️ *Describe Your Grievance*\n\n` +
      `Category: ${categoryLabel}\n` +
      `Parcel: ${session.selectedSurveyNumber || 'SV-142'}\n` +
      `Project: ${session.selectedProjectCode || 'PRJ'}\n\n` +
      `Please type a detailed description of your grievance below.\n\n` +
      `Include specific details such as:\n` +
      `• What happened\n` +
      `• When it happened\n` +
      `• What resolution you are seeking\n\n` +
      `Your message will be recorded as a statutory representation\n` +
      `under RFCTLARR Act 2013.`;

    await whatsappService.sendMessage(phone, promptText);
  }

  /**
   * STEP 5: Process free text description -> Create Grievance & Send Confirmation
   */
  private async handleAwaitingDescriptionStep(
    phone: string,
    session: ConversationSession,
    textInput: string,
    messageId?: string
  ): Promise<void> {
    if (!textInput || textInput.length < 5) {
      await whatsappService.sendMessage(phone, `⚠️ Please type a detailed description of your grievance (at least 5 characters).`);
      return;
    }

    const createdGrievance = await orchestrationService.createGrievanceFromSession(session, phone, textInput, messageId);

    if (createdGrievance) {
      session.state = 'CONFIRMED';
      await this.clearSession(phone);
    }
  }
}

export const conversationService = new WhatsAppConversationService();
