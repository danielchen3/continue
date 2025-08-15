import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  Panel,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { RequirementItem, TaskItem } from "./RequirementsTaskAlignment";

// ReactFlow styles
const reactFlowStyle = {
  backgroundColor: "#1e1e1e",
  ".react-flow__edge": {
    zIndex: 1,
  },
  ".react-flow__node": {
    zIndex: 2,
  },
  ".react-flow__edge-path": {
    stroke: "#ffffff",
    strokeWidth: 2,
  },
};

interface ReactFlowVisualizationProps {
  requirements: RequirementItem[];
  className?: string;
}

// Custom node styles - compact design
const nodeStyles = {
  requirement: {
    background: "linear-gradient(135deg, #007acc, #005999)",
    color: "white",
    border: "2px solid #007acc",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "bold",
    minWidth: "100px",
    maxWidth: "140px",
    textAlign: "center" as const,
  },
  subRequirement: {
    background: "linear-gradient(135deg, #4CAF50, #45a049)",
    color: "white",
    border: "2px solid #4CAF50",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: "500",
    minWidth: "90px",
    maxWidth: "130px",
    textAlign: "center" as const,
  },
  task: {
    background: "linear-gradient(135deg, #FF9800, #F57C00)",
    color: "white",
    border: "2px solid #FF9800",
    borderRadius: "4px",
    padding: "5px 8px",
    fontSize: "10px",
    minWidth: "80px",
    maxWidth: "120px",
    textAlign: "center" as const,
  },
};

// Custom node component with tooltip
const CustomNode = ({ data, type }: { data: any; type: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const style = nodeStyles[type as keyof typeof nodeStyles] || nodeStyles.task;

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={style}>
        <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{data.id}</div>
        <div style={{ fontSize: "9px", opacity: 0.9 }}>
          {data.label.length > 15
            ? data.label.substring(0, 15) + "..."
            : data.label}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "110%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2d2d2d",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            maxWidth: "300px",
            border: "1px solid #404040",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            {data.id}
          </div>
          <div>{data.fullTitle}</div>
          {data.description && (
            <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "4px" }}>
              {data.description}
            </div>
          )}
          {/* Small arrow */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #2d2d2d",
            }}
          />
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  requirement: (props: any) => <CustomNode {...props} type="requirement" />,
  subRequirement: (props: any) => (
    <CustomNode {...props} type="subRequirement" />
  ),
  task: (props: any) => <CustomNode {...props} type="task" />,
};

export function ReactFlowVisualization({
  requirements,
  className = "",
}: ReactFlowVisualizationProps) {
  // Generate nodes and edges with spacious layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Debug logging
    console.log("🔧 ReactFlow: Starting visualization generation...");
    console.log("🔧 ReactFlow: Input requirements:", requirements.length);

    // Spacious layout parameters for better visibility
    const MAIN_REQ_X = 50;
    const SUB_REQ_X_BASE = 400;
    const SUB_REQ_X_SPACING = 150;
    const TASK_X_BASE = 800;
    const TASK_X_SPACING = 120;
    const VERTICAL_SPACING = 180;
    const SUB_REQ_SPACING = 120;
    const TASK_SPACING = 90;

    // Group by main requirements
    const mainRequirements = requirements.filter(
      (req) => !req.id.includes(".") || req.id.match(/^R\d+$/),
    );
    const subRequirements = requirements.filter(
      (req) => req.id.includes(".") && req.id.match(/^R\d+\.\d+$/),
    );

    let currentY = 50;

    mainRequirements.forEach((mainReq) => {
      // Find related sub-requirements
      const relatedSubReqs = subRequirements.filter((subReq) =>
        subReq.id.startsWith(mainReq.id + "."),
      );

      // Calculate total height needed for this main requirement group
      const totalTasks = relatedSubReqs.reduce(
        (sum, subReq) => sum + (subReq.alignedTasks?.length || 0),
        0,
      );
      const groupHeight = Math.max(
        relatedSubReqs.length * SUB_REQ_SPACING,
        totalTasks * TASK_SPACING,
      );

      // Main requirement node at group center
      const mainReqY = currentY + groupHeight / 2;

      nodes.push({
        id: mainReq.id,
        type: "requirement",
        position: { x: MAIN_REQ_X, y: mainReqY },
        data: {
          id: mainReq.id,
          label:
            mainReq.title.length > 16
              ? mainReq.title.substring(0, 16) + "..."
              : mainReq.title,
          fullTitle: mainReq.title,
          description: mainReq.description,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      // Sub-requirement nodes - spread horizontally and vertically
      let subReqY = currentY;
      relatedSubReqs.forEach((subReq, subIndex) => {
        // Calculate horizontal offset for sub-requirements
        const subReqX = SUB_REQ_X_BASE + (subIndex % 2) * SUB_REQ_X_SPACING;
        // Add slight vertical offset for every other sub-req
        const subReqYOffset = Math.floor(subIndex / 2) * SUB_REQ_SPACING;

        nodes.push({
          id: subReq.id,
          type: "subRequirement",
          position: { x: subReqX, y: subReqY + subReqYOffset },
          data: {
            id: subReq.id,
            label:
              subReq.title.length > 20
                ? subReq.title.substring(0, 20) + "..."
                : subReq.title,
            fullTitle: subReq.title,
            description: subReq.description,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        // Main requirement to sub-requirement connection - visible styling
        edges.push({
          id: `${mainReq.id}-${subReq.id}`,
          source: mainReq.id,
          target: subReq.id,
          type: "default",
          style: {
            stroke: "#2E86AB",
            strokeWidth: 4,
            strokeDasharray: "5,5",
          },
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#2E86AB",
            width: 25,
            height: 25,
          },
          label: "Implements",
          labelStyle: {
            fill: "#2E86AB",
            fontSize: "13px",
            fontWeight: "600",
            backgroundColor: "#ffffff",
            padding: "2px 6px",
            borderRadius: "3px",
          },
        });

        // Task nodes - spread based on sub-requirement position
        if (subReq.alignedTasks && subReq.alignedTasks.length > 0) {
          const currentSubReqY =
            subReqY + Math.floor(subIndex / 2) * SUB_REQ_SPACING;
          let taskY =
            currentSubReqY -
            ((subReq.alignedTasks.length - 1) * TASK_SPACING) / 2;

          subReq.alignedTasks.forEach((task: TaskItem, taskIndex: number) => {
            // Calculate task X position based on sub-req position and task index
            const taskX =
              TASK_X_BASE +
              (subIndex % 2) * TASK_X_SPACING +
              (taskIndex % 3) * (TASK_X_SPACING / 2);

            nodes.push({
              id: task.id,
              type: "task",
              position: { x: taskX, y: taskY },
              data: {
                id: task.id,
                label:
                  task.title.length > 22
                    ? task.title.substring(0, 22) + "..."
                    : task.title,
                fullTitle: task.title,
                description: task.description,
              },
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            });

            // Sub-requirement to task connection - visible styling
            edges.push({
              id: `${subReq.id}-${task.id}`,
              source: subReq.id,
              target: task.id,
              type: "default",
              style: {
                stroke: "#28A745",
                strokeWidth: 3,
                strokeDasharray: "10,3",
              },
              animated: false,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "#28A745",
                width: 20,
                height: 20,
              },
              label: "Fulfills",
              labelStyle: {
                fill: "#28A745",
                fontSize: "12px",
                fontWeight: "500",
                backgroundColor: "#ffffff",
                padding: "1px 4px",
                borderRadius: "2px",
              },
            });

            taskY += TASK_SPACING;
          });
        }
      });

      // Calculate actual height used by this group considering spread layout
      const actualGroupHeight = Math.max(
        Math.ceil(relatedSubReqs.length / 2) * SUB_REQ_SPACING,
        relatedSubReqs.reduce((maxHeight, subReq, idx) => {
          const subReqTasks = subReq.alignedTasks?.length || 0;
          const subReqYOffset = Math.floor(idx / 2) * SUB_REQ_SPACING;
          return Math.max(
            maxHeight,
            subReqYOffset + subReqTasks * TASK_SPACING,
          );
        }, 0),
      );

      currentY += actualGroupHeight + VERTICAL_SPACING;
    });

    // Remove complex test edges, keep simple
    console.log("🔧 ReactFlow: Generated nodes:", nodes.length);
    console.log("🔧 ReactFlow: Generated edges:", edges.length);

    return { nodes, edges };
  }, [requirements]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 调试信息状态
  const [debugInfo, setDebugInfo] = useState<string>("");

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // 统计信息和调试
  const stats = useMemo(() => {
    const totalTasks = requirements.reduce(
      (sum, req) => sum + (req.alignedTasks?.length || 0),
      0,
    );

    // Generate debug information
    const nodeIds = new Set(nodes.map((n) => n.id));
    const invalidEdges = edges.filter(
      (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target),
    );

    let debugText = `📊 Data Statistics:\n`;
    debugText += `Nodes: ${nodes.length}, Edges: ${edges.length}, Invalid Edges: ${invalidEdges.length}\n\n`;

    debugText += `🎯 First 5 Nodes:\n`;
    nodes.slice(0, 5).forEach((node, i) => {
      debugText += `${i + 1}. ${node.id} (${node.type})\n`;
    });

    debugText += `\n🔗 First 5 Edges:\n`;
    edges.slice(0, 5).forEach((edge, i) => {
      const sourceOK = nodeIds.has(edge.source) ? "✅" : "❌";
      const targetOK = nodeIds.has(edge.target) ? "✅" : "❌";
      debugText += `${i + 1}. ${edge.source} → ${edge.target} ${sourceOK}${targetOK}\n`;
    });

    if (invalidEdges.length > 0) {
      debugText += `\n❌ Invalid Edges:\n`;
      invalidEdges.slice(0, 3).forEach((edge, i) => {
        debugText += `${i + 1}. ${edge.source} → ${edge.target}\n`;
      });
    }

    setDebugInfo(debugText);

    return {
      requirements: requirements.length,
      tasks: totalTasks,
      connections: edges.length,
    };
  }, [requirements, edges, nodes]);

  return (
    <div
      className={`h-full w-full ${className}`}
      style={{
        height: "800px", // Increased height for better visibility
        width: "100%",
      }}
    >
      {/* 添加拖动功能和优化的ReactFlow配置 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        style={{ backgroundColor: "#f0f0f0" }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        defaultEdgeOptions={{
          type: "default", // Changed to default for cleaner lines
          animated: false,
          style: {
            stroke: "#666666", // Neutral gray for default edges
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#666666",
            width: 20,
            height: 20,
          },
        }}
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel
          position="top-right"
          className="bg-vsc-input-background border-vsc-input-border max-w-sm rounded border p-2"
        >
          <div className="text-vsc-foreground space-y-1 text-xs">
            <div className="font-medium">Flow Chart Statistics</div>
            <div className="text-vsc-descriptionForeground flex items-center space-x-4">
              <span>📋 Requirements: {stats.requirements}</span>
              <span>📝 Tasks: {stats.tasks}</span>
              <span>🔗 Connections: {stats.connections}</span>
            </div>
            <div className="text-xs">
              {stats.connections === 0 ? (
                <span className="text-yellow-400">⚠️ No connection data</span>
              ) : (
                <span className="text-green-400">✅ Connections visible</span>
              )}
            </div>

            {/* 调试信息区域 */}
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                🔍 Debug Info
              </summary>
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-gray-800 p-2 text-xs text-white">
                {debugInfo}
              </pre>
            </details>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
