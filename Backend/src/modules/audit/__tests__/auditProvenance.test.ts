import { describe, it, expect } from "vitest";
import { createAuditEvent, verifyAuditHash, computeAuditHash } from "../../../utils/audit";
import { AuditService } from "../audit.service";

/**
 * Phase 21 — Audit and Provenance Verification
 * 
 * Objective: Ensure all important V2 mutations have trustworthy traceability.
 * 
 * Required audit tests:
 *   1. Create node
 *   2. Move parcel
 *   3. Apply template
 *   4. Delete node
 *   5. Activate
 *   6. Reject
 *   7. Resubmit
 *   8. Compensation update
 *   9. Possession completion
 * 
 * Fabric: Anchor selected important events asynchronously.
 * Acceptance:
 *   - Each important event has: PostgreSQL audit, optional provenance status, hash
 *   - No core business action fails because Fabric is unavailable.
 */
describe("Phase 21 — Audit and Provenance Verification", () => {
  const dummyProjectId = "p-nhai-ringroad-2026";
  const dummyParcelId = "ULPIN-MH-PUN-001";

  it("1. Create node: audit event contains SHA-256 hash and provenance anchor", async () => {
    const res = await createAuditEvent({
      userRole: "BOSS",
      action: "WORKFLOW_NODE_CREATE",
      entityType: "WORKFLOW_NODE",
      entityId: "node-survey-101",
      details: { projectId: dummyProjectId, nodeKey: "STAGE_SURVEY", name: "Joint Measurement Survey" },
    });

    expect(res.action).toBe("WORKFLOW_NODE_CREATE");
    expect(res.hash).toBeDefined();
    expect(res.hash).toHaveLength(64); // Valid SHA-256 hex string
    expect(["FABRIC_ANCHORED", "LOCAL_PROVENANCE"]).toContain(res.provenanceStatus);
    expect(res.fabricTxId).toMatch(/^tx-fab-[a-f0-9]{16}$/);

    // Verify hash integrity
    const valid = verifyAuditHash(
      {
        action: res.action,
        entityType: res.entityType,
        entityId: res.entityId,
        metadata: { projectId: dummyProjectId, nodeKey: "STAGE_SURVEY", name: "Joint Measurement Survey" },
        timestamp: res.timestamp,
      },
      res.hash
    );
    expect(valid).toBe(true);
  });

  it("2. Move parcel: audit event tracks cohort movement with cryptographic proof", async () => {
    const res = await createAuditEvent({
      userRole: "BOSS",
      action: "WORKFLOW_COHORT_MOVE_PARCELS",
      entityType: "WORKFLOW_NODE",
      entityId: "node-target-202",
      details: {
        projectId: dummyProjectId,
        sourceNodeId: "node-source-101",
        targetNodeId: "node-target-202",
        movedCount: 1,
        parcelIds: [dummyParcelId],
      },
    });

    expect(res.action).toBe("WORKFLOW_COHORT_MOVE_PARCELS");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("3. Apply template: audit event records template application and provenance", async () => {
    const res = await createAuditEvent({
      userRole: "BOSS",
      action: "WORKFLOW_TEMPLATE_APPLY",
      entityType: "WORKFLOW_NODE",
      entityId: "node-branch-303",
      details: {
        projectId: dummyProjectId,
        templateId: "tpl-nhai-expressway-standard",
        appliedNodeCount: 7,
      },
    });

    expect(res.action).toBe("WORKFLOW_TEMPLATE_APPLY");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("4. Delete node: audit event records node excision with provenance", async () => {
    const res = await createAuditEvent({
      userRole: "BOSS",
      action: "WORKFLOW_NODE_DELETE",
      entityType: "WORKFLOW_NODE",
      entityId: "node-deprecated-404",
      details: { projectId: dummyProjectId },
    });

    expect(res.action).toBe("WORKFLOW_NODE_DELETE");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("5. Activate: audit event records workflow activation milestone", async () => {
    const res = await createAuditEvent({
      userRole: "BOSS",
      action: "WORKFLOW_ACTIVATED",
      entityType: "PROJECT",
      entityId: dummyProjectId,
      details: { stageCount: 4, activeSince: new Date().toISOString() },
    });

    expect(res.action).toBe("WORKFLOW_ACTIVATED");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("6. Reject: audit event records statutory stage rejection and defect details", async () => {
    const res = await createAuditEvent({
      userRole: "PROCESSING_OFFICER",
      action: "STAGE_REJECTED",
      entityType: "STAGE",
      entityId: "stage-demarcation-02",
      details: {
        projectId: dummyProjectId,
        defectReason: "Discrepancy in northern boundary traverse",
        actionRequired: "Resubmit revised shapefile",
      },
    });

    expect(res.action).toBe("STAGE_REJECTED");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("7. Resubmit: audit event logs proponent rectification and resubmission", async () => {
    const res = await createAuditEvent({
      userRole: "REQUESTING_AUTHORITY",
      action: "STAGE_RESUBMITTED",
      entityType: "STAGE",
      entityId: "stage-demarcation-02",
      details: {
        projectId: dummyProjectId,
        rectificationNotes: "Amended DGPS points aligned with village survey sheet",
      },
    });

    expect(res.action).toBe("STAGE_RESUBMITTED");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("8. Compensation update: audit event logs Section 26 award & PFMS disbursal", async () => {
    const res = await createAuditEvent({
      userRole: "COMPENSATION_OFFICER",
      action: "COMPENSATION_PAYMENT_DISBURSED",
      entityType: "COMPENSATION_RECORD",
      entityId: "comp-rec-001",
      details: {
        projectId: dummyProjectId,
        parcelId: dummyParcelId,
        approvedAmount: 10500000,
        paidAmount: 10500000,
        pfmsBatchId: "PFMS-MH-PUN-2026-0881",
      },
    });

    expect(res.action).toBe("COMPENSATION_PAYMENT_DISBURSED");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("9. Possession completion: audit event logs Section 38 vesting & Panchnama", async () => {
    const res = await createAuditEvent({
      userRole: "POSSESSION_OFFICER",
      action: "POSSESSION_PHYSICAL_FORMALIZED",
      entityType: "POSSESSION_RECORD",
      entityId: "poss-rec-001",
      details: {
        projectId: dummyProjectId,
        parcelId: dummyParcelId,
        panchnamaNumber: "PNCH-HAV-2026-042",
        vestingStatus: "COMPLETED_VESTED",
      },
    });

    expect(res.action).toBe("POSSESSION_PHYSICAL_FORMALIZED");
    expect(res.hash).toHaveLength(64);
    expect(res.provenanceStatus).toBe("FABRIC_ANCHORED");
  });

  it("10. Fabric Fault-Tolerance: No core business action fails if Fabric is unavailable", async () => {
    // When Fabric is down or times out (forceFabricFailure: true):
    const res = await createAuditEvent({
      userRole: "BOSS",
      action: "WORKFLOW_NODE_CREATE",
      entityType: "WORKFLOW_NODE",
      entityId: "node-resilient-999",
      details: { projectId: dummyProjectId, resilientTest: true },
      forceFabricFailure: true,
    });

    // Core business action MUST NOT fail
    expect(res).toBeDefined();
    expect(res.action).toBe("WORKFLOW_NODE_CREATE");
    expect(res.hash).toHaveLength(64);
    // Gracefully degrades to LOCAL_PROVENANCE
    expect(res.provenanceStatus).toBe("LOCAL_PROVENANCE");
  });

  it("11. Tamper-Evidence: Re-verifying a modified payload correctly detects tampering", async () => {
    const details = { amount: 5000000, officer: "A. B. Deshmukh" };
    const timestamp = "2026-09-13T00:00:00.000Z";
    const genuineHash = computeAuditHash("COMPENSATION_UPDATE", "RECORD", "rec-1", details, timestamp);

    // Verification of unmodified payload succeeds
    expect(
      verifyAuditHash(
        { action: "COMPENSATION_UPDATE", entityType: "RECORD", entityId: "rec-1", metadata: details, timestamp },
        genuineHash
      )
    ).toBe(true);

    // Verification of tampered payload (e.g. modified amount) MUST fail
    const tamperedDetails = { amount: 9999999, officer: "A. B. Deshmukh" };
    expect(
      verifyAuditHash(
        { action: "COMPENSATION_UPDATE", entityType: "RECORD", entityId: "rec-1", metadata: tamperedDetails, timestamp },
        genuineHash
      )
    ).toBe(false);
  });
});
