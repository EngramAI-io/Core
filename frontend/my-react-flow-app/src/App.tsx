import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import FilterPanel, { defaultFilters, type Filters } from './components/FilterPanel';
import EventTable from './components/EventTable';
import Graph from './components/Graph';
import NodeDetails from './components/NodeDetails';
import { useWebSocket } from './hooks/useWebSocket';
import type { McpLog } from './types';
import { StreamDirection } from './types';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<string>('table');
  const [selectedEvent, setSelectedEvent] = useState<McpLog | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const events: McpLog[] = useWebSocket('ws://localhost:3000/ws');

  // Set loading to false once we have events or after 2 seconds
  useEffect(() => {
    if (events.length > 0) {
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [events.length]);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Search query filter
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch =
          event.method?.toLowerCase().includes(lowerQuery) ||
          event.request_id?.toString().includes(lowerQuery) ||
          event.span_id?.toLowerCase().includes(lowerQuery);
        if (!matchesSearch) return false;
      }

      // Direction filter
      if (filters.directions.length > 0) {
        if (!filters.directions.includes(event.direction)) return false;
      }

      // Method filter
      if (filters.methods.length > 0) {
        if (!event.method || !filters.methods.includes(event.method)) return false;
      }

      // Status filter
      if (filters.statuses.length > 0) {
        const hasError = Boolean((event.payload as any)?.error);
        const eventStatus = hasError ? 'error' : 'success';
        if (!filters.statuses.includes(eventStatus)) return false;
      }

      // Latency filter (only for inbound events that have latency)
      if (filters.latencyMin !== null || filters.latencyMax !== null) {
        // Only apply latency filter to inbound events (responses)
        if (event.direction === StreamDirection.Inbound && typeof event.latency_ms === 'number') {
          if (filters.latencyMin !== null && event.latency_ms < filters.latencyMin) {
            return false;
          }
          if (filters.latencyMax !== null && event.latency_ms > filters.latencyMax) {
            return false;
          }
        } else if (event.direction === StreamDirection.Outbound) {
          // For outbound events (requests), skip latency filter unless both are null
          // This keeps outbound events visible when latency filter is active
        }
      }

      return true;
    });
  }, [events, searchQuery, filters]);

  const handleEventClick = (event: McpLog) => {
    setSelectedEvent(event);
  };

  const handleNodeClick = (nodeId: string | null) => {
    const event =
      nodeId != null
        ? events.find((e) => e.request_id?.toString() === nodeId) ?? null
        : null;
    setSelectedEvent(event);
  };

  return (
    <div className="dashboard">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="dashboard-main">
        {activeView === 'table' && (
          <>
            <FilterPanel
              events={events}
              filters={filters}
              onFiltersChange={setFilters}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <div className="content-area content-area--padded">
              {isLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">Connecting to Sentinel...</div>
                </div>
              ) : (
                <EventTable
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              )}
            </div>
          </>
        )}

        {activeView === 'graph' && (
          <div className="content-area content-area--graph">
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading graph...</div>
              </div>
            ) : (
              <Graph
                events={events}
                onNodeClick={handleNodeClick}
                selectedNode={selectedEvent?.request_id?.toString() ?? null}
              />
            )}
          </div>
        )}

        {activeView === 'traces' && (
          <div className="content-area content-area--padded">
            <div className="traces-placeholder">
              <div className="placeholder-icon" aria-hidden="true">
                <span className="placeholder-glyph">TR</span>
              </div>
              <div className="placeholder-title">Trace View</div>
              <div className="placeholder-text">
                Distributed tracing visualization coming soon.
                <br />
                Track request flows across multiple tools.
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="details-panel">
          <NodeDetails
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
