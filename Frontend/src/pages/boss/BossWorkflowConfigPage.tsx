import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { bossService } from '../../services/api/boss.service';
import { workflowService } from '../../services/api/workflow.service';
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
    const updatedStages = workflow.stages.map((s) =>
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

    const updatedStages = workflow.stages.map((s) =>
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

    // Recalculate order numbers
    newStages.forEach((s, idx) => {
      s.order = idx + 1;
    });

    const updated: ProjectWorkflowInstance = { ...workflow, stages: newStages };
    setWorkflow(updated);
    workflowService.reorderWorkflow(workflow.projectId, newStages.map((s) => s.id));
  };

  // 4. REORDER STAGE (BOSS Action: Reorder Stage - Move Down)
  const handleMoveDown = (index: number) => {
    if (!workflow || index === workflow.stages.length - 1) return;
    const newStages = [...workflow.stages];
    const temp = newStages[index + 1];
    newStages[index + 1] = newStages[index];
    newStages[index] = temp;

    // Recalculate order numbers
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
    if (workflow.stages.length <= 1) {
      alert('Statutory Governance Rule: An acquisition workflow must contain at least one scrutiny stage.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this scrutiny stage from the sequence?')) {
      return;
    }
    const newStages = workflow.stages.filter((s) => s.id !== stageId);
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
  const handleSaveStageModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow || !editingStage) return;

    let updatedStages: WorkflowStageInstance[];
    if (isAddingStage) {
      const newOrder = workflow.stages.length + 1;
      const newStage: WorkflowStageInstance = {
        ...editingStage,
        id: `stg-custom-${Date.now()}`,
        order: newOrder,
        status: 'PENDING',
      };
      updatedStages = [...workflow.stages, newStage];
    } else {
      updatedStages = workflow.stages.map((s) =>
        s.id === editingStage.id ? editingStage : s
      );
    }

    const updatedWorkflow: ProjectWorkflowInstance = { ...workflow, stages: updatedStages };
    setWorkflow(updatedWorkflow);
    if (isAddingStage) {
      const newStage = updatedStages[updatedStages.length - 1];
      workflowService.addStage(workflow.projectId, newStage);
    } else {
      workflowService.updateStage(workflow.projectId, editingStage.id, editingStage);
    }
    setEditingStage(null);
    setIsAddingStage(false);
  };

  // Document tags management in modal
  const handleAddDocument = (customDocName?: string) => {
    if (!editingStage) return;

    // Check if customDocName is provided, or text from input
    let docToAdd = (typeof customDocName === 'string' ? customDocName : docInputText).trim();

    // If still empty when clicking "+ Add Doc", generate a meaningful statutory default name
    if (!docToAdd) {
      const currentCount = (editingStage.requiredDocuments || []).length + 1;
      docToAdd = `Statutory Deliverable Document ${currentCount}`;
    }

    const currentDocs = Array.isArray(editingStage.requiredDocuments)
      ? editingStage.requiredDocuments
      : [];

    // Prevent duplicate entries
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

  // ACTIVATE WORKFLOW & REDIRECT TO MAIN PROJECT DOSSIER
  const handleActivateWorkflow = async () => {
    if (!projectId || !workflow) return;
    try {
      setSaving(true);
      if (workflow.status !== 'ACTIVATED') {
        await workflowService.activateWorkflow(projectId);
      }
      navigate(`/boss/projects/${projectId}`);
    } catch (err: any) {
      console.error('Failed to activate workflow', err);
      alert(`Activation failed: ${err?.message || 'Please check stage parameters.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="boss-page-container">
        <div className="boss-loading-placeholder">
          <span>Loading Sovereign Statutory Workflow Engine...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="boss-page-container">
        <div className="boss-error-box">
          <h2>Project Record Not Found</h2>
          <p>The requested project identifier could not be retrieved from the central register.</p>
          <Link to="/boss/dashboard" className="btn-cta-blue" style={{ marginTop: '14px', color: '#ffffff' }}>
            &larr; Return to BOSS Worklist
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PROVISION 1: TEMPLATE SELECTION VIEW (When uninstantiated or switching template)
  // =========================================================================
  if (!workflow || isSelectingTemplate) {
    return (
      <div className="boss-page-container">
        {/* Breadcrumb Bar */}
        <div className="boss-breadcrumb-bar">
          <Link to="/boss/dashboard" className="boss-breadcrumb-link">
            &larr; BOSS Central Worklist
          </Link>
          <span className="boss-breadcrumb-sep">/</span>
          <Link to={`/boss/projects/${project.id}`} className="boss-breadcrumb-link">
            {project.code}
          </Link>
          <span className="boss-breadcrumb-sep">/</span>
          <span className="boss-breadcrumb-current">Select Master Workflow Template</span>
        </div>

        {/* Template Chooser Masthead */}
        <div className="template-chooser-view">
          <header className="boss-executive-masthead">
            <div className="masthead-gazette-tagline">
              <span>SOVEREIGN WORKFLOW ENGINE &bull; MASTER TEMPLATES SELECTION</span>
              <span className="masthead-bulletin">SECTION 2(1) RFCTLARR ACT 2013</span>
            </div>

            <div className="masthead-main-row">
              <div className="masthead-brand-block">
                <div className="masthead-symbol-row">
                  <span className="editorial-tag">{project.proponentAuthority}</span>
                  <span className="boss-code-tag">{project.code}</span>
                  <span className="boss-status-tag">PARCELS CONFIRMED</span>
                </div>
                <h1 className="masthead-headline" style={{ fontSize: '28px' }}>
                  Select Sovereign Master Workflow Template
                </h1>
                <p className="masthead-thesis">
                  Choose an authorized statutory master template to instantiate the field scrutiny pipeline for <strong>{project.title}</strong> ({project.district}, {project.state} &bull; {project.confirmedAreaAcres || project.requestedAreaAcres} Acres Determined).
                </p>
              </div>

              <div className="masthead-stamp-box">
                <div className="stamp-header">
                  <span className="status-dot-pulse" />
                  <span>ACTION REQUIRED: SELECT TEMPLATE</span>
                </div>
                <div className="stamp-details">
                  <div className="stamp-row">
                    <span className="stamp-label">Jurisdiction:</span>
                    <span className="stamp-val">{project.district}, {project.state}</span>
                  </div>
                  <div className="stamp-row">
                    <span className="stamp-label">Determined Land:</span>
                    <span className="stamp-val font-mono">{project.confirmedAreaAcres || project.requestedAreaAcres} Acres</span>
                  </div>
                  <div className="stamp-row">
                    <span className="stamp-label">Available Templates:</span>
                    <span className="stamp-val font-mono">{templates.length} Master Blueprints</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="hairline-fullwidth" />

          {/* Master Template Selection Cards Grid */}
          <section>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-copernicus)', fontSize: '20px', margin: '0 0 4px', color: 'var(--color-carbon-ink)' }}>
                  Statutory Master Templates
                </h3>
                <p style={{ fontFamily: 'var(--font-body-serif)', fontSize: '13.5px', margin: 0, color: 'var(--color-fossil-gray)' }}>
                  The master template is preserved as a sovereign seed; instantiating it creates a project-specific workflow instance that you can fully customize.
                </p>
              </div>
              {workflow && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectingTemplate(false);
                    setSearchParams({});
                  }}
                  className="btn-cta-outline"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  &larr; Return to Current Workbench ({workflow.templateName})
                </button>
              )}
            </div>

            {templates.length === 0 ? (
              <div className="boss-empty-ledger" style={{ padding: '36px', textAlign: 'center', background: '#faf7f6', border: '1px solid rgba(0,0,0,0.12)' }}>
                <h4 style={{ fontFamily: 'var(--font-copernicus)', fontSize: '16px', margin: '0 0 6px', color: '#000000' }}>
                  No Master Workflow Templates Registered
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-fossil-gray)' }}>
                  Master templates will appear here once seeded or published by the backend via <code>POST /api/v1/workflow-templates</code>.
                </p>
              </div>
            ) : (
              <div className="template-grid-3col">
                {templates.map((tmpl) => {
                  const isPrototypeSeed = tmpl.id === 'tmpl-prototype-la';
                  const isCurrent = workflow?.templateId === tmpl.id;
                  const totalDefaultSla = tmpl.defaultStages.reduce((s, stg) => s + stg.defaultSlaDays, 0);

                  return (
                    <div
                      key={tmpl.id}
                      className={`master-template-card ${isCurrent ? 'recommended' : isPrototypeSeed ? 'recommended' : ''}`}
                    >
                    <div>
                      <div className="template-card-header">
                        <span className="template-card-badge">
                          {isCurrent ? 'Currently Active' : isPrototypeSeed ? 'Phase 5 Seed Template' : tmpl.category.replace(/_/g, ' ')}
                        </span>
                        <span className="template-card-act">{tmpl.statutoryAct}</span>
                      </div>

                      <h3 className="template-card-title">{tmpl.name}</h3>
                      <p className="template-card-desc">{tmpl.description}</p>

                      <div className="template-card-kpis">
                        <span className="template-kpi-pill">
                          <strong>{tmpl.defaultStages.length}</strong> Statutory Stages
                        </span>
                        <span className="template-kpi-pill">
                          <strong>{totalDefaultSla}</strong> Days Total SLA
                        </span>
                      </div>

                      <div className="template-stages-preview">
                        <span style={{ fontFamily: 'var(--font-copernicus)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-fossil-gray)', fontWeight: 700, marginBottom: '4px' }}>
                          Default Pipeline Sequence:
                        </span>
                        {tmpl.defaultStages.map((stg) => (
                          <div key={stg.id} className="preview-stage-row">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="preview-order-pill">{stg.order}</span>
                              <span style={{ fontWeight: 600, color: 'var(--color-carbon-ink)' }}>{stg.name}</span>
                            </div>
                            <span className="preview-sla-tag">{stg.defaultSlaDays}d</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className="btn-cta-blue"
                      style={{ width: '100%', padding: '12px 18px', fontSize: '13.5px', color: '#ffffff', textAlign: 'center', justifyContent: 'center' }}
                    >
                      {saving
                        ? 'Instantiating Pipeline...'
                        : isCurrent
                        ? 'Active Template (Re-instantiate \u2192)'
                        : isPrototypeSeed
                        ? 'Select & Instantiate Seed Template \u2192'
                        : 'Select & Instantiate Template \u2192'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

  // =========================================================================
  // WORKBENCH VIEW (When workflow instance is instantiated & editable)
  // =========================================================================
  const cumulativeSlaDays = workflow.stages.reduce((sum, s) => sum + s.slaDays, 0);
  const distinctDepartmentsCount = new Set(workflow.stages.map((s) => s.department)).size;

  return (
    <div className="boss-page-container">
      {/* 1. Breadcrumb Bar */}
      <div className="boss-breadcrumb-bar">
        <Link to="/boss/dashboard" className="boss-breadcrumb-link">
          &larr; BOSS Central Worklist
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <Link to={`/boss/projects/${project.id}`} className="boss-breadcrumb-link">
          {project.code}
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-current">Workflow Configuration</span>
      </div>

      {/* 2. Executive Gazette Masthead */}
      <header className="boss-executive-masthead">
        <div className="masthead-gazette-tagline">
          <span>SOVEREIGN WORKFLOW ENGINE &bull; EXECUTIVE GAZETTE PIPELINE</span>
          <span className="masthead-bulletin">PHASE 5 WORKBENCH &bull; RFCTLARR 2013</span>
        </div>

        <div className="masthead-main-row">
          <div className="masthead-brand-block">
            <div className="masthead-symbol-row">
              <span className="editorial-tag">{project.proponentAuthority}</span>
              <span className="boss-code-tag">{project.code}</span>
              <span className="boss-status-tag">
                {workflow.status === 'ACTIVATED' ? 'WORKFLOW ACTIVE' : 'PARCELS CONFIRMED'}
              </span>
            </div>
            <h1 className="masthead-headline" style={{ fontSize: '28px' }}>
              Statutory Project Workflow Configuration
            </h1>
            <p className="masthead-thesis">
              {project.title} &mdash; Customize statutory scrutiny stages, adjust binding SLAs, assign competent field authorities, and operationalize the acquisition sequence.
            </p>
          </div>

          <div className="masthead-stamp-box">
            <div className="stamp-header">
              <span className="status-dot-pulse" />
              <span>Pipeline Status: {workflow.status === 'ACTIVATED' ? 'ACTIVE PIPELINE' : 'CONFIGURATION DRAFT'}</span>
            </div>
            <div className="stamp-details">
              <div className="stamp-row">
                <span className="stamp-label">Jurisdiction:</span>
                <span className="stamp-val">{project.district}, {project.state}</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Determined Land:</span>
                <span className="stamp-val font-mono">{project.confirmedAreaAcres || project.requestedAreaAcres} Acres</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Active Template:</span>
                <span className="stamp-val">{workflow.templateName}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="hairline-fullwidth" style={{ margin: '20px 0' }} />

      {/* 3. Broadsheet Telemetry KPIs */}
      <section className="boss-project-kpi-bar">
        <div className="boss-kpi-item">
          <span className="kpi-label">Determined Land Cadastre</span>
          <div className="kpi-value text-signal-blue">
            <span>{project.selectedParcelsCount || 0}</span>
            <span className="kpi-unit">Parcels</span>
          </div>
          <span className="kpi-sub">
            {project.confirmedAreaAcres ?? project.requestedAreaAcres} Acres Persistent Set
          </span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Pipeline Sequence</span>
          <div className="kpi-value">
            <span>{workflow.stages.length}</span>
            <span className="kpi-unit">Stages</span>
          </div>
          <span className="kpi-sub">Sequential Approval Gates</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Cumulative Statutory SLA</span>
          <div className="kpi-value text-emerald">
            <span>{cumulativeSlaDays}</span>
            <span className="kpi-unit">Days</span>
          </div>
          <span className="kpi-sub">Total Clock for Gazette Issuance</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Participating Agencies</span>
          <div className="kpi-value">
            <span>{distinctDepartmentsCount}</span>
            <span className="kpi-unit">Depts</span>
          </div>
          <span className="kpi-sub">Sovereign Authorities Assigned</span>
        </div>
      </section>

      <div className="hairline-fullwidth" style={{ margin: '20px 0 24px' }} />

      {/* 4. Action Bar: Template Chooser Switcher, Add Stage, and Activation */}
      <section className="template-selector-bar">
        <div className="selector-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="selector-label" style={{ margin: 0 }}>Template:</span>
          <span style={{ fontFamily: 'var(--font-copernicus)', fontSize: '15px', fontWeight: 700, color: 'var(--color-carbon-ink)' }}>
            {workflow.templateName}
          </span>
          <button
            type="button"
            onClick={() => setIsSelectingTemplate(true)}
            className="btn-cta-outline"
            style={{ fontSize: '12px', padding: '5px 12px' }}
            title="Redirect to master templates selection page"
          >
            &#8635; Choose / Switch Master Template
          </button>
        </div>

        <div className="selector-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleOpenAddStage}
            className="btn-cta-outline"
            style={{ fontSize: '13px', padding: '7px 16px' }}
          >
            + Add Statutory Stage
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleActivateWorkflow}
            className="btn-cta-blue"
            style={{ fontSize: '13px', padding: '8px 22px', color: '#ffffff' }}
          >
            {saving
              ? 'Activating Pipeline...'
              : workflow.status === 'ACTIVATED'
              ? '\u2713 Workflow Active \u2014 Return to Project \u2192'
              : 'Activate Sovereign Workflow \u2192'}
          </button>
        </div>
      </section>

      {/* 5. Interactive Broadsheet Pipeline Canvas */}
      <section className="workflow-pipeline-section">
        <div className="pipeline-stages-list">
          {workflow.stages.map((stage, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === workflow.stages.length - 1;

            return (
              <div key={stage.id} className="workflow-stage-card">
                {/* Stage Header */}
                <div className="stage-card-header">
                  <div className="stage-number-block">
                    <span className="stage-order-num">{stage.order.toString().padStart(2, '0')}</span>
                    <div className="stage-title-group">
                      <h4 className="stage-name">{stage.name}</h4>
                      <span className="stage-dept-tag">{stage.department}</span>
                    </div>
                  </div>

                  <div className="stage-meta-badges">
                    {/* BOSS Action: Set SLA (Direct Inline Stepper) */}
                    <div className="stage-sla-stepper" title="Adjust statutory SLA days">
                      <button
                        type="button"
                        onClick={() => handleDirectUpdateSla(stage.id, stage.slaDays - 1)}
                        className="btn-stepper"
                      >
                        &minus;
                      </button>
                      <span className="sla-stepper-val font-mono">{stage.slaDays}</span>
                      <span className="sla-stepper-label">Days SLA</span>
                      <button
                        type="button"
                        onClick={() => handleDirectUpdateSla(stage.id, stage.slaDays + 1)}
                        className="btn-stepper"
                      >
                        &#43;
                      </button>
                    </div>

                    {stage.isMandatory && <span className="mandatory-pill">MANDATORY</span>}
                  </div>
                </div>

                {/* Stage Narrative Scope */}
                <p className="stage-desc">{stage.description}</p>

                {/* Required Documents Checklist */}
                {stage.requiredDocuments && stage.requiredDocuments.length > 0 && (
                  <div className="stage-docs-row">
                    <span className="docs-label">Statutory Deliverables:</span>
                    <div className="docs-tags-wrap">
                      {stage.requiredDocuments.map((doc, dIdx) => (
                        <span key={dIdx} className="doc-deliverable-chip">
                          &bull; {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* BOSS Action: Assign Officer (Direct Inline Selector Strip) */}
                <div className="stage-officer-strip">
                  <div className="officer-avatar-box">&#127963;</div>
                  <div className="officer-meta-info">
                    <div className="officer-name-row">
                      <span className="officer-name">{stage.assignedOfficer.name}</span>
                      <span className="officer-cadre font-mono">{stage.assignedOfficer.cadre}</span>
                    </div>
                    <span className="officer-designation">{stage.assignedOfficer.designation}</span>
                    <div className="officer-contact-row">
                      <span>{stage.assignedOfficer.email}</span>
                      <span>&bull;</span>
                      <span>{stage.assignedOfficer.officeLocation}</span>
                    </div>
                  </div>

                  <div className="officer-reassign-col">
                    <label className="reassign-label">Assign Officer:</label>
                    <select
                      value={stage.assignedOfficer.id}
                      onChange={(e) => handleDirectAssignOfficer(stage.id, e.target.value)}
                      className="inline-officer-select"
                      title="Directly reassign competent officer"
                    >
                      {officers.length > 0 ? (
                        officers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} &mdash; {off.designation.split('&')[0].trim()}
                          </option>
                        ))
                      ) : (
                        <option value={stage.assignedOfficer.id}>
                          {stage.assignedOfficer.name} &mdash; {stage.assignedOfficer.designation}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Stage Controls: Reorder, Modify, Remove */}
                <div className="stage-card-footer">
                  {/* BOSS Action: Reorder Stage */}
                  <div className="reorder-btn-group">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(idx)}
                      className="btn-reorder"
                      title="Move stage earlier in sequence"
                    >
                      &uarr; Move Up
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(idx)}
                      className="btn-reorder"
                      title="Move stage later in sequence"
                    >
                      &darr; Move Down
                    </button>
                  </div>

                  {/* BOSS Actions: Modify Stage & Remove Stage */}
                  <div className="stage-edit-group">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStage({ ...stage });
                        setIsAddingStage(false);
                      }}
                      className="btn-stage-action btn-edit"
                    >
                      &#9998; Modify Stage
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(stage.id)}
                      className="btn-stage-action btn-delete"
                    >
                      &#10005; Remove Stage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dotted Add Stage Block at bottom of pipeline */}
          <button
            type="button"
            onClick={handleOpenAddStage}
            className="btn-add-stage-card"
          >
            &#43; Add Another Statutory Scrutiny Stage to Sequence
          </button>
        </div>
      </section>

      {/* 6. Modal: Edit / Add Stage Parameters (BOSS Action: Modify Stage & Add Stage) */}
      {editingStage && (
        <div className="modal-backdrop-scrim">
          <div className="stage-modal-box">
            <div className="stage-modal-header">
              <h3 className="modal-title">
                {isAddingStage ? 'Add Statutory Scrutiny Stage' : `Modify Stage ${editingStage.order}: ${editingStage.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStage(null)}
                className="modal-close-x"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveStageModal} className="stage-modal-form">
              <div>
                <label className="form-field-label">Stage Name *</label>
                <input
                  type="text"
                  required
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                  className="form-text-input"
                  placeholder="e.g. Environmental Clearance & Joint Measurement"
                />
              </div>

              <div>
                <label className="form-field-label">Departmental Scope &amp; Legal Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editingStage.description}
                  onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                  className="form-textarea-input"
                  placeholder="Specify legal objectives, field procedures, and statutory mandates..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-field-label">Assigned Department</label>
                  <input
                    type="text"
                    readOnly
                    value={editingStage.department}
                    className="form-text-input"
                    style={{ backgroundColor: '#f1e9e7', cursor: 'not-allowed' }}
                    title="Department is tied to designated officer"
                  />
                </div>

                <div>
                  <label className="form-field-label">Binding SLA (Days) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={editingStage.slaDays}
                    onChange={(e) => setEditingStage({ ...editingStage, slaDays: Number(e.target.value) })}
                    className="form-text-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-field-label">Designated Competent Officer *</label>
                <select
                  value={editingStage.assignedOfficer.id}
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
                  className="form-select-input"
                >
                  {officers.length > 0 ? (
                    officers.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name} &mdash; {off.designation} ({off.department})
                      </option>
                    ))
                  ) : (
                    <option value={editingStage.assignedOfficer.id}>
                      {editingStage.assignedOfficer.name} &mdash; {editingStage.assignedOfficer.designation}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="form-field-label">Required Statutory Deliverables</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={docInputText}
                    onChange={(e) => setDocInputText(e.target.value)}
                    placeholder="e.g. Spot Inspection Log, Title Extract..."
                    className="form-text-input"
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
                    className="btn-cta-outline"
                    style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                  >
                    + Add Doc
                  </button>
                </div>

                {/* Quick Add Suggestions */}
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-fossil-gray)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Suggested Statutory Documents (Click to add):
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px' }}>
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
                          style={{
                            backgroundColor: isAdded ? '#f1f5f9' : '#ffffff',
                            border: `1px dashed ${isAdded ? '#cbd5e1' : 'rgba(0, 88, 254, 0.4)'}`,
                            color: isAdded ? '#94a3b8' : '#0058fe',
                            fontSize: '11px',
                            padding: '3px 8px',
                            cursor: isAdded ? 'default' : 'pointer',
                            textDecoration: isAdded ? 'line-through' : 'none',
                            fontFamily: 'var(--font-copernicus)',
                            borderRadius: '0px',
                          }}
                        >
                          + {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="docs-tags-wrap" style={{ minHeight: '28px' }}>
                  {(editingStage.requiredDocuments || []).length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>
                      No deliverables added yet. Type above and click "+ Add Doc" or choose a suggestion.
                    </span>
                  ) : (
                    (editingStage.requiredDocuments || []).map((doc, dIdx) => (
                      <span
                        key={dIdx}
                        className="doc-deliverable-chip"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#faf7f6',
                          border: '1px solid rgba(0,0,0,0.2)',
                          padding: '4px 8px',
                        }}
                      >
                        <span style={{ color: 'var(--color-carbon-ink)', fontWeight: 500 }}>{doc}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(dIdx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            fontWeight: 700,
                            padding: '0 2px',
                            lineHeight: 1,
                          }}
                          title="Remove document"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="stage-modal-actions">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
                  className="btn-cta-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-cta-blue"
                  style={{ color: '#ffffff' }}
                >
                  {isAddingStage ? 'Add Stage to Sequence \u2192' : 'Save Stage Parameters \u2192'}
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
