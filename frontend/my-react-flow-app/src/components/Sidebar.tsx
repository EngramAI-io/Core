import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems: Array<{
  id: string;
  label: string;
  icon: React.ReactNode;
  tooltip: string;
}> = [
  {
    id: 'table',
    label: 'Events',
    tooltip: 'View all MCP events in a table',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 10h16M10 5v14" />
      </svg>
    ),
  },
  {
    id: 'graph',
    label: 'Graph',
    tooltip: 'Visualize agent-tool connections',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="7" r="2" />
        <circle cx="18" cy="7" r="2" />
        <circle cx="12" cy="17" r="2" />
        <path d="M8 7h8M7.5 8.5l3.5 6M16.5 8.5l-3.5 6" />
      </svg>
    ),
  },
  // {
  //   id: 'traces',
  //   label: 'Traces',
  //   tooltip: 'Distributed tracing (coming soon)',
  //   icon: (
  //     <svg viewBox="0 0 24 24" aria-hidden="true">
  //       <path d="M3 12h4l2-4 4 8 2-4h4" />
  //     </svg>
  //   ),
  // },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {/* <div className="logo-icon">S</div> */}
          <div className="logo-text">Sentinel</div>
        </div>
        <div className="sidebar-tagline">MCP Observability</div>
      </div>

      <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
            aria-label={item.tooltip}
            title={item.tooltip}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
            {activeView === item.id && <span className="nav-indicator" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot" aria-hidden="true"></span>
          <span className="status-text">Connected</span>
        </div>
        {/* <div className="sidebar-version">v0.2.0</div> */}
      </div>
    </div>
  );
};

export default Sidebar;
