import { useMemo } from 'react';
import type { ValidationResult, ValidationIssue, ValidationSeverity } from '../../sim/circuitValidator';
import { getSeverityIcon, getSeverityLabel, getValidationSummary } from '../../sim/circuitValidator';
import './ValidationPanel.css';

interface ValidationPanelProps {
  result: ValidationResult;
  onIssueClick?: (issue: ValidationIssue) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Status indicator component showing circuit health
 */
function StatusIndicator({ result }: { result: ValidationResult }) {
  const statusClass = useMemo(() => {
    switch (result.circuitStatus) {
      case 'complete': return 'status-complete';
      case 'incomplete': return 'status-incomplete';
      case 'invalid': return 'status-invalid';
    }
  }, [result.circuitStatus]);

  const statusLabel = useMemo(() => {
    switch (result.circuitStatus) {
      case 'complete': return 'Ready';
      case 'incomplete': return 'Building';
      case 'invalid': return 'Issues Found';
    }
  }, [result.circuitStatus]);

  return (
    <div className={`validation-status ${statusClass}`}>
      <span className="status-dot" />
      <span className="status-label">{statusLabel}</span>
    </div>
  );
}

/**
 * Single issue card component
 */
function IssueCard({
  issue,
  onClick
}: {
  issue: ValidationIssue;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`validation-issue severity-${issue.severity}`}
      onClick={onClick}
      title={onClick ? 'Click to highlight affected elements' : undefined}
    >
      <span className="issue-icon">{getSeverityIcon(issue.severity)}</span>
      <div className="issue-content">
        <span className="issue-title">{issue.message}</span>
        <span className="issue-description">{issue.description}</span>
      </div>
      <span className="issue-badge">{getSeverityLabel(issue.severity)}</span>
    </button>
  );
}

/**
 * Stats display showing component counts
 */
function CircuitStats({ result }: { result: ValidationResult }) {
  const { stats } = result;

  return (
    <div className="validation-stats">
      <div className="stat-item" title="Total components">
        <span className="stat-value">{stats.componentCount}</span>
        <span className="stat-label">Components</span>
      </div>
      <div className="stat-item" title="Wire segments">
        <span className="stat-value">{stats.wireCount}</span>
        <span className="stat-label">Wires</span>
      </div>
      <div className="stat-item" title="Connection nodes">
        <span className="stat-value">{stats.nodeCount}</span>
        <span className="stat-label">Nodes</span>
      </div>
      <div className="stat-item" title="Connected networks">
        <span className="stat-value">{stats.connectedComponents}</span>
        <span className="stat-label">Networks</span>
      </div>
    </div>
  );
}

/**
 * Main validation panel component
 */
export function ValidationPanel({
  result,
  onIssueClick,
  collapsed = false,
  onToggleCollapse
}: ValidationPanelProps) {
  const summary = useMemo(() => getValidationSummary(result), [result]);

  const groupedIssues = useMemo(() => {
    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const infos = result.issues.filter(i => i.severity === 'info');
    return { errors, warnings, infos };
  }, [result.issues]);

  const hasIssues = result.issues.length > 0;

  return (
    <div className={`validation-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <button
        type="button"
        className="validation-header"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
      >
        <StatusIndicator result={result} />
        <span className="validation-summary">{summary}</span>
        <span className="validation-toggle">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="validation-body">
          <CircuitStats result={result} />

          {hasIssues ? (
            <div className="validation-issues">
              {groupedIssues.errors.length > 0 && (
                <div className="issue-group">
                  <h4 className="issue-group-title error">Errors</h4>
                  {groupedIssues.errors.map((issue, idx) => (
                    <IssueCard
                      key={`error-${idx}`}
                      issue={issue}
                      onClick={onIssueClick ? () => onIssueClick(issue) : undefined}
                    />
                  ))}
                </div>
              )}

              {groupedIssues.warnings.length > 0 && (
                <div className="issue-group">
                  <h4 className="issue-group-title warning">Warnings</h4>
                  {groupedIssues.warnings.map((issue, idx) => (
                    <IssueCard
                      key={`warning-${idx}`}
                      issue={issue}
                      onClick={onIssueClick ? () => onIssueClick(issue) : undefined}
                    />
                  ))}
                </div>
              )}

              {groupedIssues.infos.length > 0 && (
                <div className="issue-group">
                  <h4 className="issue-group-title info">Suggestions</h4>
                  {groupedIssues.infos.map((issue, idx) => (
                    <IssueCard
                      key={`info-${idx}`}
                      issue={issue}
                      onClick={onIssueClick ? () => onIssueClick(issue) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="validation-empty">
              {result.stats.componentCount === 0 ? (
                <p>Place components on the board to begin building your circuit.</p>
              ) : (
                <p className="validation-success">
                  Circuit looks good! All components are properly connected.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline validation indicator for toolbars
 */
export function ValidationIndicator({
  result,
  onClick
}: {
  result: ValidationResult;
  onClick?: () => void;
}) {
  const errorCount = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;

  if (errorCount === 0 && warningCount === 0) {
    if (result.circuitStatus === 'complete') {
      return (
        <button
          type="button"
          className="validation-indicator indicator-success"
          onClick={onClick}
          title="Circuit is complete and ready"
        >
          <span className="indicator-icon">✓</span>
          <span className="indicator-text">Ready</span>
        </button>
      );
    }
    return null;
  }

  return (
    <button
      type="button"
      className={`validation-indicator ${errorCount > 0 ? 'indicator-error' : 'indicator-warning'}`}
      onClick={onClick}
      title={`${errorCount} errors, ${warningCount} warnings - click to view`}
    >
      {errorCount > 0 && (
        <span className="indicator-count error">
          <span className="indicator-icon">✕</span>
          {errorCount}
        </span>
      )}
      {warningCount > 0 && (
        <span className="indicator-count warning">
          <span className="indicator-icon">⚠</span>
          {warningCount}
        </span>
      )}
    </button>
  );
}
