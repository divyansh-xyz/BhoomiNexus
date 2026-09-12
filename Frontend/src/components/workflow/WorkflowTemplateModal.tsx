import React, { useState, useMemo } from 'react';
import type { WorkflowNode } from '../../types/workflowV2.types';
import type { WorkflowTemplate } from '../../types/workflow.types';
import { getContextualTemplatesForNode } from '../../utils/workflowTemplates.utils';

interface WorkflowTemplateModalProps {
  selectedNode: WorkflowNode;
  onApplyTemplate: (templateId: string) => Promise<boolean>;
  onPreviewTemplate: (templateId: string) => Promise<any>;
  onClose: () => void;
  isSaving?: boolean;
}

export const WorkflowTemplateModal: React.FC<WorkflowTemplateModalProps> = ({
  selectedNode,
  onApplyTemplate,
  onPreviewTemplate,
  onClose,
  isSaving = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);

  // Get contextual templates prioritised for this node
  const contextualTemplates = useMemo(() => {
    return getContextualTemplatesForNode(selectedNode);
  }, [selectedNode]);

  // Filter by category if selected
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'ALL') return contextualTemplates;
    return contextualTemplates.filter((t) => t.category === selectedCategory);
  }, [contextualTemplates, selectedCategory]);

  const handlePreview = async (templateId: string) => {
    setPreviewingTemplateId(templateId);
    await onPreviewTemplate(templateId);
  };

  const handleApply = async (templateId: string) => {
    setApplyingTemplateId(templateId);
    try {
      const ok = await onApplyTemplate(templateId);
      if (ok) {
        onClose();
      }
    } finally {
      setApplyingTemplateId(null);
    }
  };

  return (
    <div className="wf-modal-overlay" onClick={onClose}>
      <div
        className="wf-template-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="template-modal-title"
      >
        {/* Header */}
        <div className="wf-template-header">
          <div className="wf-template-header-left">
            <div className="wf-template-badge-row">
              <span className="wf-template-sparkle">✨ REUSABLE STATUTORY FRAGMENTS</span>
              <span className="wf-template-context-pill">
                Context: {selectedNode.name}
              </span>
            </div>
            <h2 id="template-modal-title" className="wf-template-title">
              Contextual Workflow Templates
            </h2>
            <p className="wf-template-subtitle">
              Insert pre-configured statutory workflow sequences directly into the canvas.
              Inserted fragments remain fully editable before activation.
            </p>
          </div>
          <button
            type="button"
            className="wf-template-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="wf-template-category-bar">
          <button
            type="button"
            className={`wf-template-cat-btn ${selectedCategory === 'ALL' ? 'wf-template-cat-btn--active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            All Templates ({contextualTemplates.length})
          </button>
          <button
            type="button"
            className={`wf-template-cat-btn ${selectedCategory === 'LINEAR_HIGHWAY' ? 'wf-template-cat-btn--active' : ''}`}
            onClick={() => setSelectedCategory('LINEAR_HIGHWAY')}
          >
            Highway Development
          </button>
          <button
            type="button"
            className={`wf-template-cat-btn ${selectedCategory === 'DEFENSE_CORRIDOR' ? 'wf-template-cat-btn--active' : ''}`}
            onClick={() => setSelectedCategory('DEFENSE_CORRIDOR')}
          >
            Army Acquisition
          </button>
          <button
            type="button"
            className={`wf-template-cat-btn ${selectedCategory === 'TRIBAL_SCHEDULE_V' ? 'wf-template-cat-btn--active' : ''}`}
            onClick={() => setSelectedCategory('TRIBAL_SCHEDULE_V')}
          >
            Tribal Area (PESA)
          </button>
          <button
            type="button"
            className={`wf-template-cat-btn ${selectedCategory === 'COMPENSATION_STANDARD' ? 'wf-template-cat-btn--active' : ''}`}
            onClick={() => setSelectedCategory('COMPENSATION_STANDARD')}
          >
            Compensation Standard
          </button>
          <button
            type="button"
            className={`wf-template-cat-btn ${selectedCategory === 'POSSESSION_STANDARD' ? 'wf-template-cat-btn--active' : ''}`}
            onClick={() => setSelectedCategory('POSSESSION_STANDARD')}
          >
            Possession Standard
          </button>
        </div>

        {/* Template List */}
        <div className="wf-template-list">
          {filteredTemplates.map((template) => {
            const isPreviewing = previewingTemplateId === template.id;
            const isApplying = applyingTemplateId === template.id;
            const fragmentNodes = template.fragmentNodes || [];

            return (
              <div
                key={template.id}
                className={`wf-template-card ${isPreviewing ? 'wf-template-card--previewing' : ''}`}
              >
                <div className="wf-template-card-main">
                  <div className="wf-template-card-header">
                    <div className="wf-template-card-title-group">
                      <h3 className="wf-template-card-name">{template.name}</h3>
                      <span className="wf-template-act-pill" title={template.statutoryAct}>
                        📜 {template.statutoryAct}
                      </span>
                    </div>
                    <span className="wf-template-sla-badge">
                      ⏱️ {template.totalSlaDays ?? 45} Days Total SLA
                    </span>
                  </div>

                  <p className="wf-template-card-desc">{template.description}</p>

                  {/* Node Sequence Preview */}
                  <div className="wf-template-sequence">
                    <span className="wf-template-seq-label">Fragment Sequence ({fragmentNodes.length} Nodes):</span>
                    <div className="wf-template-seq-flow">
                      {fragmentNodes.map((fn, idx) => (
                        <React.Fragment key={fn.name}>
                          <div className="wf-template-node-pill">
                            <span className="wf-template-node-pill-idx">{idx + 1}</span>
                            <span className="wf-template-node-pill-name">{fn.name}</span>
                            <span className="wf-template-node-pill-sla">{fn.slaDays}d</span>
                          </div>
                          {idx < fragmentNodes.length - 1 && (
                            <span className="wf-template-seq-arrow">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="wf-template-card-actions">
                  <button
                    type="button"
                    className="wf-btn wf-btn-sm wf-btn-outline"
                    disabled={isSaving || isApplying}
                    onClick={() => handlePreview(template.id)}
                    title="Preview ghost layout on canvas"
                  >
                    {isPreviewing ? '✓ Previewing' : '👁️ Preview on Canvas'}
                  </button>

                  <button
                    type="button"
                    className="wf-btn wf-btn-sm wf-btn-primary"
                    disabled={isSaving || isApplying}
                    onClick={() => handleApply(template.id)}
                    title="Insert this fragment into the workflow"
                  >
                    {isApplying ? 'Inserting…' : '📋 Copy Fragment'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="wf-template-footer">
          <span className="wf-template-footer-tip">
            💡 <strong>Acceptance Rule:</strong> When you copy a fragment, all nodes and edges are added to your design canvas and can be customized before activation.
          </span>
          <button type="button" onClick={onClose} className="wf-btn">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowTemplateModal;
