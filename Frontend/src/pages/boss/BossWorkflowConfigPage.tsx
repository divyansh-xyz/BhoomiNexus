import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import './boss-dashboard.css';
import { bossService } from '../../services/api/boss.service';
import { workflowService } from '../../services/api/workflow.service';
import { DocumentService } from '../../services/DocumentService';
import type { ProjectRequest } from '../../types/boss.types';
import type {
  ProjectWorkflowInstance,
  WorkflowStageInstance,
  WorkflowTemplate,
  GovernmentOfficer,
} from '../../types/workflow.types';

interface BossWorkflowConfigPageProps {
  initialSelectTemplate?: boolean;
}

// Smart matcher for statutory deliverable titles and presets
const isDeliverableMatched = (attachedName: string, candidateName: string): boolean => {
  const a = (attachedName || '').toLowerCase().trim();
  const b = (candidateName || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;

  // Keyword stem groups for land acquisition and statutory clearances
  const stemGroups = [
    ['khasra', 'khatauni'],
    ['land schedule', 'schedule of land'],
    ['survey', 'cadastral', 'map'],
    ['gazette'],
    ['sia', 'social impact'],
    ['environmental', 'forest noc', 'state environmental'],
    ['dpr', 'detailed project report'],
    ['joint measurement'],
    ['valuation ledger', 'form 11', 'valuation'],
    ['gram sabha', 'panchayat'],
  ];

  for (const group of stemGroups) {
    const aMatch = group.some((kw) => a.includes(kw));
    const bMatch = group.some((kw) => b.includes(kw));
    if (aMatch && bMatch) return true;
  }

  return a.includes(b) || b.includes(a);
};

export const BossWorkflowConfigPage: React.FC<BossWorkflowConfigPageProps> = ({
  initialSelectTemplate = false,
}) => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [workflow, setWorkflow] = useState<ProjectWorkflowInstance | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [officers, setOfficers] = useState<GovernmentOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Template Selection Page State (when switching or explicitly opened with ?select=true / ?choose=true)
  const isSelectParam =
    initialSelectTemplate ||
    searchParams.get('select') === 'true' ||
    searchParams.get('choose') === 'true' ||
    searchParams.get('template') === 'true';
  const [isSelectingTemplate, setIsSelectingTemplate] = useState(isSelectParam);

  useEffect(() => {
    if (
      initialSelectTemplate ||
      searchParams.get('select') === 'true' ||
      searchParams.get('choose') === 'true' ||
      searchParams.get('template') === 'true'
    ) {
      setIsSelectingTemplate(true);
    }
  }, [initialSelectTemplate, searchParams]);

  // Edit / Add Stage Modal State
  const [editingStage, setEditingStage] = useState<WorkflowStageInstance | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);

  // Document tags input helper for modal
  const [docInputText, setDocInputText] = useState('');

  // Available Documents Modal State (BOSS Action: Add Document to Stage)
  const [docModalStage, setDocModalStage] = useState<WorkflowStageInstance | null>(null);
  const [availableProjectDocs, setAvailableProjectDocs] = useState<
    { id: string; title: string; type?: string; size?: string; hash?: string }[]
  >([]);
  const [loadingProjectDocs, setLoadingProjectDocs] = useState(false);
  const [customDocInput, setCustomDocInput] = useState('');
  const [docSearchQuery, setDocSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      try {
        setLoading(true);
        const [proj, wf, tmplList, officerList] = await Promise.all([
          bossService.getProjectById(projectId),
          workflowService.getProjectWorkflow(projectId),
          workflowService.getTemplates(),
          workflowService.getOfficers(),
        ]);
        setProject(proj);
        setWorkflow(wf);
        setTemplates(tmplList);
        setOfficers(officerList);
      } catch (err) {
        console.error('Failed to load workflow configuration data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  // 1. SELECT TEMPLATE (BOSS Action: Select Template)
  const handleSelectTemplate = async (templateId: string) => {
    if (!projectId) return;
    try {
      setSaving(true);
      const instantiated = await workflowService.instantiateFromTemplate(projectId, templateId);
      setWorkflow(instantiated);
      setIsSelectingTemplate(false);
      setSearchParams({});
    } catch (err) {
      console.error('Failed to instantiate template', err);
      alert('Failed to instantiate workflow from template.');
    } finally {
      setSaving(false);
    }
  };

  // 2. SET SLA (BOSS Action: Set SLA - Direct Inline on Stage Card)
  const handleDirectUpdateSla = (stageId: string, newSla: number) => {
    if (!workflow) return;
    const validatedSla = Math.max(1, Math.min(120, newSla));
    const updatedStages = (workflow.stages || []).map((s) =>
      s.id === stageId ? { ...s, slaDays: validatedSla } : s
    );
    const updated: ProjectWorkflowInstance = { ...workflow, stages: updatedStages };
    setWorkflow(updated);
    workflowService.updateStage(workflow.projectId, stageId, { slaDays: validatedSla });
  };

  // 3. ASSIGN OFFICER (BOSS Action: Assign Officer - Direct Inline Dropdown on Stage Card)
  const handleDirectAssignOfficer = (stageId: string, officerId: string) => {
    if (!workflow) return;
    const selectedOfficer = officers.find((o) => o.id === officerId);
    if (!selectedOfficer) return;

    const updatedStages = (workflow.stages || []).map((s) =>
      s.id === stageId
        ? {
            ...s,
            assignedOfficer: selectedOfficer,
            assignedRole: selectedOfficer.designation,
            department: selectedOfficer.department,
          }
        : s
    );
    const updated: ProjectWorkflowInstance = { ...workflow, stages: updatedStages };
    setWorkflow(updated);
    workflowService.updateStage(workflow.projectId, stageId, {
      assignedOfficer: selectedOfficer,
      assignedOfficerId: selectedOfficer.id,
      assignedRole: selectedOfficer.designation,
      department: selectedOfficer.department,
    });
  };

  // 4. REORDER STAGE (BOSS Action: Reorder Stage - Move Up)
  const handleMoveUp = (index: number) => {
    if (!workflow || index === 0) return;
    const newStages = [...workflow.stages];
    const temp = newStages[index - 1];
    newStages[index - 1] = newStages[index];
    newStages[index] = temp;

    newStages.forEach((s, idx) => {
      s.order = idx + 1;
    });

    const updated: ProjectWorkflowInstance = { ...workflow, stages: newStages };
    setWorkflow(updated);
    workflowService.reorderWorkflow(workflow.projectId, newStages.map((s) => s.id));
  };

  // 4. REORDER STAGE (BOSS Action: Reorder Stage - Move Down)
  const handleMoveDown = (index: number) => {
    if (!workflow || index === (workflow.stages || []).length - 1) return;
    const newStages = [...workflow.stages];
    const temp = newStages[index + 1];
    newStages[index + 1] = newStages[index];
    newStages[index] = temp;

    newStages.forEach((s, idx) => {
      s.order = idx + 1;
    });

    const updated: ProjectWorkflowInstance = { ...workflow, stages: newStages };
    setWorkflow(updated);
    workflowService.reorderWorkflow(workflow.projectId, newStages.map((s) => s.id));
  };

  // 5. REMOVE STAGE (BOSS Action: Remove Stage)
  const handleRemoveStage = (stageId: string) => {
    if (!workflow) return;
    if ((workflow.stages || []).length <= 1) {
      alert('Statutory Governance Rule: An acquisition workflow must contain at least one scrutiny stage.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this scrutiny stage from the sequence?')) {
      return;
    }
    const newStages = (workflow.stages || []).filter((s) => s.id !== stageId);
    newStages.forEach((s, idx) => {
      s.order = idx + 1;
    });
    const updated: ProjectWorkflowInstance = { ...workflow, stages: newStages };
    setWorkflow(updated);
    workflowService.removeStage(workflow.projectId, stageId);
  };

  // 6. ADD STAGE (BOSS Action: Add Stage - Open Modal)
  const handleOpenAddStage = () => {
    const defaultOfficer = officers[0] || {
      id: 'off-unassigned',
      name: 'Competent Authority Officer',
      designation: 'Designated Authority',
      department: 'Land Acquisition & Revenue Department',
      cadre: 'State Administrative Service',
      email: 'officer@gov.in',
      phone: '+91 11 2309 0000',
      officeLocation: 'Tehsil Complex',
    };
    setEditingStage({
      id: '',
      order: (workflow?.stages.length || 0) + 1,
      name: 'Custom Statutory Scrutiny Stage',
      description: 'Detailed field verification, land record concordance, and statutory inspection protocol.',
      department: defaultOfficer.department,
      assignedRole: defaultOfficer.designation,
      assignedOfficer: defaultOfficer,
      slaDays: 14,
      isMandatory: true,
      requiredDocuments: ['Inspection Report', 'Cadastral Concordance Memorandum'],
      status: 'PENDING',
    });
    setIsAddingStage(true);
  };

  // 7. MODIFY STAGE (BOSS Action: Modify Stage - Save Modal)
  const handleSaveStageModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow || !editingStage) return;

    try {
      setSaving(true);
      if (isAddingStage) {
        const newOrder = (workflow.stages || []).length + 1;
        const newStage: WorkflowStageInstance = {
          ...editingStage,
          order: newOrder,
          status: 'PENDING',
        };
        await workflowService.addStage(workflow.projectId, newStage);
      } else {
        await workflowService.updateStage(workflow.projectId, editingStage.id, editingStage);
      }
      
      const refreshedWorkflow = await workflowService.getProjectWorkflow(workflow.projectId);
      setWorkflow(refreshedWorkflow);
    } catch (err) {
      console.error('Failed to save stage:', err);
      alert('Failed to save stage to the server.');
    } finally {
      setSaving(false);
      setEditingStage(null);
      setIsAddingStage(false);
    }
  };

  // Document tags management in modal
  const handleAddDocument = (customDocName?: string) => {
    if (!editingStage) return;

    let docToAdd = (typeof customDocName === 'string' ? customDocName : docInputText).trim();

    if (!docToAdd) {
      const currentCount = (editingStage.requiredDocuments || []).length + 1;
      docToAdd = `Statutory Deliverable Document ${currentCount}`;
    }

    const currentDocs = Array.isArray(editingStage.requiredDocuments)
      ? editingStage.requiredDocuments
      : [];

    if (!currentDocs.includes(docToAdd)) {
      setEditingStage({
        ...editingStage,
        requiredDocuments: [...currentDocs, docToAdd],
      });
    }

    setDocInputText('');
  };

  const handleRemoveDocument = (docIdx: number) => {
    if (!editingStage) return;
    const currentDocs = Array.isArray(editingStage.requiredDocuments)
      ? editingStage.requiredDocuments
      : [];
    setEditingStage({
      ...editingStage,
      requiredDocuments: currentDocs.filter((_, idx) => idx !== docIdx),
    });
  };

  // 8. OPEN DOCUMENTS MODAL FOR STAGE (BOSS Action: Add Document)
  const handleOpenAddDocModal = async (stage: WorkflowStageInstance) => {
    setDocModalStage(stage);
    setCustomDocInput('');
    setDocSearchQuery('');
    if (!projectId) return;

    try {
      setLoadingProjectDocs(true);
      const [proj, serverDocs] = await Promise.all([
        bossService.getProjectById(projectId),
        DocumentService.getDocuments(projectId).catch(() => []),
      ]);

      const docList: { id: string; title: string; type?: string; size?: string; hash?: string }[] = [];
      const seen = new Set<string>();

      if (proj?.initialDocuments) {
        for (const d of proj.initialDocuments) {
          const key = d.title.trim().toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            docList.push({
              id: d.id,
              title: d.title,
              type: d.type,
              size: d.fileSize,
              hash: d.hash,
            });
          }
        }
      }

      if (Array.isArray(serverDocs)) {
        for (const d of serverDocs) {
          const key = d.title?.trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            docList.push({
              id: d.id,
              title: d.title!,
              type: d.documentType,
              size: (d as any).fileSize
                ? `${((d as any).fileSize / (1024 * 1024)).toFixed(1)} MB`
                : undefined,
              hash: (d as any).hash,
            });
          }
        }
      }

      if (docList.length === 0) {
        const statutoryPresets = [
          { id: 'std-1', title: 'Schedule of Land Holdings (Khasra/Khatauni Extract)', type: 'LAND_RECORD', size: '4.2 MB', hash: '0x8f2ae639d1b54a20' },
          { id: 'std-2', title: 'Gazette Notification Draft (Section 4(1))', type: 'GAZETTE_DRAFT', size: '2.8 MB', hash: '0x3c7d9e81b52a4401' },
          { id: 'std-3', title: 'Detailed Project Report (DPR) Alignment Extract', type: 'DPR_EXTRACT', size: '18.5 MB', hash: '0x11b9204cd76e3952' },
          { id: 'std-4', title: 'Cadastral Survey Map & Right-of-Way Vector Layer', type: 'ALIGNMENT_GEOJSON', size: '6.4 MB', hash: '0x5e41aa9098bc14d6' },
          { id: 'std-5', title: 'Social Impact Assessment (SIA) Clearance & Study', type: 'SIA_CLEARANCE', size: '11.0 MB', hash: '0x99a2185b304c21fe' },
          { id: 'std-6', title: 'State Environmental & Forest NOC Clearance', type: 'OTHER', size: '3.6 MB', hash: '0x77ef428019a2b53c' },
        ];
        docList.push(...statutoryPresets);
      }

      setAvailableProjectDocs(docList);
    } catch (err) {
      console.error('Failed to load project documents', err);
    } finally {
      setLoadingProjectDocs(false);
    }
  };

  const handleToggleAttachDoc = async (docTitle: string) => {
    if (!docModalStage || !workflow) return;
    const currentDocs = docModalStage.requiredDocuments || [];
    const isAttached = currentDocs.some((d) => isDeliverableMatched(d, docTitle));

    const updatedDocs = isAttached
      ? currentDocs.filter((d) => !isDeliverableMatched(d, docTitle))
      : [...currentDocs, docTitle];

    const updatedStage = { ...docModalStage, requiredDocuments: updatedDocs };
    setDocModalStage(updatedStage);

    const updatedStages = (workflow.stages || []).map((s) =>
      s.id === docModalStage.id ? updatedStage : s
    );
    setWorkflow({ ...workflow, stages: updatedStages });

    try {
      await workflowService.updateStage(workflow.projectId, docModalStage.id, {
        requiredDocuments: updatedDocs,
      });
    } catch (err) {
      console.error('Failed to update stage documents', err);
    }
  };

  const handleAddCustomDeliverable = async () => {
    const trimmed = customDocInput.trim();
    if (!trimmed || !docModalStage) return;
    await handleToggleAttachDoc(trimmed);
    setCustomDocInput('');
  };

  const handleRemoveDocFromStage = async (stageId: string, docTitle: string) => {
    if (!workflow) return;
    const targetStage = (workflow.stages || []).find((s) => s.id === stageId);
    if (!targetStage) return;

    const updatedDocs = (targetStage.requiredDocuments || []).filter(
      (d) => d.toLowerCase() !== docTitle.toLowerCase()
    );

    const updatedStages = (workflow.stages || []).map((s) =>
      s.id === stageId ? { ...s, requiredDocuments: updatedDocs } : s
    );
    setWorkflow({ ...workflow, stages: updatedStages });

    try {
      await workflowService.updateStage(workflow.projectId, stageId, {
        requiredDocuments: updatedDocs,
      });
    } catch (err) {
      console.error('Failed to remove stage document', err);
    }
  };

  const handleActivateWorkflow = async () => {
    if (!projectId || !workflow) return;
    try {
      setSaving(true);
      if (workflow.status !== 'ACTIVE') {
        await workflowService.activateWorkflow(projectId);
      }
      navigate(`/boss/projects/${projectId}`);
    } catch (err: any) {
      console.error('Failed to activate workflow', err);
      const apiMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;
      alert(`Activation failed: ${apiMessage || 'Please check stage parameters.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="things-boss-dashboard">
        <div className="things-boss-inner" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="things-review-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '460px', width: '100%', alignItems: 'center' }}>
            <span className="things-boss-dot-pulse" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--tb-ink)' }}>
              Retrieving Statutory Workflow Engine
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--tb-fog)', margin: 0, lineHeight: 1.5 }}>
              Accessing central statutory templates, stage definitions, and CALA officer records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="things-boss-dashboard">
        <div className="things-boss-inner" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="things-review-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '460px', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: 'var(--tb-ink)' }}>Project Record Not Found</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--tb-fog)', margin: '0 0 20px', lineHeight: 1.5 }}>
              The requested project identifier could not be retrieved from the central register.
            </p>
            <Link to="/boss/dashboard" className="things-btn things-btn-primary">
              &larr; Return to BOSS Worklist
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PROVISION 1: TEMPLATE SELECTION VIEW (When uninstantiated or switching template)
  // =========================================================================
  if (!workflow || isSelectingTemplate) {
    return (
      <div className="things-boss-dashboard">
        <div className="things-boss-inner">
          {/* Breadcrumb Bar */}
          <nav className="things-boss-breadcrumb" aria-label="Breadcrumb">
            <Link to="/boss/dashboard" className="things-boss-breadcrumb-link">
              &larr; BOSS Central Worklist
            </Link>
            <span className="things-boss-breadcrumb-sep">/</span>
            <Link to={`/boss/projects/${project.id}`} className="things-boss-breadcrumb-link">
              {project.code}
            </Link>
            <span className="things-boss-breadcrumb-sep">/</span>
            <span className="things-boss-breadcrumb-label">Select Master Workflow Template</span>
          </nav>

          {/* Template Chooser Masthead */}
          <section className="things-dossier-masthead">
            <div className="things-dossier-info">
              <div className="things-dossier-tag-row">
                <span className="things-pill things-pill-neutral">{project.proponentAuthority}</span>
                <span className="things-pill things-pill-blue things-pill-mono">{project.code}</span>
                <span className="things-pill things-pill-amber">ACTION REQUIRED: SELECT TEMPLATE</span>
              </div>
              <h1 className="things-dossier-title">Select Sovereign Master Workflow Template</h1>
              <p className="things-dossier-subtitle">
                Choose an authorized statutory master template to instantiate the field scrutiny pipeline for <strong>{project.title}</strong> ({project.district}, {project.state} &bull; {(project.confirmedAreaAcres || project.requestedAreaAcres || 0).toLocaleString()} Acres Determined).
              </p>
            </div>

            <div className="things-dossier-actions">
              {workflow && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectingTemplate(false);
                    setSearchParams({});
                  }}
                  className="things-btn things-btn-outline"
                >
                  &larr; Return to Current Pipeline ({workflow.templateName})
                </button>
              )}
            </div>
          </section>

          {/* Master Template Selection Cards Grid */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: 'var(--tb-ink)' }}>
                  Statutory Master Templates ({templates.length} Available)
                </h3>
                <p style={{ fontSize: '13.5px', margin: 0, color: 'var(--tb-fog)', lineHeight: 1.5 }}>
                  The master blueprint is preserved as a sovereign seed. Instantiating it creates a project-specific workflow instance that you can fully configure.
                </p>
              </div>
            </div>

            {templates.length === 0 ? (
              <div className="things-review-card" style={{ padding: '36px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--tb-ink)' }}>
                  No Master Workflow Templates Registered
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--tb-fog)' }}>
                  Master templates will appear here once seeded or published by the backend via <code>POST /api/v1/workflow-templates</code>.
                </p>
              </div>
            ) : (
              <div className="things-template-grid">
                {templates.map((tmpl) => {
                  const isCurrent = workflow?.templateId === tmpl.id;
                  const totalDefaultSla = (tmpl.defaultStages || []).reduce((s, stg) => s + stg.defaultSlaDays, 0);

                  return (
                    <div
                      key={tmpl.id}
                      className={`things-template-card ${isCurrent ? 'is-active' : ''}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="things-template-card-header">
                          <span className={`things-pill ${isCurrent ? 'things-pill-emerald' : 'things-pill-blue'} things-pill-mono`} style={{ fontSize: '11px' }}>
                            {isCurrent ? '✓ Currently Active' : tmpl.category.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--tb-fog)', fontWeight: 600 }}>
                            {tmpl.statutoryAct}
                          </span>
                        </div>

                        <h3 className="things-template-card-title">{tmpl.name}</h3>
                        <p className="things-template-card-desc">{tmpl.description}</p>

                        <div className="things-template-card-kpis">
                          <span className="things-template-kpi-pill">
                            <strong>{(tmpl.defaultStages || []).length}</strong> Stages
                          </span>
                          <span className="things-template-kpi-pill" style={{ color: '#059669' }}>
                            <strong>{totalDefaultSla}</strong> Days Total SLA
                          </span>
                        </div>

                        <div className="things-template-preview-box">
                          <span className="things-template-preview-label">
                            Default Statutory Pipeline Sequence:
                          </span>
                          {(tmpl.defaultStages || []).map((stg) => (
                            <div key={stg.id} className="things-template-preview-row">
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span className="things-preview-order">{stg.order}</span>
                                <span style={{ fontWeight: 600, color: 'var(--tb-ink)' }}>{stg.name}</span>
                              </div>
                              <span className="things-preview-sla">{stg.defaultSlaDays}d</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSelectTemplate(tmpl.id)}
                        className={`things-btn ${isCurrent ? 'things-btn-outline' : 'things-btn-primary'}`}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        {saving
                          ? 'Instantiating Pipeline...'
                          : isCurrent
                          ? 'Active Template (Re-instantiate →)'
                          : 'Select & Instantiate Template →'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Colophon Footer */}
          <footer className="things-boss-colophon">
            <div>
              <strong>BhoomiNexus</strong> &bull; Bureau of Statutory Scrutiny (BOSS) Workflow Blueprint Selector
            </div>
            <div>
              RFCTLARR Act 2013 Statutory Compliance Registry &bull; Gazette Seal Verified
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // =========================================================================
  // WORKBENCH VIEW (When workflow instance is instantiated & editable)
  // =========================================================================
  const cumulativeSlaDays = (workflow.stages || []).reduce((sum, s) => sum + s.slaDays, 0);
  const distinctDepartmentsCount = new Set((workflow.stages || []).map((s) => s.department)).size;

  return (
    <div className="things-boss-dashboard">
      <div className="things-boss-inner">
        {/* 1. Breadcrumb Bar */}
        <nav className="things-boss-breadcrumb" aria-label="Breadcrumb">
          <Link to="/boss/dashboard" className="things-boss-breadcrumb-link">
            &larr; BOSS Central Worklist
          </Link>
          <span className="things-boss-breadcrumb-sep">/</span>
          <Link to={`/boss/projects/${project.id}`} className="things-boss-breadcrumb-link">
            {project.code}
          </Link>
          <span className="things-boss-breadcrumb-sep">/</span>
          <span className="things-boss-breadcrumb-label">Workflow Configuration</span>
        </nav>

        {/* 2. Masthead Banner */}
        <section className="things-dossier-masthead">
          <div className="things-dossier-info">
            <div className="things-dossier-tag-row">
              <span className="things-pill things-pill-neutral">{project.proponentAuthority}</span>
              <span className="things-pill things-pill-blue things-pill-mono">{project.code}</span>
              <span
                className={`things-pill ${
                  workflow.status === 'ACTIVE' ? 'things-pill-emerald' : 'things-pill-blue'
                }`}
              >
                {workflow.status === 'ACTIVE' ? 'PIPELINE ACTIVE' : 'CONFIGURATION DRAFT'}
              </span>
              <span className="things-pill things-pill-neutral things-pill-mono">
                Template: {workflow.templateName}
              </span>
            </div>
            <h1 className="things-dossier-title">Statutory Project Workflow Configuration</h1>
            <p className="things-dossier-subtitle">
              {project.title} &mdash; Customize statutory scrutiny stages, adjust binding SLAs, assign competent field authorities, and operationalize the acquisition sequence.
            </p>
          </div>

          <div className="things-dossier-actions">
            <Link to={`/boss/projects/${project.id}`} className="things-btn things-btn-outline">
              &larr; Back to Dossier
            </Link>
            {workflow.status !== 'ACTIVE' && (
              <button
                type="button"
                onClick={() => setIsSelectingTemplate(true)}
                className="things-btn things-btn-outline"
                title="Switch to another master template"
              >
                ↻ Switch Template
              </button>
            )}
            {workflow.status !== 'ACTIVE' && (
              <button
                type="button"
                onClick={handleOpenAddStage}
                className="things-btn things-btn-outline"
              >
                + Add Stage
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handleActivateWorkflow}
              className="things-btn things-btn-success"
            >
              {saving
                ? 'Activating Pipeline...'
                : workflow.status === 'ACTIVE'
                ? '✓ Workflow Active — Return to Project →'
                : 'Activate Sovereign Workflow →'}
            </button>
          </div>
        </section>

        {/* 3. Broadsheet Telemetry KPIs */}
        <section className="things-dossier-kpi-grid">
          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">Determined Land Cadastre</span>
            <div className="things-dossier-kpi-value" style={{ color: 'var(--tb-signal-blue)' }}>
              {project.selectedParcelsCount || 0}
              <span className="things-dossier-kpi-unit">Parcels</span>
            </div>
            <span className="things-dossier-kpi-sub">
              {(project.confirmedAreaAcres ?? project.requestedAreaAcres ?? 0).toLocaleString()} Acres Persistent Set
            </span>
          </div>

          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">Pipeline Sequence</span>
            <div className="things-dossier-kpi-value">
              {(workflow.stages || []).length}
              <span className="things-dossier-kpi-unit">Stages</span>
            </div>
            <span className="things-dossier-kpi-sub">Sequential Approval Gates</span>
          </div>

          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">Cumulative Statutory SLA</span>
            <div className="things-dossier-kpi-value" style={{ color: '#059669' }}>
              {cumulativeSlaDays}
              <span className="things-dossier-kpi-unit">Days</span>
            </div>
            <span className="things-dossier-kpi-sub">Total Clock for Gazette Issuance</span>
          </div>

          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">Participating Agencies</span>
            <div className="things-dossier-kpi-value">
              {distinctDepartmentsCount}
              <span className="things-dossier-kpi-unit">Depts</span>
            </div>
            <span className="things-dossier-kpi-sub">Sovereign Authorities Assigned</span>
          </div>
        </section>

        {/* 4. Interactive Broadsheet Pipeline Canvas */}
        <section className="things-pipeline-stages">
          {(workflow.stages || []).map((stage, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === (workflow.stages || []).length - 1;

            return (
              <div key={stage.id} className="things-stage-card">
                {/* Stage Header */}
                <div className="things-stage-card-header">
                  <div className="things-stage-order-box">
                    <span className="things-stage-order-num">{stage.order.toString().padStart(2, '0')}</span>
                    <div className="things-stage-title-group">
                      <h4 className="things-stage-title">{stage.name}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--tb-fog)' }}>{stage.department}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* BOSS Action: Set SLA (Direct Inline Stepper) */}
                    <div className="things-sla-stepper" title="Adjust statutory SLA days">
                      <button
                        type="button"
                        onClick={() => handleDirectUpdateSla(stage.id, stage.slaDays - 1)}
                        className="things-btn-stepper"
                        disabled={workflow.status === 'ACTIVE'}
                      >
                        &minus;
                      </button>
                      <span className="things-sla-val">{stage.slaDays}</span>
                      <span className="things-sla-unit">Days SLA</span>
                      <button
                        type="button"
                        onClick={() => handleDirectUpdateSla(stage.id, stage.slaDays + 1)}
                        className="things-btn-stepper"
                        disabled={workflow.status === 'ACTIVE'}
                      >
                        &#43;
                      </button>
                    </div>

                    {stage.isMandatory && (
                      <span className="things-pill things-pill-neutral things-pill-mono" style={{ fontSize: '10.5px' }}>
                        MANDATORY
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage Narrative Scope */}
                <p className="things-stage-desc">{stage.description}</p>

                {/* Required Documents Checklist */}
                {stage.requiredDocuments && stage.requiredDocuments.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--tb-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Statutory Deliverables:
                    </span>
                    {stage.requiredDocuments?.map((doc, dIdx) => (
                      <span key={dIdx} className="things-deliverable-chip">
                        <span>&bull; {doc}</span>
                        {workflow.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDocFromStage(stage.id, doc);
                            }}
                            className="things-deliverable-remove"
                            title={`Remove ${doc}`}
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* BOSS Action: Assign Officer (Direct Inline Selector Strip) */}
                <div className="things-officer-strip">
                  <div className="things-officer-avatar">🏛️</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tb-ink)' }}>
                        {stage.assignedOfficer?.name ?? 'Unassigned'}
                      </span>
                      {stage.assignedOfficer?.cadre && (
                        <span className="things-pill things-pill-neutral things-pill-mono" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                          {stage.assignedOfficer?.cadre}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--tb-fog)' }}>
                      {stage.assignedOfficer?.designation ?? 'Pending'} &bull; {stage.assignedOfficer?.department ?? stage.department}
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--tb-ash)' }}>
                      {stage.assignedOfficer?.email} &bull; {stage.assignedOfficer?.officeLocation}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px' }}>
                    <label className="things-input-label" style={{ margin: 0, fontSize: '11.5px' }}>
                      Assign Officer:
                    </label>
                    <select
                      value={stage.assignedOfficer?.id ?? ''}
                      onChange={(e) => handleDirectAssignOfficer(stage.id, e.target.value)}
                      disabled={workflow.status === 'ACTIVE'}
                      className="things-select"
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                      title="Directly reassign competent officer"
                    >
                      {!stage.assignedOfficer?.id && (
                        <option value="" disabled>-- Select Competent Officer --</option>
                      )}
                      {officers.length > 0 ? (
                        officers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} &mdash; {off.designation.split('&')[0].trim()}
                          </option>
                        ))
                      ) : (
                        <option value={stage.assignedOfficer?.id ?? ''}>
                          {stage.assignedOfficer?.name ?? 'Unassigned'} &mdash; {stage.assignedOfficer?.designation ?? 'Pending'}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Stage Controls: Reorder, Add Document, Remove */}
                {workflow.status !== 'ACTIVE' && (
                  <div className="things-stage-card-footer">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMoveUp(idx)}
                        className="things-btn things-btn-outline things-btn-sm"
                        title="Move stage earlier in sequence"
                      >
                        &uarr; Move Up
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMoveDown(idx)}
                        className="things-btn things-btn-outline things-btn-sm"
                        title="Move stage later in sequence"
                      >
                        &darr; Move Down
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenAddDocModal(stage)}
                        className="things-btn things-btn-outline things-btn-sm"
                        title="Attach documents available for this project to this scrutiny stage"
                      >
                        + Add Document
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(stage.id)}
                        className="things-btn things-btn-outline-red things-btn-sm"
                      >
                        ✕ Remove Stage
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Dotted Add Stage Block at bottom of pipeline */}
          {workflow.status !== 'ACTIVE' && (
            <button
              type="button"
              onClick={handleOpenAddStage}
              className="things-btn-add-stage-dashed"
            >
              + Add Another Statutory Scrutiny Stage to Sequence
            </button>
          )}
        </section>

        {/* Colophon Footer */}
        <footer className="things-boss-colophon">
          <div>
            <strong>BhoomiNexus</strong> &bull; Bureau of Statutory Scrutiny (BOSS) Workflow Configuration
          </div>
          <div>
            RFCTLARR Act 2013 Statutory Compliance Registry &bull; Gazette Seal Verified
          </div>
        </footer>
      </div>

      {/* Small Window / Modal: Documents Available for Project (BOSS Action: Add Document) */}
      {docModalStage && (
        <div className="things-modal-backdrop" onClick={() => setDocModalStage(null)}>
          <div
            className="things-modal-card things-vault-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px' }}
          >
            <div className="things-modal-header" style={{ paddingBottom: '12px' }}>
              <div>
                <span className="things-pill things-pill-blue things-pill-mono" style={{ marginBottom: '6px' }}>
                  Statutory Deliverables Vault
                </span>
                <h3 className="things-modal-title">
                  Available Documents &mdash; {project?.code || 'Docket'}
                </h3>
                <p className="things-modal-prose" style={{ marginTop: '4px' }}>
                  Attach statutory documents as mandatory deliverables for{' '}
                  <strong>
                    Stage {docModalStage.order}: {docModalStage.name}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocModalStage(null)}
                className="things-modal-close"
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Currently Attached Deliverables */}
            <div style={{ padding: '12px 14px', backgroundColor: '#fafbfc', border: '1px solid var(--tb-hairline)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tb-fog)' }}>
                  Currently Attached Deliverables ({docModalStage.requiredDocuments?.length || 0}):
                </span>
                <span className="things-pill things-pill-emerald things-pill-mono" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  {docModalStage.requiredDocuments?.length || 0} MANDATED
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(docModalStage.requiredDocuments || []).length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--tb-fog)', fontStyle: 'italic' }}>
                    No deliverables attached yet. Click &ldquo;+ Attach&rdquo; on any document below or select a preset.
                  </span>
                ) : (
                  docModalStage.requiredDocuments?.map((doc, idx) => (
                    <span
                      key={idx}
                      className="things-deliverable-chip"
                      style={{
                        backgroundColor: '#ecfdf5',
                        borderColor: '#a7f3d0',
                        color: '#065f46',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                      }}
                    >
                      <span>✓ {doc}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAttachDoc(doc)}
                        className="things-deliverable-remove"
                        title={`Detach ${doc} from stage`}
                      >
                        &times;
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Documents List & Search Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tb-fog)' }}>
                  Project Documents Vault ({availableProjectDocs.length})
                </span>
                <div style={{ width: '220px' }}>
                  <input
                    type="text"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="things-input"
                    style={{ padding: '4px 10px', fontSize: '12px', height: '28px' }}
                  />
                </div>
              </div>

              <div className="things-vault-doc-list">
                {loadingProjectDocs ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--tb-fog)', fontSize: '13px' }}>
                    Loading available project documents...
                  </div>
                ) : availableProjectDocs.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--tb-fog)', fontSize: '13px' }}>
                    No uploaded documents found for this project docket.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {availableProjectDocs
                      .filter((doc) => {
                        if (!docSearchQuery.trim()) return true;
                        const q = docSearchQuery.toLowerCase();
                        return (
                          doc.title.toLowerCase().includes(q) ||
                          (doc.type && doc.type.toLowerCase().includes(q))
                        );
                      })
                      .map((doc) => {
                        const isAttached = (docModalStage.requiredDocuments || []).some(
                          (d) => isDeliverableMatched(d, doc.title)
                        );
                        return (
                          <div
                            key={doc.id}
                            className="things-vault-row"
                            style={{
                              backgroundColor: isAttached ? '#f0fdf4' : '#ffffff',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, paddingRight: '12px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '17px',
                                  flexShrink: 0,
                                  backgroundColor: isAttached ? '#dcfce7' : '#f1f5f9',
                                  border: isAttached ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                }}
                              >
                                {doc.type === 'ALIGNMENT_GEOJSON'
                                  ? '🗺️'
                                  : doc.type === 'LAND_RECORD'
                                  ? '📜'
                                  : doc.type === 'GAZETTE_DRAFT'
                                  ? '⚖️'
                                  : doc.type === 'SIA_CLEARANCE'
                                  ? '🛡️'
                                  : '📄'}
                              </div>
                              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-ink)', wordBreak: 'break-word' }}>
                                    {doc.title}
                                  </span>
                                  {doc.type && (
                                    <span className="things-pill things-pill-neutral things-pill-mono" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                      {doc.type}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--tb-fog)', marginTop: '2px' }}>
                                  {doc.size && <span>{doc.size}</span>}
                                  {doc.hash && (
                                    <>
                                      <span>&bull;</span>
                                      <span style={{ fontFamily: 'monospace' }}>{doc.hash.slice(0, 16)}...</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isAttached ? (
                                <>
                                  <span className="things-pill things-pill-emerald things-pill-mono" style={{ fontSize: '10px', padding: '2px 7px' }}>
                                    ✓ Attached
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttachDoc(doc.title)}
                                    className="things-btn things-btn-outline-red things-btn-sm"
                                    title="Click to detach from stage"
                                    style={{ padding: '3px 9px', fontSize: '11.5px' }}
                                  >
                                    ✕ Detach
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleAttachDoc(doc.title)}
                                  className="things-btn things-btn-primary things-btn-sm"
                                  title="Attach to stage deliverables"
                                  style={{ padding: '4px 12px', fontSize: '12px' }}
                                >
                                  + Attach
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Suggestions & Custom Deliverable Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span className="things-input-label" style={{ fontSize: '11.5px', marginBottom: '6px', display: 'block' }}>
                  Quick Add Statutory Presets:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    'Land Schedule',
                    'Cadastral Survey Map',
                    'Khasra/Khatauni',
                    'SIA Clearance Report',
                    'State Environmental NOC',
                    'Joint Measurement Survey Log',
                    'Valuation Ledger Extract',
                  ].map((sug) => {
                    const isAdded = (docModalStage.requiredDocuments || []).some(
                      (d) => isDeliverableMatched(d, sug)
                    );
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleToggleAttachDoc(sug)}
                        className={`things-preset-chip ${isAdded ? 'things-preset-chip-active' : ''}`}
                        title={isAdded ? `Click to detach ${sug}` : `Click to attach ${sug}`}
                      >
                        {isAdded ? '✓ ' : '+ '}
                        {sug}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="things-input-label" style={{ fontSize: '11.5px', marginBottom: '6px', display: 'block' }}>
                  Or Add Custom Deliverable Name:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customDocInput}
                    onChange={(e) => setCustomDocInput(e.target.value)}
                    placeholder="e.g. Valuation Ledger Extract, Form 11..."
                    className="things-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomDeliverable();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDeliverable}
                    className="things-btn things-btn-outline"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="things-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--tb-fog)' }}>
                Deliverables update automatically in pipeline configuration
              </span>
              <button
                type="button"
                onClick={() => setDocModalStage(null)}
                className="things-btn things-btn-primary"
              >
                Done &bull; Close Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Edit / Add Stage Parameters (BOSS Action: Modify Stage & Add Stage) */}
      {editingStage && (
        <div className="things-modal-backdrop" onClick={() => setEditingStage(null)}>
          <div className="things-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="things-modal-header">
              <h3 className="things-modal-title">
                {isAddingStage ? 'Add Statutory Scrutiny Stage' : `Modify Stage ${editingStage.order}: ${editingStage.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStage(null)}
                className="things-modal-close"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveStageModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="things-input-label">Stage Name *</label>
                <input
                  type="text"
                  required
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                  className="things-input"
                  placeholder="e.g. Environmental Clearance & Joint Measurement"
                />
              </div>

              <div>
                <label className="things-input-label">Departmental Scope &amp; Legal Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editingStage.description}
                  onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                  className="things-textarea"
                  placeholder="Specify legal objectives, field procedures, and statutory mandates..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="things-input-label">Assigned Department</label>
                  <input
                    type="text"
                    readOnly
                    value={editingStage.department}
                    className="things-input"
                    style={{ backgroundColor: '#fafbfc', cursor: 'not-allowed' }}
                    title="Department is tied to designated officer"
                  />
                </div>

                <div>
                  <label className="things-input-label">Binding SLA (Days) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={editingStage.slaDays}
                    onChange={(e) => setEditingStage({ ...editingStage, slaDays: Number(e.target.value) })}
                    className="things-input"
                  />
                </div>
              </div>

              <div>
                <label className="things-input-label">Designated Competent Officer *</label>
                <select
                  value={editingStage.assignedOfficer?.id ?? ''}
                  onChange={(e) => {
                    const selected = officers.find((o) => o.id === e.target.value);
                    if (selected) {
                      setEditingStage({
                        ...editingStage,
                        assignedOfficer: selected,
                        assignedRole: selected.designation,
                        department: selected.department,
                      });
                    }
                  }}
                  className="things-select"
                >
                  {!editingStage.assignedOfficer?.id && (
                    <option value="" disabled>-- Select Competent Officer --</option>
                  )}
                  {officers.length > 0 ? (
                    officers.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name} &mdash; {off.designation} ({off.department})
                      </option>
                    ))
                  ) : (
                    <option value={editingStage.assignedOfficer?.id ?? ''}>
                      {editingStage.assignedOfficer?.name ?? 'Unassigned'} &mdash; {editingStage.assignedOfficer?.designation ?? 'Pending'}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="things-input-label">Required Statutory Deliverables</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={docInputText}
                    onChange={(e) => setDocInputText(e.target.value)}
                    placeholder="e.g. Spot Inspection Log, Title Extract..."
                    className="things-input"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDocument();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDocument()}
                    className="things-btn things-btn-outline"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add Doc
                  </button>
                </div>

                {/* Quick Add Suggestions */}
                <div style={{ marginBottom: '10px' }}>
                  <span className="things-input-hint" style={{ marginBottom: '6px', fontWeight: 600 }}>
                    Suggested Statutory Documents (Click to add):
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      'Spot Inspection Log',
                      'Jamabandi / RoR Extract',
                      '30-Year Non-Encumbrance Certificate',
                      'Joint Measurement Survey (JMS) Schedule',
                      'Tree & Structure Valuation Schedule',
                      'Collector Scrutiny Memo',
                    ].map((sug) => {
                      const isAdded = (editingStage.requiredDocuments || []).includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddDocument(sug)}
                          className="things-preset-chip"
                          style={{ textDecoration: isAdded ? 'line-through' : 'none', opacity: isAdded ? 0.5 : 1 }}
                        >
                          + {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '32px' }}>
                  {(editingStage.requiredDocuments || []).length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--tb-fog)', fontStyle: 'italic' }}>
                      No deliverables added yet. Type above and click "+ Add Doc" or choose a suggestion.
                    </span>
                  ) : (
                    (editingStage.requiredDocuments || []).map((doc, dIdx) => (
                      <span
                        key={dIdx}
                        className="things-deliverable-chip"
                      >
                        <span>{doc}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(dIdx)}
                          className="things-deliverable-remove"
                          title="Remove document"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="things-modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="things-btn things-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="things-btn things-btn-primary"
                >
                  {isAddingStage ? 'Add Stage to Sequence →' : 'Save Stage Parameters →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BossWorkflowConfigPage;
