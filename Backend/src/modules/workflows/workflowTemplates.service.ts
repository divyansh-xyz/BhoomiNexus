import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { getWorkflowInstance, assertWorkflowEditable } from "./workflowGraph.service";
import { createAuditEvent } from "../../utils/audit";

export interface TemplateFragmentNode {
  nodeKey: string;
  name: string;
  nodeType: string;
  responsibleRole: string;
  slaDays: number;
  requiredDocs: string[];
}

export interface TemplateFragmentEdge {
  sourceKey: string;
  targetKey: string;
}

export interface ReusableTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  applicableContext: string[];
  nodes: TemplateFragmentNode[];
  edges: TemplateFragmentEdge[];
}

export const SEED_TEMPLATES: ReusableTemplate[] = [
  {
    id: "highway_development",
    name: "Highway Development",
    category: "LINEAR_INFRASTRUCTURE",
    description: "Multi-stage alignment verification and statutory gazette notifications for national highways",
    applicableContext: ["HIGHWAY_CORRIDOR", "ROAD", "ALL"],
    nodes: [
      {
        nodeKey: "alignment_verification",
        name: "Alignment & Right-of-Way Survey",
        nodeType: "STAGE",
        responsibleRole: "PROCESSING_OFFICER",
        slaDays: 14,
        requiredDocs: ["Cadastral Alignment Map", "Right-of-Way Extract"],
      },
      {
        nodeKey: "environmental_clearance",
        name: "Forest & Environmental Scrutiny",
        nodeType: "STAGE",
        responsibleRole: "PROCESSING_OFFICER",
        slaDays: 21,
        requiredDocs: ["Forest Clearance Certificate", "EIA Report"],
      },
      {
        nodeKey: "statutory_gazette_approval",
        name: "Statutory Section 3D Notification",
        nodeType: "APPROVAL",
        responsibleRole: "DISTRICT_AUTHORITY",
        slaDays: 7,
        requiredDocs: ["Gazette Draft", "Objection Summary"],
      },
    ],
    edges: [
      { sourceKey: "alignment_verification", targetKey: "environmental_clearance" },
      { sourceKey: "environmental_clearance", targetKey: "statutory_gazette_approval" },
    ],
  },
  {
    id: "army_acquisition",
    name: "Army Acquisition",
    category: "DEFENCE",
    description: "Expedited strategic acquisition for defence establishment and security buffer zones",
    applicableContext: ["DEFENCE", "STRATEGIC", "ALL"],
    nodes: [
      {
        nodeKey: "defence_clearance",
        name: "Defence Board Security Verification",
        nodeType: "STAGE",
        responsibleRole: "PROCESSING_OFFICER",
        slaDays: 10,
        requiredDocs: ["Military Engineering Service NOC", "Strategic Boundary Map"],
      },
      {
        nodeKey: "collector_special_order",
        name: "Urgency Clause Exemption Order",
        nodeType: "APPROVAL",
        responsibleRole: "DISTRICT_AUTHORITY",
        slaDays: 5,
        requiredDocs: ["Section 40 Urgency Declaration"],
      },
    ],
    edges: [
      { sourceKey: "defence_clearance", targetKey: "collector_special_order" },
    ],
  },
  {
    id: "tribal_area",
    name: "Tribal Area",
    category: "TRIBAL_PROTECTION",
    description: "Gram Sabha resolution and PESA statutory consent compliance for Scheduled Areas",
    applicableContext: ["TRIBAL", "PESA", "ALL"],
    nodes: [
      {
        nodeKey: "gram_sabha_resolution",
        name: "Gram Sabha Prior Informed Consent",
        nodeType: "STAGE",
        responsibleRole: "PROCESSING_OFFICER",
        slaDays: 30,
        requiredDocs: ["Gram Sabha Quorum Record", "Signed Resolution"],
      },
      {
        nodeKey: "tribal_welfare_noc",
        name: "Tribal Advisory Council Clearance",
        nodeType: "APPROVAL",
        responsibleRole: "DISTRICT_AUTHORITY",
        slaDays: 14,
        requiredDocs: ["Tribal Resettlement Plan", "TAC Clearance"],
      },
    ],
    edges: [
      { sourceKey: "gram_sabha_resolution", targetKey: "tribal_welfare_noc" },
    ],
  },
  {
    id: "compensation_standard",
    name: "Compensation Standard",
    category: "COMPENSATION",
    description: "End-to-end valuation, CALA award preparation, public hearing, and PFMS direct disbursement",
    applicableContext: ["COMPENSATION", "ALL"],
    nodes: [
      {
        nodeKey: "joint_measurement_survey",
        name: "Joint Measurement Survey (JMS)",
        nodeType: "STAGE",
        responsibleRole: "PROCESSING_OFFICER",
        slaDays: 10,
        requiredDocs: ["JMS Sheet", "Cadastral Map Extract"],
      },
      {
        nodeKey: "cala_valuation_award",
        name: "CALA Valuation & Award Declaration",
        nodeType: "STAGE",
        responsibleRole: "COMPENSATION_OFFICER",
        slaDays: 14,
        requiredDocs: ["Valuation Schedule", "Award Sheet"],
      },
      {
        nodeKey: "direct_disbursement_pfms",
        name: "Direct Benefit Disbursement (PFMS)",
        nodeType: "STAGE",
        responsibleRole: "COMPENSATION_OFFICER",
        slaDays: 7,
        requiredDocs: ["PFMS Payment Scroll", "Bank Acknowledgment"],
      },
    ],
    edges: [
      { sourceKey: "joint_measurement_survey", targetKey: "cala_valuation_award" },
      { sourceKey: "cala_valuation_award", targetKey: "direct_disbursement_pfms" },
    ],
  },
  {
    id: "possession_standard",
    name: "Possession Standard",
    category: "POSSESSION",
    description: "Physical inspection, panchnama demarcation, boundary fencing, and final possession handover",
    applicableContext: ["POSSESSION", "ALL"],
    nodes: [
      {
        nodeKey: "physical_inspection_panchnama",
        name: "Field Inspection & Panchnama",
        nodeType: "STAGE",
        responsibleRole: "POSSESSION_OFFICER",
        slaDays: 7,
        requiredDocs: ["Field Panchnama", "Geo-tagged Site Photos"],
      },
      {
        nodeKey: "encroachment_clearance",
        name: "Demarcation & Encroachment Removal",
        nodeType: "STAGE",
        responsibleRole: "POSSESSION_OFFICER",
        slaDays: 10,
        requiredDocs: ["Clearance Certificate", "Boundary Vector Layer"],
      },
      {
        nodeKey: "final_possession_handover",
        name: "Final Possession Certificate",
        nodeType: "APPROVAL",
        responsibleRole: "DISTRICT_AUTHORITY",
        slaDays: 5,
        requiredDocs: ["Possession Certificate (Section 38/40)"],
      },
    ],
    edges: [
      { sourceKey: "physical_inspection_panchnama", targetKey: "encroachment_clearance" },
      { sourceKey: "encroachment_clearance", targetKey: "final_possession_handover" },
    ],
  },
];

/**
 * Returns contextual templates matching a node or project context.
 */
export const getContextualTemplates = async (projectId?: string, nodeId?: string) => {
  let projectType = "ALL";
  if (projectId) {
    const projRes = await pool.query("SELECT project_type FROM projects WHERE id = $1", [projectId]);
    if (projRes.rows.length > 0) {
      projectType = projRes.rows[0].project_type || "ALL";
    }
  }

  return SEED_TEMPLATES.map(tpl => ({
    id: tpl.id,
    name: tpl.name,
    category: tpl.category,
    description: tpl.description,
    nodeCount: tpl.nodes.length,
    edgeCount: tpl.edges.length,
    isContextualMatch: tpl.applicableContext.includes("ALL") || tpl.applicableContext.includes(projectType),
  }));
};

/**
 * Previews the template fragment without modifying the database.
 */
export const previewTemplate = async (templateId: string) => {
  const template = SEED_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw new ApiError(404, `Template with ID '${templateId}' not found`);
  }
  return template;
};

/**
 * Applies a template fragment downstream of a selected node in an editable workflow.
 */
export const applyTemplateToNode = async (
  projectId: string,
  nodeId: string,
  templateId: string,
  userId: string
) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const template = SEED_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw new ApiError(404, `Template with ID '${templateId}' not found`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify parent anchor node
    const parentNodeRes = await client.query(
      `SELECT * FROM workflow_nodes WHERE id = $1 AND workflow_instance_id = $2`,
      [nodeId, instance.id]
    );
    if (parentNodeRes.rows.length === 0) {
      throw new ApiError(404, "Target anchor node not found in this workflow");
    }
    const parentNode = parentNodeRes.rows[0];

    const keyToIdMap = new Map<string, string>();
    let prevNodeId = parentNode.id;

    for (let i = 0; i < template.nodes.length; i++) {
      const tNode = template.nodes[i];
      const nodeKey = `${tNode.nodeKey}_${Date.now()}_${i}`;

      const insRes = await client.query(
        `INSERT INTO workflow_nodes
         (workflow_instance_id, node_key, name, node_type, responsible_role, configuration, template_source, x_position, y_position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          instance.id,
          nodeKey,
          tNode.name,
          tNode.nodeType,
          tNode.responsibleRole,
          JSON.stringify({ slaDays: tNode.slaDays, requiredDocs: tNode.requiredDocs }),
          template.id,
          parentNode.x_position + (i + 1) * 200,
          parentNode.y_position,
        ]
      );
      const inserted = insRes.rows[0];
      keyToIdMap.set(tNode.nodeKey, inserted.id);

      // Connect from anchor node to first template node
      if (i === 0) {
        await client.query(
          `INSERT INTO workflow_edges (workflow_instance_id, source_node_id, target_node_id, edge_type)
           VALUES ($1, $2, $3, 'TEMPLATE')`,
          [instance.id, parentNode.id, inserted.id]
        );
      }
    }

    // Connect internal template edges
    for (const tEdge of template.edges) {
      const srcId = keyToIdMap.get(tEdge.sourceKey);
      const tgtId = keyToIdMap.get(tEdge.targetKey);
      if (srcId && tgtId) {
        await client.query(
          `INSERT INTO workflow_edges (workflow_instance_id, source_node_id, target_node_id, edge_type)
           VALUES ($1, $2, $3, 'TEMPLATE')`,
          [instance.id, srcId, tgtId]
        );
      }
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "BOSS",
      action: "WORKFLOW_TEMPLATE_APPLY",
      entityType: "WORKFLOW_NODE",
      entityId: nodeId,
      details: { projectId, templateId, appliedNodeCount: template.nodes.length },
    });

    return {
      success: true,
      appliedTemplateId: template.id,
      insertedNodesCount: template.nodes.length,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
