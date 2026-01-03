import type { CSSProperties } from 'react';
import type { McpLog } from '../types';
import { StreamDirection } from '../types';
import JsonViewer from './JsonViewer';
import './NodeDetails.css';

interface NodeDetailsProps {
  event: McpLog;
  onClose: () => void;
}

export default function NodeDetails({ event, onClose }: NodeDetailsProps) {
  const isError = (event.payload as any)?.error;
  const accentColor = isError ? 'var(--accent-danger)' : 'var(--accent-success)';
  const accentStyle = { '--accent': accentColor } as CSSProperties;

  return (
    <div className="node-details" style={accentStyle}>
      <div className="node-details__header">
        <h2 className="node-details__title">Event Details</h2>
        <button className="node-details__close" onClick={onClose} aria-label="Close details">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="node-details__meta">
        <div className="node-details__meta-item">
          <span className="node-details__meta-label">Time</span>
          <span className="node-details__meta-value">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {event.method && (
          <div className="node-details__meta-item">
            <span className="node-details__meta-label">Method</span>
            <span className="node-details__meta-value node-details__meta-value--mono">
              {event.method}
            </span>
          </div>
        )}

        <div className="node-details__meta-item">
          <span className="node-details__meta-label">Direction</span>
          <span
            className={`node-details__direction ${
              event.direction === StreamDirection.Outbound ? 'is-outbound' : 'is-inbound'
            }`}
          >
            {event.direction}
          </span>
        </div>

        {event.latency_ms !== undefined && (
          <div className="node-details__meta-item">
            <span className="node-details__meta-label">Latency</span>
            <span className="node-details__meta-value node-details__meta-value--latency">
              {event.latency_ms}ms
            </span>
          </div>
        )}

        {event.request_id !== undefined && (
          <div className="node-details__meta-item">
            <span className="node-details__meta-label">Request ID</span>
            <span className="node-details__meta-value node-details__meta-value--mono">
              {event.request_id}
            </span>
          </div>
        )}
      </div>

      <div className="node-details__section node-details__section--payload">
        <div className="node-details__label">Payload</div>
        <JsonViewer data={event.payload} />
      </div>
    </div>
  );
}
