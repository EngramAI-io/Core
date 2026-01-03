import React from 'react';
import type { McpLog } from '../types';
import { calculateMetrics } from '../utils/metrics';
import {
  formatRequestsPerSecond,
  formatPercentage,
  formatLatency,
} from '../utils/formatters';
import './MetricsPanel.css';

interface MetricsPanelProps {
  events: McpLog[];
  isLoading?: boolean;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({
  events,
  isLoading = false,
}) => {
  const metrics = calculateMetrics(events);

  const metricCards: Array<{
    label: string;
    value: string;
    sublabel: string;
    color: string;
    icon: React.ReactNode;
  }> = [
    {
      label: 'Requests',
      value: isLoading ? '--' : formatRequestsPerSecond(metrics.requestsPerSecond),
      sublabel: isLoading ? 'Loading...' : `${metrics.totalRequests} total`,
      color: 'purple',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19h16M6 16V8M12 16V5M18 16v-6" />
        </svg>
      ),
    },
    {
      label: 'Error Rate',
      value: isLoading ? '--' : formatPercentage(metrics.errorRate),
      sublabel: isLoading ? 'Loading...' : `${metrics.totalErrors} errors`,
      color: metrics.errorRate > 5 ? 'red' : metrics.errorRate > 1 ? 'yellow' : 'green',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      ),
    },
    {
      label: 'P95 Latency',
      value: isLoading ? '--' : formatLatency(metrics.p95Latency),
      sublabel: isLoading ? 'Loading...' : '95th percentile',
      color:
        metrics.p95Latency > 1000 ? 'red' : metrics.p95Latency > 500 ? 'yellow' : 'cyan',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      ),
    },
    {
      label: 'Active Tools',
      value: isLoading ? '--' : metrics.activeTools.toString(),
      sublabel: isLoading ? 'Loading...' : 'unique methods',
      color: 'cyan',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      ),
    },
  ];

  return (
    <div className="metrics-panel">
      {metricCards.map((metric, idx) => (
        <div
          key={idx}
          className={`metric-card metric-card-${metric.color} ${
            isLoading ? 'loading' : ''
          }`}
          role="region"
          aria-label={`${metric.label}: ${metric.value}`}
        >
          <div className="metric-header">
            <span className="metric-icon" aria-hidden="true">
              {metric.icon}
            </span>
            <span className="metric-label">{metric.label}</span>
          </div>
          <div className="metric-value">{metric.value}</div>
          <div className="metric-sublabel">{metric.sublabel}</div>
        </div>
      ))}
    </div>
  );
};

export default MetricsPanel;
