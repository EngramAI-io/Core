import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { McpLog } from '../types';

interface GraphProps {
  events: McpLog[];
  onNodeClick: (nodeId: string | null) => void;
  selectedNode: string | null; // requestId as string
}

// Use a type (not interface) so it plays nicer with some TS constraints
type CustomNodeData = {
  label: string;
  method?: string;
  status: 'pending' | 'success' | 'error';
  requestId?: number;
  selectedId?: string | null;
};

// ------------ Custom node renderers ------------

const AgentNode: React.FC<NodeProps> = (props) => {
  const data = props.data as CustomNodeData;

  return (
    <div
      style={{
        padding: '10px 20px',
        background: '#6366f1',
        color: 'white',
        borderRadius: '999px',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(255,255,255,0.3)',
      }}
    >
      {data.label}
    </div>
  );
};

const ToolNode: React.FC<NodeProps> = (props) => {
  const data = props.data as CustomNodeData;

  const colorMap: Record<'pending' | 'success' | 'error', string> = {
    pending: '#eab308', // yellow
    success: '#22c55e', // green
    error: '#ef4444',   // red
  };

  const status = (data.status ?? 'pending') as keyof typeof colorMap;

  const isSelected =
    data.requestId !== undefined &&
    data.selectedId != null &&
    data.requestId.toString() === data.selectedId;

  return (
    <div
      style={{
        padding: '10px 20px',
        background: colorMap[status],
        color: 'white',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        border: isSelected ? '3px solid white' : 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {data.label}
      {data.method && (
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.9 }}>
          {data.method}
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
};

export default function Graph({ events, onNodeClick, selectedNode }: GraphProps) {
  // Use default Node / Edge typing to keep TS happy
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const nodeMap = new Map<string, Node>();
    const edgeMap = new Map<string, Edge>();

    // ----- Central agent node -----
    const centerX = 400;
    const centerY = 300;

    const agentNode: Node = {
      id: 'agent',
      type: 'agent',
      position: { x: centerX, y: centerY },
      data: { label: 'Agent', status: 'pending', selectedId: null } as CustomNodeData,
      draggable: false,
    };
    nodeMap.set('agent', agentNode);

    // ----- Figure out unique tool methods for layout -----
    const toolMethods = Array.from(
      new Set(
        events
          .filter((e) => e.method && e.request_id !== undefined)
          .map((e) => e.method as string),
      ),
    );

    const radius = 220;
    const positions = new Map<string, { x: number; y: number }>();

    toolMethods.forEach((method, index) => {
      const angle = (2 * Math.PI * index) / toolMethods.length;
      positions.set(method, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    // ----- Build nodes + edges from events -----
    events.forEach((event) => {
      if (!event.method || event.request_id == null) return;

      const method = event.method;
      const nodeId = `tool-${method}`;
      const requestIdStr = event.request_id.toString();

      // Create tool node if missing
      if (!nodeMap.has(nodeId)) {
        const pos = positions.get(method) ?? {
          x: centerX + (Math.random() - 0.5) * 300,
          y: centerY + (Math.random() - 0.5) * 200,
        };

        const isResponse = event.direction === 'Inbound' && event.latency_ms !== undefined;
        const baseStatus: CustomNodeData['status'] =
          isResponse && event.payload && (event.payload as any).error
            ? 'error'
            : isResponse
            ? 'success'
            : 'pending';

        const toolNode: Node = {
          id: nodeId,
          type: 'tool',
          position: pos,
          data: {
            label: method.split('/').pop() || method,
            method,
            status: baseStatus,
            requestId: event.request_id,
            selectedId: selectedNode,
          } as CustomNodeData,
        };

        nodeMap.set(nodeId, toolNode);
      } else {
        // Update existing node for responses / selection
        const existing = nodeMap.get(nodeId)!;
        const data = existing.data as CustomNodeData;
        let status = data.status;

        const isResponse = event.direction === 'Inbound' && event.latency_ms !== undefined;
        if (isResponse) {
          const hasError = event.payload && (event.payload as any).error !== undefined;
          status = hasError ? 'error' : 'success';
        }

        nodeMap.set(nodeId, {
          ...existing,
          data: {
            ...data,
            status,
            requestId: event.request_id,
            selectedId: selectedNode,
          } as CustomNodeData,
        });
      }

      // Edge per requestId: Agent <-> Tool
      const edgeId = `edge-${requestIdStr}`;
      const existingEdge = edgeMap.get(edgeId);

      const baseColor =
        event.direction === 'Inbound' ? '#22c55e' : '#eab308';

      if (!existingEdge) {
        const edge: Edge = {
          id: edgeId,
          source: 'agent',
          target: nodeId,
          animated: event.direction === 'Outbound',
          style: {
            stroke: baseColor,
            strokeWidth: 2,
          },
          label: `id ${requestIdStr}`,
        };
        edgeMap.set(edgeId, edge);
      } else {
        // Update edge on response (e.g., change color / stop animation)
        const updated: Edge = {
          ...existingEdge,
          animated:
            existingEdge.animated &&
            event.direction === 'Outbound',
          style: {
            ...(existingEdge.style || {}),
            stroke:
              event.direction === 'Inbound'
                ? '#22c55e'
                : (existingEdge.style as any)?.stroke || baseColor,
            strokeWidth: 2,
          },
        };
        edgeMap.set(edgeId, updated);
      }
    });

    setNodes(Array.from(nodeMap.values()));
    setEdges(Array.from(edgeMap.values()));
  }, [events, selectedNode, setNodes, setEdges]);

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as CustomNodeData;
      if (data?.requestId !== undefined) {
        onNodeClick(data.requestId.toString());
      } else {
        onNodeClick(null);
      }
    },
    [onNodeClick],
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
