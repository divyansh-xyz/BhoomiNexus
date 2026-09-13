import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { authorize } from "../rbac.middleware";
import { ApiError } from "../../utils/apiError";
import { assertWorkflowEditable } from "../../modules/workflows/workflowGraph.service";
import { getStateDashboard, getDistrictDashboard } from "../../modules/dashboards/dashboards.controller";

/**
 * Phase 22 — Authorization and Data Isolation Testing
 * 
 * Objective: Test the complete role matrix.
 * 
 * Roles Tested:
 *   1. National Authority
 *   2. State Authority
 *   3. District Authority
 *   4. Requesting Authority
 *   5. BOSS
 *   6. Processing Officer
 *   7. Compensation Officer
 *   8. Possession Officer
 * 
 * Acceptance: Unauthorized API requests fail server-side (403 Forbidden / 409 Conflict).
 */
describe("Phase 22 — Authorization and Data Isolation Testing", () => {
  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  // Helper to run route authorization middleware
  const testAuthorize = (allowedRoles: string[], userRole: string): boolean => {
    const req = { user: { id: "user-123", role: userRole } } as unknown as Request;
    const res = mockResponse();
    let passed = false;
    let error: any = null;

    const middleware = authorize(allowedRoles);
    middleware(req, res, ((err?: any) => {
      if (err) error = err;
      else passed = true;
    }) as NextFunction);

    if (error && error.statusCode === 403) return false;
    return passed;
  };

  describe("1. National Authority Boundaries", () => {
    const role = "NATIONAL_AUTHORITY";

    it("CAN: access authorized national monitoring", () => {
      expect(testAuthorize(["NATIONAL_AUTHORITY", "ADMIN"], role)).toBe(true);
    });

    it("CANNOT: modify workflow (server-side 403)", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: execute officer tasks (server-side 403)", () => {
      expect(testAuthorize(["PROCESSING_OFFICER", "COMPENSATION_OFFICER", "POSSESSION_OFFICER", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify compensation records (server-side 403)", () => {
      expect(testAuthorize(["COMPENSATION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify possession records (server-side 403)", () => {
      expect(testAuthorize(["POSSESSION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(false);
    });
  });

  describe("2. State Authority Boundaries & Data Isolation", () => {
    const role = "STATE_AUTHORITY";

    it("CAN: monitor authorized state", () => {
      expect(testAuthorize(["STATE_AUTHORITY", "NATIONAL_AUTHORITY", "ADMIN"], role)).toBe(true);
    });

    it("CANNOT: access national dashboard (server-side 403)", () => {
      expect(testAuthorize(["NATIONAL_AUTHORITY", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify workflow topology (server-side 403)", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(false);
    });

    it("DATA ISOLATION: rejected when querying outside authorized state", async () => {
      const req = {
        user: { id: "u-state-mh", role: "STATE_AUTHORITY", state: "MH" },
        params: { stateId: "KA" }, // Unauthorized state request
      } as unknown as Request;
      const res = mockResponse();
      let error: any = null;

      await getStateDashboard(req, res, ((err?: any) => {
        error = err;
      }) as NextFunction);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("Cannot access records outside state 'MH'");
    });
  });

  describe("3. District Authority Boundaries & Data Isolation", () => {
    const role = "DISTRICT_AUTHORITY";

    it("CAN: monitor authorized district", () => {
      expect(testAuthorize(["DISTRICT_AUTHORITY", "STATE_AUTHORITY", "NATIONAL_AUTHORITY", "ADMIN"], role)).toBe(true);
    });

    it("CANNOT: access national dashboard (server-side 403)", () => {
      expect(testAuthorize(["NATIONAL_AUTHORITY", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify workflow topology (server-side 403)", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(false);
    });

    it("DATA ISOLATION: rejected when querying outside authorized district", async () => {
      const req = {
        user: { id: "u-dist-pune", role: "DISTRICT_AUTHORITY", district: "pune" },
        params: { districtId: "nagpur" }, // Unauthorized district request
      } as unknown as Request;
      const res = mockResponse();
      let error: any = null;

      await getDistrictDashboard(req, res, ((err?: any) => {
        error = err;
      }) as NextFunction);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("Cannot access records outside district 'pune'");
    });
  });

  describe("4. Requesting Authority Boundaries", () => {
    const role = "REQUESTING_AUTHORITY";

    it("CAN: create own projects", () => {
      expect(testAuthorize(["REQUESTING_AUTHORITY"], role)).toBe(true);
    });

    it("CAN: submit corrections and resubmissions", () => {
      expect(testAuthorize(["REQUESTING_AUTHORITY"], role)).toBe(true);
    });

    it("CANNOT: modify workflow topology (server-side 403)", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: execute officer tasks (server-side 403)", () => {
      expect(testAuthorize(["PROCESSING_OFFICER", "COMPENSATION_OFFICER", "POSSESSION_OFFICER", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: access executive national dashboard (server-side 403)", () => {
      expect(testAuthorize(["NATIONAL_AUTHORITY", "ADMIN"], role)).toBe(false);
    });
  });

  describe("5. BOSS (Bureaucratic Operational Workflow Specialist) Boundaries", () => {
    const role = "BOSS";

    it("CAN: design pre-activation workflows", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(true);
    });

    it("CANNOT: modify post-activation projects (assertWorkflowEditable throws 409)", () => {
      const activeInstance = { status: "ACTIVE" };
      expect(() => assertWorkflowEditable(activeInstance)).toThrowError(ApiError);
      try {
        assertWorkflowEditable(activeInstance);
      } catch (err: any) {
        expect(err.statusCode).toBe(409);
        expect(err.message).toContain("WORKFLOW_ALREADY_ACTIVATED");
      }
    });

    it("CANNOT: execute officer tasks (server-side 403)", () => {
      expect(testAuthorize(["PROCESSING_OFFICER", "COMPENSATION_OFFICER", "POSSESSION_OFFICER", "ADMIN"], role)).toBe(false);
    });
  });

  describe("6. Processing Officer Boundaries", () => {
    const role = "PROCESSING_OFFICER";

    it("CAN: execute assigned acquisition tasks", () => {
      expect(testAuthorize(["PROCESSING_OFFICER", "COMPENSATION_OFFICER", "POSSESSION_OFFICER", "ADMIN"], role)).toBe(true);
    });

    it("CANNOT: modify compensation records (server-side 403)", () => {
      expect(testAuthorize(["COMPENSATION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify possession records (server-side 403)", () => {
      expect(testAuthorize(["POSSESSION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify workflow topology (server-side 403)", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(false);
    });
  });

  describe("7. Compensation Officer Boundaries", () => {
    const role = "COMPENSATION_OFFICER";

    it("CAN: execute assigned compensation tasks", () => {
      expect(testAuthorize(["COMPENSATION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(true);
      expect(testAuthorize(["COMPENSATION_OFFICER", "ADMIN"], role)).toBe(true);
    });

    it("CANNOT: modify possession records (server-side 403)", () => {
      expect(testAuthorize(["POSSESSION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify workflow topology (server-side 403)", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(false);
    });
  });

  describe("8. Possession Officer Boundaries", () => {
    const role = "POSSESSION_OFFICER";

    it("CAN: execute assigned possession tasks", () => {
      expect(testAuthorize(["POSSESSION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(true);
    });

    it("CANNOT: modify compensation records (server-side 403)", () => {
      expect(testAuthorize(["COMPENSATION_OFFICER", "DISTRICT_AUTHORITY", "ADMIN"], role)).toBe(false);
    });

    it("CANNOT: modify workflow topology (server-side 403)", () => {
      expect(testAuthorize(["BOSS", "ADMIN"], role)).toBe(false);
    });
  });

  describe("9. Acceptance Rule: Unauthorized API Requests Fail Server-Side", () => {
    it("Enforces server-side 403 rejection for every role attempting unauthorized endpoints", () => {
      const allRoles = [
        "NATIONAL_AUTHORITY",
        "STATE_AUTHORITY",
        "DISTRICT_AUTHORITY",
        "REQUESTING_AUTHORITY",
        "BOSS",
        "PROCESSING_OFFICER",
        "COMPENSATION_OFFICER",
        "POSSESSION_OFFICER",
      ];

      // Only BOSS and ADMIN can modify workflow
      for (const r of allRoles) {
        const canModify = testAuthorize(["BOSS", "ADMIN"], r);
        if (r === "BOSS") {
          expect(canModify).toBe(true);
        } else {
          expect(canModify).toBe(false);
        }
      }

      // Only operational officers can execute tasks
      const officerRoles = ["PROCESSING_OFFICER", "COMPENSATION_OFFICER", "POSSESSION_OFFICER"];
      for (const r of allRoles) {
        const canExecute = testAuthorize(["PROCESSING_OFFICER", "COMPENSATION_OFFICER", "POSSESSION_OFFICER", "ADMIN"], r);
        if (officerRoles.includes(r)) {
          expect(canExecute).toBe(true);
        } else {
          expect(canExecute).toBe(false);
        }
      }
    });
  });
});
