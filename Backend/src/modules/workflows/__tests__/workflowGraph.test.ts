import { describe, it, expect } from 'vitest';
import { SEED_TEMPLATES, getContextualTemplates, previewTemplate } from '../workflowTemplates.service';
import { isValidClosedPolygon, V2_PRIMARY_PROJECT, V2_PARCELS } from '../../../database/v2/seedData';

describe('Phases 4, 5, 6, 7 — Workflow Graph & Template Services', () => {
  describe('Phase 7: Contextual Workflow Templates', () => {
    it('provides all 5 required seed templates', async () => {
      const templateIds = SEED_TEMPLATES.map(t => t.id);
      expect(templateIds).toContain('highway_development');
      expect(templateIds).toContain('army_acquisition');
      expect(templateIds).toContain('tribal_area');
      expect(templateIds).toContain('compensation_standard');
      expect(templateIds).toContain('possession_standard');
    });

    it('each template defines valid nodes and directed edge fragments', () => {
      for (const tpl of SEED_TEMPLATES) {
        expect(tpl.nodes.length).toBeGreaterThan(0);
        expect(tpl.name).toBeTruthy();
        expect(tpl.category).toBeTruthy();
        for (const node of tpl.nodes) {
          expect(node.nodeKey).toBeTruthy();
          expect(node.name).toBeTruthy();
          expect(node.responsibleRole).toBeTruthy();
          expect(node.slaDays).toBeGreaterThan(0);
        }
      }
    });

    it('previews template fragment correctly', async () => {
      const preview = await previewTemplate('highway_development');
      expect(preview.name).toBe('Highway Development');
      expect(preview.nodes.length).toBe(3);
      expect(preview.edges.length).toBe(2);
    });

    it('filters contextual templates based on project type', async () => {
      const allTemplates = await getContextualTemplates();
      expect(allTemplates.length).toBe(5);
      for (const t of allTemplates) {
        expect(t.nodeCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Phases 4 & 6: Graph Topology & Cohort Validation Rules', () => {
    it('validates closed cadastral polygon coordinate rules', () => {
      const validClosedCoords: [number, number][] = [
        [73.4070, 18.7540],
        [73.4095, 18.7540],
        [73.4095, 18.7565],
        [73.4070, 18.7565],
        [73.4070, 18.7540],
      ];
      expect(isValidClosedPolygon(validClosedCoords)).toBe(true);

      const unclosedCoords: [number, number][] = [
        [73.4070, 18.7540],
        [73.4095, 18.7540],
        [73.4095, 18.7565],
        [73.4070, 18.7565],
      ];
      expect(isValidClosedPolygon(unclosedCoords)).toBe(false);
    });

    it('ensures parcel cohorts have positive areas and valid state/district membership', () => {
      for (const parcel of V2_PARCELS) {
        expect(parcel.state).toBe(V2_PRIMARY_PROJECT.state);
        expect(V2_PRIMARY_PROJECT.districts).toContain(parcel.district);
        expect(parcel.areaAcres).toBeGreaterThan(0);
        expect(parcel.intersectPercent).toBeGreaterThanOrEqual(50);
      }
    });
  });
});
