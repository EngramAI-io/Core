import React, { useMemo } from 'react';
import type { McpLog } from '../types';
import { StreamDirection } from '../types';
import './FilterPanel.css';

export interface Filters {
  methods: string[];
  directions: StreamDirection[];
  statuses: ('success' | 'error')[];
  latencyMin: number | null;
  latencyMax: number | null;
}

export const defaultFilters: Filters = {
  methods: [],
  directions: [],
  statuses: [],
  latencyMin: null,
  latencyMax: null,
};

interface FilterPanelProps {
  events: McpLog[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  events,
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
}) => {
  // Extract unique methods from events
  const uniqueMethods = useMemo(() => {
    const methods = new Set<string>();
    events.forEach((e) => {
      if (e.method) methods.add(e.method);
    });
    return Array.from(methods).sort();
  }, [events]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.methods.length > 0 ||
      filters.directions.length > 0 ||
      filters.statuses.length > 0 ||
      filters.latencyMin !== null ||
      filters.latencyMax !== null ||
      searchQuery.length > 0
    );
  }, [filters, searchQuery]);

  const handleMethodToggle = (method: string) => {
    const newMethods = filters.methods.includes(method)
      ? filters.methods.filter((m) => m !== method)
      : [...filters.methods, method];
    onFiltersChange({ ...filters, methods: newMethods });
  };

  const handleDirectionToggle = (direction: StreamDirection) => {
    const newDirections = filters.directions.includes(direction)
      ? filters.directions.filter((d) => d !== direction)
      : [...filters.directions, direction];
    onFiltersChange({ ...filters, directions: newDirections });
  };

  const handleStatusToggle = (status: 'success' | 'error') => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const handleLatencyChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    if (type === 'min') {
      onFiltersChange({ ...filters, latencyMin: numValue });
    } else {
      onFiltersChange({ ...filters, latencyMax: numValue });
    }
  };

  const clearAllFilters = () => {
    onFiltersChange(defaultFilters);
    onSearchChange('');
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'method':
        onFiltersChange({
          ...filters,
          methods: filters.methods.filter((m) => m !== value),
        });
        break;
      case 'direction':
        onFiltersChange({
          ...filters,
          directions: filters.directions.filter((d) => d !== value),
        });
        break;
      case 'status':
        onFiltersChange({
          ...filters,
          statuses: filters.statuses.filter((s) => s !== value),
        });
        break;
      case 'latency':
        onFiltersChange({
          ...filters,
          latencyMin: null,
          latencyMax: null,
        });
        break;
      case 'search':
        onSearchChange('');
        break;
    }
  };

  return (
    <div className="filter-panel">
      <div className="filter-controls">
        {/* Search Input */}
        <div className="filter-group filter-group--search">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6" />
              <path d="M16 16l4 4" />
            </svg>
            <input
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events..."
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Direction Filter */}
        <div className="filter-group">
          <label className="filter-label">Direction</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filters.directions.includes(StreamDirection.Inbound) ? 'active' : ''}`}
              onClick={() => handleDirectionToggle(StreamDirection.Inbound)}
            >
              <span className="filter-dot filter-dot--inbound"></span>
              Inbound
            </button>
            <button
              className={`filter-btn ${filters.directions.includes(StreamDirection.Outbound) ? 'active' : ''}`}
              onClick={() => handleDirectionToggle(StreamDirection.Outbound)}
            >
              <span className="filter-dot filter-dot--outbound"></span>
              Outbound
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filters.statuses.includes('success') ? 'active' : ''}`}
              onClick={() => handleStatusToggle('success')}
            >
              <span className="filter-dot filter-dot--success"></span>
              Success
            </button>
            <button
              className={`filter-btn ${filters.statuses.includes('error') ? 'active' : ''}`}
              onClick={() => handleStatusToggle('error')}
            >
              <span className="filter-dot filter-dot--error"></span>
              Error
            </button>
          </div>
        </div>

        {/* Latency Range */}
        <div className="filter-group">
          <label className="filter-label">Latency (ms)</label>
          <div className="filter-range">
            <input
              type="number"
              className="filter-input"
              placeholder="Min"
              value={filters.latencyMin ?? ''}
              onChange={(e) => handleLatencyChange('min', e.target.value)}
              min="0"
            />
            <span className="filter-range-separator">–</span>
            <input
              type="number"
              className="filter-input"
              placeholder="Max"
              value={filters.latencyMax ?? ''}
              onChange={(e) => handleLatencyChange('max', e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Method Filter */}
        {uniqueMethods.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">Method</label>
            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) handleMethodToggle(e.target.value);
                }}
              >
                <option value="">Select method...</option>
                {uniqueMethods
                  .filter((m) => !filters.methods.includes(m))
                  .map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
              </select>
              <svg className="filter-select-arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <div className="filter-chips">
          <div className="filter-chips-list">
            {searchQuery && (
              <span className="filter-chip">
                <span className="filter-chip-label">Search:</span>
                <span className="filter-chip-value">"{searchQuery}"</span>
                <button
                  className="filter-chip-remove"
                  onClick={() => removeFilter('search')}
                  aria-label="Remove search filter"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </span>
            )}

            {filters.directions.map((dir) => (
              <span key={dir} className={`filter-chip filter-chip--${dir.toLowerCase()}`}>
                <span className="filter-chip-value">{dir}</span>
                <button
                  className="filter-chip-remove"
                  onClick={() => removeFilter('direction', dir)}
                  aria-label={`Remove ${dir} filter`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </span>
            ))}

            {filters.statuses.map((status) => (
              <span key={status} className={`filter-chip filter-chip--${status}`}>
                <span className="filter-chip-value">{status}</span>
                <button
                  className="filter-chip-remove"
                  onClick={() => removeFilter('status', status)}
                  aria-label={`Remove ${status} filter`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </span>
            ))}

            {(filters.latencyMin !== null || filters.latencyMax !== null) && (
              <span className="filter-chip filter-chip--latency">
                <span className="filter-chip-label">Latency:</span>
                <span className="filter-chip-value">
                  {filters.latencyMin ?? 0}ms – {filters.latencyMax ?? '∞'}ms
                </span>
                <button
                  className="filter-chip-remove"
                  onClick={() => removeFilter('latency')}
                  aria-label="Remove latency filter"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </span>
            )}

            {filters.methods.map((method) => (
              <span key={method} className="filter-chip filter-chip--method">
                <span className="filter-chip-value">{method}</span>
                <button
                  className="filter-chip-remove"
                  onClick={() => removeFilter('method', method)}
                  aria-label={`Remove ${method} filter`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          <button className="filter-clear-all" onClick={clearAllFilters}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
