// ProjectDescriptionVisualization.tsx - 专门用于可视化项目描述纯文本的组件
import dagre from "dagre";
import React, { useCallback, useMemo } from "react";
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

interface ParsedProjectItem {
  id: string;
  text: string;
  type: "project" | "tech" | "module" | "method" | "connection";
  category?: "frontend" | "backend" | "database" | "config";
  level: number;
  parent?: string;
  metadata?: any;
}

interface ProjectDescriptionVisualizationProps {
  analysisResult: string;
  className?: string;
}

const ProjectDescriptionVisualization: React.FC<
  ProjectDescriptionVisualizationProps
> = ({ analysisResult, className = "" }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // 解析项目描述文本 - 从纯文本或JSON中提取结构化信息
  const parseProjectDescription = useCallback(
    (content: string): ParsedProjectItem[] => {
      const items: ParsedProjectItem[] = [];

      console.log("Parsing content:", content.substring(0, 200) + "...");

      // 首先尝试解析JSON格式
      try {
        const jsonMatch =
          content.match(/```json\n([\s\S]*?)\n```/) ||
          content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysisData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          console.log("Successfully parsed JSON data:", analysisData);

          // 从JSON数据创建可视化项目
          if (analysisData.project_name) {
            items.push({
              id: "project",
              text: analysisData.project_name,
              type: "project",
              level: 0,
            });
          }

          // 技术栈
          if (analysisData.tech_stack) {
            const allTech = [
              ...(analysisData.tech_stack.frontend || []),
              ...(analysisData.tech_stack.backend || []),
              ...(analysisData.tech_stack.other || []),
            ];
            allTech.forEach((tech: string, idx: number) => {
              items.push({
                id: `tech-${idx}`,
                text: tech,
                type: "tech",
                level: 1,
                parent: "project",
              });
            });
          }

          // 前端组件
          if (analysisData.structure?.frontend) {
            items.push({
              id: "frontend",
              text: "Frontend Modules",
              type: "module",
              category: "frontend",
              level: 1,
              parent: "project",
            });

            analysisData.structure.frontend.forEach(
              (component: any, idx: number) => {
                const fileId = `frontend-file-${idx}`;
                items.push({
                  id: fileId,
                  text: `${component.file} - ${component.description}`,
                  type: "module",
                  category: "frontend",
                  level: 2,
                  parent: "frontend",
                  metadata: {
                    fileName: component.file,
                    description: component.description,
                  },
                });

                // 添加方法
                if (component.methods) {
                  component.methods.forEach(
                    (method: any, methodIdx: number) => {
                      items.push({
                        id: `method-${fileId}-${methodIdx}`,
                        text: `${method.name}() - ${method.description}`,
                        type: "method",
                        category: "frontend",
                        level: 3,
                        parent: fileId,
                      });
                    },
                  );
                }
              },
            );
          }

          // 后端组件
          if (analysisData.structure?.backend) {
            items.push({
              id: "backend",
              text: "Backend Modules",
              type: "module",
              category: "backend",
              level: 1,
              parent: "project",
            });

            analysisData.structure.backend.forEach(
              (component: any, idx: number) => {
                const fileId = `backend-file-${idx}`;
                items.push({
                  id: fileId,
                  text: `${component.file} - ${component.description}`,
                  type: "module",
                  category: "backend",
                  level: 2,
                  parent: "backend",
                  metadata: {
                    fileName: component.file,
                    description: component.description,
                  },
                });

                // 添加路由
                if (component.routes) {
                  component.routes.forEach((route: any, routeIdx: number) => {
                    items.push({
                      id: `route-${fileId}-${routeIdx}`,
                      text: `${route.method} ${route.path}`,
                      type: "connection",
                      category: "backend",
                      level: 3,
                      parent: fileId,
                    });
                  });
                }

                // 添加方法
                if (component.methods) {
                  component.methods.forEach(
                    (method: any, methodIdx: number) => {
                      items.push({
                        id: `method-${fileId}-${methodIdx}`,
                        text: `${method.name}() - ${method.description}`,
                        type: "method",
                        category: "backend",
                        level: 3,
                        parent: fileId,
                      });
                    },
                  );
                }
              },
            );
          }

          // 数据库模型
          if (analysisData.structure?.database) {
            items.push({
              id: "database",
              text: "Database Modules",
              type: "module",
              category: "database",
              level: 1,
              parent: "project",
            });

            analysisData.structure.database.forEach(
              (model: any, idx: number) => {
                items.push({
                  id: `db-model-${idx}`,
                  text: `${model.model} - ${model.description}`,
                  type: "module",
                  category: "database",
                  level: 2,
                  parent: "database",
                });
              },
            );
          }

          console.log("Created items from JSON:", items);
          return items;
        }
      } catch (error) {
        console.log("JSON parsing failed, creating simple text nodes:", error);
      }

      // 如果JSON解析失败，创建一个简单的文本显示节点
      const lines = content.split("\n").filter((line) => line.trim());

      // 创建根节点
      items.push({
        id: "ai-output",
        text: "AI 分析结果",
        type: "project",
        level: 0,
      });

      // 为每个非空行创建一个节点
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed && idx < 15) {
          // 限制显示前15行，避免过多
          items.push({
            id: `line-${idx}`,
            text:
              trimmed.length > 80 ? trimmed.substring(0, 80) + "..." : trimmed,
            type: "method",
            level: 1,
            parent: "ai-output",
          });
        }
      });

      console.log("Created items from text:", items);
      return items;
    },
    [],
  );

  // 使用 dagre 进行自动布局
  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // 设置图的方向和间距
    dagreGraph.setGraph({
      rankdir: "TB", // 从上到下
      nodesep: 150, // 节点间距
      ranksep: 100, // 层级间距
    });

    // 添加节点到 dagre 图
    nodes.forEach((node) => {
      const width = Math.max(200, node.data.label.length * 8);
      const height = node.data.type === "project" ? 100 : 80;
      dagreGraph.setNode(node.id, { width, height });
    });

    // 添加边到 dagre 图
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // 计算布局
    dagre.layout(dagreGraph);

    // 更新节点位置
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

  // 创建节点和边
  const createNodesAndEdges = useCallback(
    (items: ParsedProjectItem[]) => {
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // 创建所有节点
      items.forEach((item) => {
        const nodeStyle = {
          background: getNodeBackground(item.type, item.category),
          color: getNodeTextColor(item.type),
          border: getNodeBorder(item.type, item.category),
          borderRadius: "8px",
          padding: item.type === "project" ? "16px 20px" : "12px 16px",
          minWidth: item.type === "project" ? "300px" : "180px",
          minHeight: item.type === "project" ? "80px" : "60px",
          fontSize: item.type === "project" ? "16px" : "12px",
          fontWeight:
            item.type === "project"
              ? "700"
              : item.type === "module"
                ? "600"
                : "500",
          textAlign: "center" as const,
          whiteSpace: "pre-line" as const,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        };

        newNodes.push({
          id: item.id,
          type: "default",
          position: { x: 0, y: 0 }, // 初始位置，将由 dagre 重新计算
          data: {
            label: item.text,
            type: item.type,
            category: item.category,
          },
          style: nodeStyle,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        // 创建到父节点的连接
        if (item.parent) {
          newEdges.push({
            id: `${item.parent}-${item.id}`,
            source: item.parent,
            target: item.id,
            type: "smoothstep",
            style: {
              stroke: getEdgeColor(item.type, item.category),
              strokeWidth: getEdgeWidth(item.type),
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
              color: getEdgeColor(item.type, item.category),
            },
            animated: item.type === "connection",
          });
        }
      });

      // 应用 dagre 布局
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(newNodes, newEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    },
    [setNodes, setEdges, getLayoutedElements],
  );

  // 样式辅助函数
  const getNodeBackground = (type: string, category?: string): string => {
    if (type === "project") return "#ffffff";
    if (type === "tech") return "#f8fafc";
    if (type === "module") {
      switch (category) {
        case "frontend":
          return "#ecfdf5";
        case "backend":
          return "#ede9fe";
        case "database":
          return "#fff7ed";
        default:
          return "#f1f5f9";
      }
    }
    return "#fafafa";
  };

  const getNodeTextColor = (type: string): string => {
    if (type === "project") return "#1e293b";
    return "#475569";
  };

  const getNodeBorder = (type: string, category?: string): string => {
    if (type === "project") return "3px solid #3b82f6";
    if (type === "tech") return "2px solid #94a3b8";
    if (type === "module") {
      switch (category) {
        case "frontend":
          return "2px solid #10b981";
        case "backend":
          return "2px solid #8b5cf6";
        case "database":
          return "2px solid #f97316";
        default:
          return "2px solid #6b7280";
      }
    }
    return "1px solid #cbd5e1";
  };

  const getEdgeColor = (type: string, category?: string): string => {
    if (type === "connection") return "#ef4444";
    if (type === "module") {
      switch (category) {
        case "frontend":
          return "#10b981";
        case "backend":
          return "#8b5cf6";
        case "database":
          return "#f97316";
        default:
          return "#6b7280";
      }
    }
    return "#94a3b8";
  };

  const getEdgeWidth = (type: string): number => {
    if (type === "project" || type === "module") return 3;
    if (type === "connection") return 2;
    return 1;
  };

  // 解析并创建可视化
  React.useEffect(() => {
    console.log(
      "ProjectDescriptionVisualization received data:",
      analysisResult,
    );
    if (analysisResult) {
      const parsedItems = parseProjectDescription(analysisResult);
      console.log("Parsed items:", parsedItems);
      createNodesAndEdges(parsedItems);
    } else {
      console.log("No analysis result provided");
      // 如果没有数据，创建一个空的提示
      const emptyItems: ParsedProjectItem[] = [
        {
          id: "empty",
          text: "Please run AI Analysis first to generate project description visualization",
          type: "project",
          level: 0,
        },
      ];
      createNodesAndEdges(emptyItems);
    }
  }, [analysisResult, parseProjectDescription, createNodesAndEdges]);

  // 统计信息
  const stats = useMemo(() => {
    const projectNodes = nodes.filter((n) => n.data.type === "project").length;
    const moduleNodes = nodes.filter((n) => n.data.type === "module").length;
    const methodNodes = nodes.filter((n) => n.data.type === "method").length;
    const techNodes = nodes.filter((n) => n.data.type === "tech").length;
    return {
      project: projectNodes,
      modules: moduleNodes,
      methods: methodNodes,
      tech: techNodes,
      connections: edges.length,
    };
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
            const type = node.data.type;
            const category = node.data.category;

            if (type === "project") return "#3b82f6";
            if (type === "tech") return "#94a3b8";
            if (type === "module") {
              switch (category) {
                case "frontend":
                  return "#10b981";
                case "backend":
                  return "#8b5cf6";
                case "database":
                  return "#f97316";
                default:
                  return "#6b7280";
              }
            }
            return "#cbd5e1";
          }}
        />
        <Background gap={16} color="#e2e8f0" style={{ opacity: 0.5 }} />

        {/* 统计面板 */}
        <Panel
          position="top-right"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
            padding: "12px 16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            fontSize: "12px",
            minWidth: "160px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(30, 41, 59, 0.8)",
              }}
            >
              📋 Project Architecture
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <div
              style={{
                padding: "4px 8px",
                background: "rgba(59, 130, 246, 0.8)",
                color: "white",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "10px",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "12px" }}>
                {stats.project}
              </div>
              <div style={{ opacity: 0.9, fontSize: "9px" }}>Project</div>
            </div>
            <div
              style={{
                padding: "4px 8px",
                background: "rgba(16, 185, 129, 0.8)",
                color: "white",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "10px",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "12px" }}>
                {stats.modules}
              </div>
              <div style={{ opacity: 0.9, fontSize: "9px" }}>Module</div>
            </div>
            <div
              style={{
                padding: "4px 8px",
                background: "rgba(139, 92, 246, 0.8)",
                color: "white",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "10px",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "12px" }}>
                {stats.methods}
              </div>
              <div style={{ opacity: 0.9, fontSize: "9px" }}>Method</div>
            </div>
            <div
              style={{
                padding: "4px 8px",
                background: "rgba(249, 115, 22, 0.8)",
                color: "white",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "10px",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "12px" }}>
                {stats.tech}
              </div>
              <div style={{ opacity: 0.9, fontSize: "9px" }}>Technology</div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default ProjectDescriptionVisualization;
