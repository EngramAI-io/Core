import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { McpLog } from '../types';
import { StreamDirection } from '../types';

interface GraphProps {
  events: McpLog[];
  onNodeClick: (nodeId: string | null) => void;
  selectedNode: string | null;
}

type CustomNodeData = {
  label: string;
  method?: string;
  status: 'pending' | 'success' | 'error';
  requestId?: number;
  selectedId?: string | null;
  calls?: number;
  outbound?: number;
  inbound?: number;
  errors?: number;
  avgLatencyMs?: number;
};

type ClusterNodeData = {
  label: string;
  color: string;
  glowColor: string;
};

type ClusterStats = {
  id: string;
  label: string;
  color: string;
  glowColor: string;
  xSum: number;
  ySum: number;
  count: number;
};

type ToolStats = {
  total: number;
  outbound: number;
  inbound: number;
  errors: number;
  lastRequestId?: number;
  totalLatency: number;
  maxLatency: number;
};

// ============================================
// THEME CONSTANTS
// ============================================

const NEON_COLORS = {
  green: '#10b981',
  greenGlow: 'rgba(16, 185, 129, 0.4)',
  red: '#ef4444',
  redGlow: 'rgba(239, 68, 68, 0.4)',
  purple: '#3b82f6',
  purpleGlow: 'rgba(59, 130, 246, 0.4)',
  cyan: '#38bdf8',
  yellow: '#f59e0b',
  orange: '#f97316',
  blue: '#3b82f6',
  slate: '#94a3b8',
};

const BG_COLORS = {
  primary: '#0f1419',
  secondary: '#151b23',
  tertiary: '#1c242d',
  card: '#171e26',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getClusterInfo(method: string): {
  id: string;
  label: string;
  color: string;
  glowColor: string;
} {
  if (method.startsWith('postgres.') || method.startsWith('redis.')) {
    return {
      id: 'db',
      label: 'Databases',
      color: 'rgba(34, 211, 238, 0.15)',
      glowColor: NEON_COLORS.cyan,
    };
  }
  if (method.startsWith('github.')) {
    return {
      id: 'github',
      label: 'GitHub',
      color: 'rgba(96, 165, 250, 0.16)',
      glowColor: NEON_COLORS.blue,
    };
  }
  if (method.startsWith('slack.')) {
    return {
      id: 'slack',
      label: 'Slack',
      color: 'rgba(74, 222, 128, 0.12)',
      glowColor: NEON_COLORS.green,
    };
  }
  if (method.startsWith('kubernetes.')) {
    return {
      id: 'k8s',
      label: 'Kubernetes',
      color: 'rgba(59, 130, 246, 0.16)',
      glowColor: '#3b82f6',
    };
  }
  if (method.startsWith('llm.')) {
    return {
      id: 'llm',
      label: 'LLM Tools',
      color: 'rgba(245, 158, 11, 0.15)',
      glowColor: NEON_COLORS.yellow,
    };
  }
  if (method.startsWith('fs.')) {
    return {
      id: 'fs',
      label: 'Filesystem',
      color: 'rgba(148, 163, 184, 0.12)',
      glowColor: NEON_COLORS.slate,
    };
  }
  if (method.startsWith('browser.')) {
    return {
      id: 'browser',
      label: 'Browser',
      color: 'rgba(249, 115, 22, 0.15)',
      glowColor: NEON_COLORS.orange,
    };
  }
  if (method.startsWith('billing.')) {
    return {
      id: 'billing',
      label: 'Billing',
      color: 'rgba(236, 72, 153, 0.15)',
      glowColor: '#ec4899',
    };
  }
  if (method.startsWith('monitoring.')) {
    return {
      id: 'monitoring',
      label: 'Monitoring',
      color: 'rgba(20, 184, 166, 0.15)',
      glowColor: '#14b8a6',
    };
  }
  return {
    id: 'other',
    label: 'Other Tools',
    color: 'rgba(107, 114, 128, 0.12)',
    glowColor: '#6b7280',
  };
}

function getToolIcon(method?: string): string {
  if (!method) return 'TL';
  if (method.startsWith('github.')) return 'GH';
  if (method.startsWith('slack.')) return 'SL';
  if (method.startsWith('postgres.')) return 'PG';
  if (method.startsWith('redis.')) return 'RD';
  if (method.startsWith('kubernetes.')) return 'K8';
  if (method.startsWith('vector.')) return 'VX';
  if (method.startsWith('llm.')) return 'LM';
  if (method.startsWith('browser.')) return 'WB';
  if (method.startsWith('fs.')) return 'FS';
  if (method.startsWith('billing.')) return 'BL';
  if (method.startsWith('monitoring.')) return 'MN';
  return 'TL';
}

// ============================================
// CUSTOM NODE COMPONENTS
// ============================================

const AgentNode: React.FC<NodeProps> = (props) => {
  const data = props.data as CustomNodeData;

  const handleStyle = {
    background: NEON_COLORS.purple,
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: '2px solid white',
  };

  return (
    <div
      style={{
        position: 'relative',
        padding: '18px 36px',
        background: `linear-gradient(135deg, ${NEON_COLORS.purple} 0%, #60a5fa 100%)`,
        color: 'white',
        borderRadius: '999px',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        border: '2px solid rgba(255, 255, 255, 0.25)',
        boxShadow: `
          0 12px 24px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `,
      }}
    >
      <Handle id="left" type="source" position={Position.Left} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} style={handleStyle} />
      <Handle id="top" type="source" position={Position.Top} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
      {data.label}
    </div>
  );
};

const ToolNode: React.FC<NodeProps> = (props) => {
  const data = props.data as CustomNodeData;

  const isError = data.status === 'error';
  const neonColor = isError ? NEON_COLORS.red : NEON_COLORS.green;
  const glowColor = isError ? NEON_COLORS.redGlow : NEON_COLORS.greenGlow;
  const icon = getToolIcon(data.method);

  const isSelected =
    data.requestId !== undefined &&
    data.selectedId != null &&
    data.requestId.toString() === data.selectedId;

  const latencyLabel =
    typeof data.avgLatencyMs === 'number' ? `${Math.round(data.avgLatencyMs)}ms` : '--';

  const boxShadow = isSelected
    ? `0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 2px ${neonColor}, 0 0 20px ${glowColor}`
    : `0 4px 16px rgba(0, 0, 0, 0.35)`;

  const handleStyle = {
    background: neonColor,
    width: 8,
    height: 8,
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: `0 0 6px ${neonColor}`,
  };

  return (
    <div
      style={{
        position: 'relative',
        padding: '14px 18px',
        background: BG_COLORS.card,
        color: 'white',
        borderRadius: '12px',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '13px',
        fontWeight: 500,
        border: `1px solid ${neonColor}`,
        boxShadow,
        transition: 'all 0.2s ease',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 180,
      }}
    >
      <Handle id="left" type="target" position={Position.Left} style={handleStyle} />
      <Handle id="right" type="target" position={Position.Right} style={handleStyle} />
      <Handle id="top" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="bottom" type="target" position={Position.Bottom} style={handleStyle} />

      <div
        style={{
          minWidth: 36,
          height: 36,
          borderRadius: 8,
          background: `rgba(${isError ? '239, 68, 68' : '16, 185, 129'}, 0.15)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          letterSpacing: '0.05em',
          fontWeight: 700,
          color: neonColor,
        }}
      >
        {icon}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div
          style={{
            color: '#f1f5f9',
            fontWeight: 600,
            fontSize: '14px',
            letterSpacing: '-0.01em',
          }}
        >
          {data.label}
        </div>
        {data.method && (
          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {data.method}
          </div>
        )}
        <div
          style={{
            fontSize: '11px',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 2,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: neonColor, fontWeight: 600 }}>{data.calls ?? 0}</span>
            <span>calls</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: NEON_COLORS.cyan, fontWeight: 600 }}>{latencyLabel}</span>
          </span>
          {typeof data.errors === 'number' && data.errors > 0 && (
            <span style={{ color: NEON_COLORS.red, fontWeight: 600 }}>{data.errors} err</span>
          )}
        </div>
      </div>
    </div>
  );
};

const ClusterNode: React.FC<NodeProps> = (props) => {
  const data = props.data as ClusterNodeData;

  return (
    <div
      style={{
        position: 'relative',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${data.color} 0%, transparent 65%)`,
        filter: 'blur(35px)',
        opacity: 0.5,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'Poppins, sans-serif',
          fontSize: 11,
          fontWeight: 600,
          color: data.glowColor,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          filter: 'blur(0)',
        }}
      >
        {data.label}
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  cluster: ClusterNode,
};

// ============================================
// SVG FILTER DEFINITIONS FOR EDGE GLOW
// ============================================

const EdgeGlowFilters: React.FC = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);

// ============================================
// MAIN GRAPH COMPONENT
// ============================================

export default function Graph({ events, onNodeClick, selectedNode }: GraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [didFit, setDidFit] = useState(false);

  const requestMethodById = useMemo(() => {
    const map = new Map<number, string>();

    for (const e of events) {
      if (
        e.direction === StreamDirection.Outbound &&
        typeof e.request_id === 'number' &&
        typeof e.method === 'string' &&
        e.method.length > 0
      ) {
        map.set(e.request_id, e.method);
      }
    }

    return map;
  }, [events]);

  const toolHealthMap = useMemo(() => {
    const map = new Map<string, boolean>();

    events.forEach((e) => {
      if ((e.payload as any)?.result?.kind === 'tool.health') {
        const { tool, healthy } = (e.payload as any).result;
        map.set(tool, healthy);
      }
    });

    return map;
  }, [events]);

  // Compute aggregate stats
  const statsMap = useMemo(() => {
    const map = new Map<string, ToolStats>();

    for (const e of events) {
      if (e.request_id == null) continue;

      const method =
        typeof e.method === 'string' && e.method.length > 0
          ? e.method
          : requestMethodById.get(e.request_id);

      if (!method) continue;

      const stats: ToolStats = map.get(method) ?? {
        total: 0,
        outbound: 0,
        inbound: 0,
        errors: 0,
        lastRequestId: undefined,
        totalLatency: 0,
        maxLatency: 0,
      };

      stats.total += 1;
      stats.lastRequestId = e.request_id;

      if (e.direction === StreamDirection.Outbound) {
        stats.outbound += 1;
      } else if (e.direction === StreamDirection.Inbound) {
        stats.inbound += 1;

        if (typeof e.latency_ms === 'number') {
          stats.totalLatency += e.latency_ms;
          stats.maxLatency = Math.max(stats.maxLatency, e.latency_ms);
        }

        // IMPORTANT: Sentinel puts JSON-RPC errors at payload.error (not payload.result.error)
        if ((e.payload as any)?.error) {
          stats.errors += 1;
        }
      }

      map.set(method, stats);
    }

    return map;
  }, [events, requestMethodById]);

  // A stable key for when the TOOL SET changes (topology), not when stats change.
  const toolSetKey = useMemo(
    () => Array.from(statsMap.keys()).sort().join('|'),
    [statsMap]
  );

  // =========================
  // TOPOLOGY BUILD (NO STATS)
  // =========================
  useEffect(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];

    const centerX = 600;
    const centerY = 400;

    // Central Agent Node
    const agentNode: Node = {
      id: 'agent',
      type: 'agent',
      position: { x: centerX, y: centerY },
      data: { label: 'Agent', status: 'pending', selectedId: null } as CustomNodeData,
      draggable: false,
      style: { zIndex: 10 },
    };
    nodeMap.set('agent', agentNode);

    // Tool nodes in radial layout
    const toolMethods = Array.from(statsMap.keys()).sort();
    const radius = 320;
    const clusterMap = new Map<string, ClusterStats>();

    toolMethods.forEach((method, index) => {
      const angle = (2 * Math.PI * index) / toolMethods.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const nodeId = `tool-${method}`;

      const shortLabel = method.split('.').pop() || method;

      const toolNode: Node = {
        id: nodeId,
        type: 'tool',
        position: { x, y },
        data: {
          label: shortLabel,
          method,
          status: 'success',
          requestId: undefined,
          selectedId: selectedNode,
          calls: 0,
          outbound: 0,
          inbound: 0,
          errors: 0,
          avgLatencyMs: 0,
        } as CustomNodeData,
        style: { zIndex: 5 },
      };

      nodeMap.set(nodeId, toolNode);

      // Cluster accumulation
      const clusterInfo = getClusterInfo(method);
      const cluster = clusterMap.get(clusterInfo.id) ?? {
        id: clusterInfo.id,
        label: clusterInfo.label,
        color: clusterInfo.color,
        glowColor: clusterInfo.glowColor,
        xSum: 0,
        ySum: 0,
        count: 0,
      };

      cluster.xSum += x;
      cluster.ySum += y;
      cluster.count += 1;
      clusterMap.set(clusterInfo.id, cluster);

      // Determine handle positions based on angle
      const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      let agentHandle: string;
      let toolHandle: string;

      if (normalizedAngle >= 0 && normalizedAngle < Math.PI / 4) {
        agentHandle = 'right';
        toolHandle = 'left';
      } else if (normalizedAngle >= Math.PI / 4 && normalizedAngle < (3 * Math.PI) / 4) {
        agentHandle = 'bottom';
        toolHandle = 'top';
      } else if (
        normalizedAngle >= (3 * Math.PI) / 4 &&
        normalizedAngle < (5 * Math.PI) / 4
      ) {
        agentHandle = 'left';
        toolHandle = 'right';
      } else if (
        normalizedAngle >= (5 * Math.PI) / 4 &&
        normalizedAngle < (7 * Math.PI) / 4
      ) {
        agentHandle = 'top';
        toolHandle = 'bottom';
      } else {
        agentHandle = 'right';
        toolHandle = 'left';
      }

      // Edge (initial style; will be updated by stats effect)
      edgeList.push({
        id: `edge-${nodeId}`,
        source: 'agent',
        target: nodeId,
        sourceHandle: agentHandle,
        targetHandle: toolHandle,
        type: 'smoothstep',
        className: 'edge-success',
        style: {
          stroke: NEON_COLORS.green,
          strokeWidth: 2.5,
          filter: `drop-shadow(0 0 3px ${NEON_COLORS.green}) drop-shadow(0 0 6px ${NEON_COLORS.green})`,
        },
      });
    });

    // Cluster background nodes - removed to eliminate background circles
    // clusterMap.forEach((cluster) => {
    //   if (cluster.count === 0) return;
    //   const cx = cluster.xSum / cluster.count;
    //   const cy = cluster.ySum / cluster.count;

    //   const clusterNode: Node = {
    //     id: `cluster-${cluster.id}`,
    //     type: 'cluster',
    //     position: { x: cx - 150, y: cy - 150 },
    //     data: {
    //       label: cluster.label,
    //       color: cluster.color,
    //       glowColor: cluster.glowColor,
    //     } as ClusterNodeData,
    //     draggable: false,
    //     selectable: false,
    //     style: { zIndex: 1 },
    //   };

    //   nodeMap.set(clusterNode.id, clusterNode);
    // });

    setNodes(Array.from(nodeMap.values()));
    setEdges(edgeList);
  }, [toolSetKey, selectedNode, setEdges, setNodes]);

  // =========================================
  // STATS UPDATE (NO TOPOLOGY REBUILD)
  // =========================================
  useEffect(() => {
    const toolMethods = Array.from(statsMap.keys());
    const hasErrorByMethod = new Map<string, boolean>();

    for (const method of toolMethods) {
      const lastInboundForMethod = [...events].reverse().find((e) => {
        if (e.direction !== StreamDirection.Inbound) return false;
        if (e.request_id == null) return false;
        const m =
          typeof e.method === 'string' && e.method.length > 0
            ? e.method
            : requestMethodById.get(e.request_id);
        return m === method;
      });

      const hasError = Boolean((lastInboundForMethod?.payload as any)?.error);
      hasErrorByMethod.set(method, hasError);
    }

    setNodes((prev) =>
      prev.map((node) => {
        if (node.type !== 'tool') return node;

        const data = node.data as CustomNodeData;
        const method = data.method;
        if (!method) return node;

        const stats = statsMap.get(method);
        if (!stats) return node;

        const hasError = hasErrorByMethod.get(method) ?? false;
        const avgLatency = stats.inbound > 0 ? stats.totalLatency / stats.inbound : 0;

        return {
          ...node,
          data: {
            ...data,
            status: hasError ? 'error' : 'success',
            requestId: stats.lastRequestId,
            selectedId: selectedNode,
            calls: stats.total,
            outbound: stats.outbound,
            inbound: stats.inbound,
            errors: stats.errors,
            avgLatencyMs: avgLatency,
          } as CustomNodeData,
        };
      })
    );

    setEdges((prev) =>
      prev.map((edge) => {
        const target = edge.target;
        if (!target?.startsWith('tool-')) return edge;

        const method = target.slice('tool-'.length);
        const hasError = hasErrorByMethod.get(method) ?? false;

        const edgeColor = hasError ? NEON_COLORS.red : NEON_COLORS.green;
        const edgeClass = hasError ? 'edge-error' : 'edge-success';

        const nextStyle = {
          ...(edge.style ?? {}),
          stroke: edgeColor,
          strokeWidth: hasError ? 3 : 2.5,
          filter: `drop-shadow(0 0 3px ${edgeColor}) drop-shadow(0 0 6px ${edgeColor})`,
        };

        // Avoid unnecessary object churn if nothing changed
        const curStyle = edge.style as any;
        if (
          edge.className === edgeClass &&
          curStyle?.stroke === nextStyle.stroke &&
          curStyle?.strokeWidth === nextStyle.strokeWidth &&
          curStyle?.filter === nextStyle.filter
        ) {
          return edge;
        }

        return {
          ...edge,
          className: edgeClass,
          style: nextStyle,
        };
      })
    );
  }, [events, requestMethodById, selectedNode, setEdges, setNodes, statsMap, toolHealthMap]);

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as CustomNodeData;
      if (data?.requestId !== undefined) {
        onNodeClick(data.requestId.toString());
      } else {
        onNodeClick(null);
      }
    },
    [onNodeClick]
  );

  return (
    <div style={{ width: '100%', height: '100%', background: BG_COLORS.primary }}>
      <EdgeGlowFilters />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView={!didFit}
        fitViewOptions={{ padding: 0.3 }}
        onInit={() => setDidFit(true)}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255, 255, 255, 0.04)"
        />
        <Controls
          style={{
            background: BG_COLORS.secondary,
            borderRadius: 8,
            border: '1px solid #1e293b',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        />
      </ReactFlow>
    </div>
  );
}
