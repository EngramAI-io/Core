import React, { useState, useCallback, useMemo } from 'react';
import './JsonViewer.css';

interface JsonViewerProps {
  data: unknown;
  initialExpanded?: boolean;
}

interface CollapsibleState {
  [path: string]: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, initialExpanded = true }) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState<CollapsibleState>({});
  const [allExpanded, setAllExpanded] = useState(initialExpanded);

  const toggleCollapse = useCallback((path: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  }, []);

  const expandAll = useCallback(() => {
    setCollapsed({});
    setAllExpanded(true);
  }, []);

  const collapseAll = useCallback(() => {
    // Collapse all paths
    const paths: CollapsibleState = {};
    const findPaths = (obj: unknown, path: string) => {
      if (Array.isArray(obj)) {
        paths[path] = true;
        obj.forEach((item, i) => findPaths(item, `${path}[${i}]`));
      } else if (obj !== null && typeof obj === 'object') {
        paths[path] = true;
        Object.keys(obj).forEach((key) => findPaths((obj as any)[key], `${path}.${key}`));
      }
    };
    findPaths(data, 'root');
    setCollapsed(paths);
    setAllExpanded(false);
  }, [data]);

  const copyToClipboard = useCallback(async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [data]);

  const formattedSize = useMemo(() => {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [data]);

  const isCollapsed = (path: string): boolean => {
    if (path in collapsed) {
      return collapsed[path];
    }
    return !allExpanded;
  };

  const renderValue = (
    value: unknown,
    path: string,
    depth: number,
    isLastItem: boolean,
    keyName?: string
  ): React.ReactElement[] => {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);
    const comma = isLastItem ? '' : ',';
    const lines: React.ReactElement[] = [];

    if (value === null) {
      lines.push(
        <div key={path} className="json-line">
          <span className="json-indent">{indent}</span>
          {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
          {keyName !== undefined && <span className="json-punctuation">: </span>}
          <span className="json-null">null</span>
          <span className="json-punctuation">{comma}</span>
        </div>
      );
    } else if (typeof value === 'boolean') {
      lines.push(
        <div key={path} className="json-line">
          <span className="json-indent">{indent}</span>
          {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
          {keyName !== undefined && <span className="json-punctuation">: </span>}
          <span className="json-boolean">{value.toString()}</span>
          <span className="json-punctuation">{comma}</span>
        </div>
      );
    } else if (typeof value === 'number') {
      lines.push(
        <div key={path} className="json-line">
          <span className="json-indent">{indent}</span>
          {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
          {keyName !== undefined && <span className="json-punctuation">: </span>}
          <span className="json-number">{value}</span>
          <span className="json-punctuation">{comma}</span>
        </div>
      );
    } else if (typeof value === 'string') {
      const displayValue = value.length > 300 ? value.slice(0, 300) + '...' : value;
      const escapedValue = displayValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      lines.push(
        <div key={path} className="json-line">
          <span className="json-indent">{indent}</span>
          {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
          {keyName !== undefined && <span className="json-punctuation">: </span>}
          <span className="json-string">"{escapedValue}"</span>
          <span className="json-punctuation">{comma}</span>
        </div>
      );
    } else if (Array.isArray(value)) {
      const isCurrentCollapsed = isCollapsed(path);

      if (value.length === 0) {
        lines.push(
          <div key={path} className="json-line">
            <span className="json-indent">{indent}</span>
            {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
            {keyName !== undefined && <span className="json-punctuation">: </span>}
            <span className="json-bracket">[]</span>
            <span className="json-punctuation">{comma}</span>
          </div>
        );
      } else if (isCurrentCollapsed) {
        lines.push(
          <div key={path} className="json-line json-line--collapsible">
            <span className="json-indent">{indent}</span>
            <button className="json-toggle" onClick={() => toggleCollapse(path)}>
              <svg viewBox="0 0 24 24" className="json-toggle-icon">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
            {keyName !== undefined && <span className="json-punctuation">: </span>}
            <span className="json-bracket">[</span>
            <span className="json-collapsed-preview" onClick={() => toggleCollapse(path)}>
              {value.length} {value.length === 1 ? 'item' : 'items'}
            </span>
            <span className="json-bracket">]</span>
            <span className="json-punctuation">{comma}</span>
          </div>
        );
      } else {
        // Opening bracket
        lines.push(
          <div key={`${path}-open`} className="json-line json-line--collapsible">
            <span className="json-indent">{indent}</span>
            <button className="json-toggle" onClick={() => toggleCollapse(path)}>
              <svg viewBox="0 0 24 24" className="json-toggle-icon json-toggle-icon--expanded">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
            {keyName !== undefined && <span className="json-punctuation">: </span>}
            <span className="json-bracket">[</span>
          </div>
        );
        // Array items
        value.forEach((item, index) => {
          lines.push(...renderValue(item, `${path}[${index}]`, depth + 1, index === value.length - 1));
        });
        // Closing bracket
        lines.push(
          <div key={`${path}-close`} className="json-line">
            <span className="json-indent">{nextIndent}</span>
            <span className="json-bracket">]</span>
            <span className="json-punctuation">{comma}</span>
          </div>
        );
      }
    } else if (typeof value === 'object') {
      const entries = Object.entries(value);
      const isCurrentCollapsed = isCollapsed(path);

      if (entries.length === 0) {
        lines.push(
          <div key={path} className="json-line">
            <span className="json-indent">{indent}</span>
            {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
            {keyName !== undefined && <span className="json-punctuation">: </span>}
            <span className="json-bracket">{'{}'}</span>
            <span className="json-punctuation">{comma}</span>
          </div>
        );
      } else if (isCurrentCollapsed) {
        lines.push(
          <div key={path} className="json-line json-line--collapsible">
            <span className="json-indent">{indent}</span>
            <button className="json-toggle" onClick={() => toggleCollapse(path)}>
              <svg viewBox="0 0 24 24" className="json-toggle-icon">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
            {keyName !== undefined && <span className="json-punctuation">: </span>}
            <span className="json-bracket">{'{'}</span>
            <span className="json-collapsed-preview" onClick={() => toggleCollapse(path)}>
              {entries.length} {entries.length === 1 ? 'key' : 'keys'}
            </span>
            <span className="json-bracket">{'}'}</span>
            <span className="json-punctuation">{comma}</span>
          </div>
        );
      } else {
        // Opening brace
        lines.push(
          <div key={`${path}-open`} className="json-line json-line--collapsible">
            <span className="json-indent">{indent}</span>
            <button className="json-toggle" onClick={() => toggleCollapse(path)}>
              <svg viewBox="0 0 24 24" className="json-toggle-icon json-toggle-icon--expanded">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
            {keyName !== undefined && <span className="json-punctuation">: </span>}
            <span className="json-bracket">{'{'}</span>
          </div>
        );
        // Object entries
        entries.forEach(([key, val], index) => {
          lines.push(...renderValue(val, `${path}.${key}`, depth + 1, index === entries.length - 1, key));
        });
        // Closing brace
        lines.push(
          <div key={`${path}-close`} className="json-line">
            <span className="json-indent">{nextIndent}</span>
            <span className="json-bracket">{'}'}</span>
            <span className="json-punctuation">{comma}</span>
          </div>
        );
      }
    } else {
      lines.push(
        <div key={path} className="json-line">
          <span className="json-indent">{indent}</span>
          {keyName !== undefined && <span className="json-key">"{keyName}"</span>}
          {keyName !== undefined && <span className="json-punctuation">: </span>}
          <span className="json-unknown">{String(value)}</span>
          <span className="json-punctuation">{comma}</span>
        </div>
      );
    }

    return lines;
  };

  return (
    <div className="json-viewer">
      <div className="json-viewer-toolbar">
        <div className="json-viewer-info">
          <span className="json-viewer-size">{formattedSize}</span>
        </div>
        <div className="json-viewer-actions">
          <button className="json-viewer-btn" onClick={expandAll} title="Expand all">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4v6h6M20 20v-6h-6M4 20l5-5M20 4l-5 5" />
            </svg>
            <span>Expand</span>
          </button>
          <button className="json-viewer-btn" onClick={collapseAll} title="Collapse all">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 14h6v6M20 10h-6V4M10 4l-6 6M14 20l6-6" />
            </svg>
            <span>Collapse</span>
          </button>
          <button
            className={`json-viewer-btn json-viewer-btn--copy ${copied ? 'copied' : ''}`}
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="json-viewer-content">
        <pre className="json-pre">
          {renderValue(data, 'root', 0, true)}
        </pre>
      </div>
    </div>
  );
};

export default JsonViewer;
