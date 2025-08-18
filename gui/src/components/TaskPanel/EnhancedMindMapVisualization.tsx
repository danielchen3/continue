import dagre from "dagre";
import React, { useCallback, useContext, useEffect, useMemo } from "react";
import type { Connection, Edge, Node } from "reactflow";
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { IdeMessengerContext } from "../../context/IdeMessenger";

interface ParsedItem {
  id: string;
  text: string;
  level: number;
  parent?: string;
  type: "requirement" | "task";
}

interface EnhancedMindMapVisualizationProps {
  className?: string;
}

const EnhancedMindMapVisualization: React.FC<
  EnhancedMindMapVisualizationProps
> = ({ className = "" }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const ideMessenger = useContext(IdeMessengerContext);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Parse document content - exactly like mindmap.tsx
  const parseDocument = useCallback((content: string): ParsedItem[] => {
    const lines = content.split("\n");
    const items: ParsedItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Match requirements (R1, R1.1, R1.2 etc)
      const reqMatch = trimmed.match(/^##\s+(R\d+(?:\.\d+)*)\.\s*(.+)$/);
      if (reqMatch) {
        const [, id, text] = reqMatch;
        const level = (id.match(/\./g) || []).length;
        items.push({
          id,
          text: text.trim(),
          level,
          type: "requirement",
        });
        continue;
      }

      // Match sub-requirements (### R1.1, ### R1.2 etc)
      const subReqMatch = trimmed.match(/^###\s+(R\d+\.\d+)\s+(.+)$/);
      if (subReqMatch) {
        const [, id, text] = subReqMatch;
        const level = (id.match(/\./g) || []).length;
        const parentId = id.substring(0, id.lastIndexOf("."));
        items.push({
          id,
          text: text.trim(),
          level,
          parent: parentId,
          type: "requirement",
        });
        continue;
      }

      // Match tasks (T1.1.1, T1.1.2 etc)
      const taskMatch = trimmed.match(/^-\s+(T\d+(?:\.\d+)*)\s+(.+)$/);
      if (taskMatch) {
        const [, id, text] = taskMatch;
        const level = (id.match(/\./g) || []).length;
        // Find corresponding requirement parent (T1.1.1 -> R1.1)
        const parentId = id
          .replace(/^T/, "R")
          .substring(0, id.lastIndexOf("."));
        items.push({
          id,
          text: text.trim(),
          level,
          parent: parentId,
          type: "task",
        });
        continue;
      }
    }

    return items;
  }, []);

  // Use dagre for automatic layout - exactly like mindmap.tsx
  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Set graph direction and spacing
    dagreGraph.setGraph({
      rankdir: "LR", // Left to right
      nodesep: 100, // Node spacing
      ranksep: 200, // Rank spacing
    });

    // Add nodes to dagre graph
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 80 });
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Update node positions
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  }, []);

  // Create nodes and edges - exactly like mindmap.tsx
  const createNodesAndEdges = useCallback(
    (items: ParsedItem[]) => {
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Create all nodes
      items.forEach((item) => {
        newNodes.push({
          id: item.id,
          type: "default",
          position: { x: 0, y: 0 }, // Initial position, will be recalculated by dagre
          data: {
            label: `${item.id}\n${item.text}`,
          },
          style: {
            background: item.type === "requirement" ? "#ffffff" : "#f8fafc",
            color: item.type === "requirement" ? "#1e293b" : "#475569",
            border:
              item.type === "requirement"
                ? "2px solid #667eea"
                : "2px solid #f5576c",
            borderRadius: "8px",
            padding: "12px 16px",
            minWidth: "160px",
            minHeight: "50px",
            fontSize: "12px",
            fontWeight: item.type === "requirement" ? "600" : "500",
            textAlign: "center",
            whiteSpace: "pre-line",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        // Create connection to parent
        if (item.parent) {
          newEdges.push({
            id: `${item.parent}-${item.id}`,
            source: item.parent,
            target: item.id,
            type: "bezier", // Use bezier curves, smoother
            style: {
              stroke: item.type === "requirement" ? "#667eea" : "#f5576c",
              strokeWidth: 2,
              // Remove strokeDasharray - use solid lines
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
              color: item.type === "requirement" ? "#667eea" : "#f5576c",
            },
            animated: true, // Add animation effect
          });
        }
      });

      // Apply dagre layout
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(newNodes, newEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    },
    [setNodes, setEdges, getLayoutedElements],
  );

  // Load document content
  const loadDocument = useCallback(async () => {
    try {
      const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();

      if (workspaceDirs && workspaceDirs.length > 0) {
        const possiblePaths = [
          `${workspaceDirs[0]}/Plan/re-plan.md`,
          `${workspaceDirs[0]}/plan/re-plan.md`,
          `${workspaceDirs[0]}/PLAN/re-plan.md`,
        ];

        let fileFound = false;

        for (const filePath of possiblePaths) {
          try {
            const content = await ideMessenger.ide.readFile(filePath);

            if (content) {
              const parsedItems = parseDocument(content);
              createNodesAndEdges(parsedItems);
              fileFound = true;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        if (!fileFound) {
          // Use example data
          const exampleContent = `
## R1. Frontend Features

### R1.1 Add new tasks to a to-do list

- T1.1.1 Create input field and "Add" button
- T1.1.2 Wire click/Enter to append task to list
- T1.1.3 Validate non-empty title
- T1.1.4 Re-render list after adding

          `;
          const parsedItems = parseDocument(exampleContent);
          createNodesAndEdges(parsedItems);
        }
      }
    } catch (error) {
      console.error("Error loading document:", error);
    }
  }, [ideMessenger, parseDocument, createNodesAndEdges]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Statistics
  const stats = useMemo(() => {
    const requirements = nodes.filter((n) => n.data.label.includes("R")).length;
    const tasks = nodes.filter((n) => n.data.label.includes("T")).length;
    return { requirements, tasks, connections: edges.length };
  }, [nodes, edges]);

  return (
    <div className={`h-full w-full ${className}`} style={{ height: "600px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-left"
        style={{ background: "#f8fafc" }}
      >
        <Controls
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            backdropFilter: "blur(10px)",
          }}
        />
        <MiniMap
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            backdropFilter: "blur(10px)",
          }}
          nodeColor={(node) => {
            const isRequirement = node.data.label.includes("R");
            return isRequirement ? "#667eea" : "#f5576c";
          }}
        />
        <Background gap={16} color="#e2e8f0" style={{ opacity: 0.5 }} />

        {/* Stats Panel using ReactFlow Panel */}
        <Panel
          position="top-right"
          style={{
            background: "rgba(255, 255, 255, 0.6)",
            borderRadius: "8px",
            padding: "8px 12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(30, 41, 59, 0.8)",
              }}
            >
              📊 Mind Map
            </span>
            <button
              onClick={loadDocument}
              style={{
                padding: "2px 6px",
                background: "rgba(102, 126, 234, 0.8)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "500",
                transition: "all 0.2s",
                backdropFilter: "blur(4px)",
              }}
              onMouseOver={(e) =>
                ((e.target as HTMLButtonElement).style.background =
                  "rgba(102, 126, 234, 1)")
              }
              onMouseOut={(e) =>
                ((e.target as HTMLButtonElement).style.background =
                  "rgba(102, 126, 234, 0.8)")
              }
            >
              🔄
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <div
              style={{
                padding: "4px 6px",
                background: "rgba(102, 126, 234, 0.7)",
                color: "white",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "10px",
                minWidth: "40px",
                backdropFilter: "blur(4px)",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "12px" }}>
                {stats.requirements}
              </div>
              <div style={{ opacity: 0.9, fontSize: "9px" }}>Req</div>
            </div>
            <div
              style={{
                padding: "4px 6px",
                background: "rgba(245, 87, 108, 0.7)",
                color: "white",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "10px",
                minWidth: "40px",
                backdropFilter: "blur(4px)",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "12px" }}>
                {stats.tasks}
              </div>
              <div style={{ opacity: 0.9, fontSize: "9px" }}>Tasks</div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default EnhancedMindMapVisualization;
