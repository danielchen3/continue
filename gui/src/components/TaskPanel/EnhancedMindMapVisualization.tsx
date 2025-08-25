import { ChatMessage } from "core";
import { renderChatMessage } from "core/util/messageContent";
import dagre from "dagre";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Connection, Edge, Node, NodeMouseHandler } from "reactflow";
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
import { useAppDispatch } from "../../redux/hooks";
import { streamResponseThunk } from "../../redux/thunks/streamResponse";

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

interface SelectedNode {
  id: string;
  title: string;
  description: string;
  type: "requirement" | "task";
}

interface ChatSession {
  messages: ChatMessage[];
  isLoading: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  selectedNode: SelectedNode | null;
}

const EnhancedMindMapVisualization: React.FC<
  EnhancedMindMapVisualizationProps
> = ({ className = "" }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession>({
    messages: [],
    isLoading: false,
  });
  const [userInput, setUserInput] = useState("");
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selectedNode: null,
  });
  const [quickPrompt, setQuickPrompt] = useState("");

  const ideMessenger = useContext(IdeMessengerContext);
  const dispatch = useAppDispatch();

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Handle node click to select it for chat
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    const nodeData = node.data.label.split("\n");
    const nodeId = nodeData[0];
    const nodeDescription = nodeData.slice(1).join("\n");
    const nodeType = nodeId.startsWith("R") ? "requirement" : "task";

    setSelectedNode({
      id: nodeId,
      title: nodeId,
      description: nodeDescription,
      type: nodeType,
    });
    setShowChatPanel(true);

    // Reset chat session when selecting a new node
    setChatSession({
      messages: [],
      isLoading: false,
    });
  }, []);

  // Handle right-click for context menu
  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();

    const nodeData = node.data.label.split("\n");
    const nodeId = nodeData[0];
    const nodeDescription = nodeData.slice(1).join("\n");
    const nodeType = nodeId.startsWith("R") ? "requirement" : ("task" as const);

    const selectedNodeInfo: SelectedNode = {
      id: nodeId,
      title: nodeId,
      description: nodeDescription,
      type: nodeType,
    };

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      selectedNode: selectedNodeInfo,
    });
  }, []);

  // Send prompt to main chat
  const sendToMainChat = useCallback(
    async (prompt: string, nodeInfo: SelectedNode) => {
      if (!prompt.trim()) return;

      // Create enhanced prompt with context
      const enhancedPrompt = `I'm working on a mind map for project planning. I need help with this ${nodeInfo.type}:

**${nodeInfo.type.toUpperCase()}: ${nodeInfo.title}**
Description: ${nodeInfo.description}

User feedback: ${prompt}

Please help me improve this ${nodeInfo.type} and update the planning document accordingly. If you need to modify the plan file, please make the necessary changes to maintain the project structure.`;

      // Create editor state for TipTap
      const editorState = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: enhancedPrompt }],
          },
        ],
      };

      // Send to main chat using Redux
      try {
        await dispatch(
          streamResponseThunk({
            editorState,
            modifiers: { useCodebase: false, noContext: false },
          }),
        );

        // Close context menu and clear prompt
        setContextMenu({ visible: false, x: 0, y: 0, selectedNode: null });
        setQuickPrompt("");

        // Refresh the mind map after a delay to show updated content
        setTimeout(() => {
          loadDocument();
        }, 2000);
      } catch (error) {
        console.error("Error sending to main chat:", error);
      }
    },
    [dispatch],
  );

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, selectedNode: null });
    };

    if (contextMenu.visible) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Send chat message to AI
  const sendChatMessage = useCallback(
    async (message: string) => {
      if (!selectedNode || !message.trim()) return;

      const userMessage: ChatMessage = {
        role: "user",
        content: message,
      };

      // Add user message to chat
      setChatSession((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
      }));

      setUserInput("");

      try {
        // Create context for the AI about the selected node
        const contextPrompt = `I'm looking at a mind map visualization of requirements and tasks. I have selected the following ${selectedNode.type}:

**${selectedNode.type.toUpperCase()}: ${selectedNode.title}**
Description: ${selectedNode.description}

The user wants to discuss this ${selectedNode.type}. You are an expert in full-stack development, user typically want to know some fundamental knowledge.

User's question: ${message}

Please provide a helpful response about this ${selectedNode.type}.`;

        // Stream response from AI using the same pattern as ProjectStructureGrid
        let description = "";

        const gen = ideMessenger.llmStreamChat(
          {
            completionOptions: {
              maxTokens: 500,
              temperature: 0.7,
            },
            title: `Chat about ${selectedNode.type}: ${selectedNode.title}`,
            messages: [
              {
                role: "user",
                content: contextPrompt,
              },
            ],
          },
          new AbortController().signal,
        );

        let next = await gen.next();
        while (!next.done) {
          // next.value is ChatMessage[] array
          if (Array.isArray(next.value)) {
            for (const aiMessage of next.value) {
              if (aiMessage.role === "assistant" && aiMessage.content) {
                if (typeof aiMessage.content === "string") {
                  description += aiMessage.content;
                } else if (Array.isArray(aiMessage.content)) {
                  // If content is MessagePart[] array
                  for (const part of aiMessage.content) {
                    if (part.type === "text") {
                      description += part.text;
                    }
                  }
                }
              }
            }
          }

          // Update the assistant message in real-time
          if (description) {
            setChatSession((prev) => {
              const messages = [...prev.messages];
              const lastMessage = messages[messages.length - 1];
              if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.content = description;
              } else {
                messages.push({
                  role: "assistant",
                  content: description,
                });
              }
              return {
                ...prev,
                messages,
              };
            });
          }

          next = await gen.next();
        }

        // Clean up response
        description = description.trim().replace(/^["']|["']$/g, "");

        // Final update with cleaned description
        setChatSession((prev) => {
          const messages = [...prev.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content = description;
          } else if (description) {
            messages.push({
              role: "assistant",
              content: description,
            });
          }
          return {
            ...prev,
            messages,
            isLoading: false,
          };
        });
      } catch (error) {
        console.error("Error sending chat message:", error);
        setChatSession((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              role: "assistant",
              content: "Sorry, I encountered an error. Please try again.",
            },
          ],
          isLoading: false,
        }));
      }
    },
    [selectedNode, ideMessenger],
  );

  // Handle Enter key in chat input
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(userInput);
      }
    },
    [userInput, sendChatMessage],
  );

  // Parse document content - exactly like mindmap.tsx
  const parseDocument = useCallback((content: string): ParsedItem[] => {
    const lines = content.split("\n");
    const items: ParsedItem[] = [];
    let currentRequirement: string | null = null;

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
        currentRequirement = id; // Update current requirement context
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
        currentRequirement = id; // Update current requirement context
        continue;
      }

      // Match tasks (T1.1.1, T1.1.2 etc)
      const taskMatch = trimmed.match(/^-\s+(T\d+(?:\.\d+)*)\s+(.+)$/);
      if (taskMatch) {
        const [, id, text] = taskMatch;
        const level = (id.match(/\./g) || []).length;
        // Use the current requirement context as parent instead of deriving from task ID
        // Only add task if we have a current requirement context
        if (currentRequirement) {
          items.push({
            id,
            text: text.trim(),
            level,
            parent: currentRequirement,
            type: "task",
          });
        }
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
            cursor: "pointer",
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

### R1.1 Users can add tasks to a todo list
- T1.5.1 Scaffold React UI & state management
- T1.6.2 Implement API for adding tasks

### R1.2 Users can delete tasks from the list
- T1.5.1 Scaffold React UI & state management
- T1.6.3 Implement API for deleting tasks

### R1.3 Users can mark tasks as finished/unfinished
- T1.5.1 Scaffold React UI & state management
- T1.6.4 Implement API for marking tasks finished/unfinished
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
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
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

        {/* Stats Panel */}
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
              📊 Interactive Mind Map
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

          {!showChatPanel && (
            <div
              style={{
                fontSize: "9px",
                color: "rgba(30, 41, 59, 0.6)",
                marginBottom: "6px",
                fontStyle: "italic",
              }}
            >
              💡 Click any node to chat with AI
            </div>
          )}

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

        {/* Interactive Chat Panel */}
        {showChatPanel && selectedNode && (
          <Panel
            position="bottom-right"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "8px",
              padding: "16px",
              width: "400px",
              height: "300px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Chat Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  💬 {selectedNode.type === "requirement" ? "📋" : "🎯"}{" "}
                  {selectedNode.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  {selectedNode.description}
                </div>
              </div>
              <button
                onClick={() => setShowChatPanel(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: "12px",
                fontSize: "12px",
                scrollBehavior: "smooth",
              }}
            >
              {chatSession.messages.length === 0 && !chatSession.isLoading && (
                <div
                  style={{
                    color: "#64748b",
                    fontStyle: "italic",
                    textAlign: "center",
                    marginTop: "20px",
                  }}
                >
                  Ask a question about this {selectedNode.type}...
                  <br />
                  <small>
                    💡 Try: "What does this mean?" or "How can I improve this?"
                  </small>
                </div>
              )}
              {chatSession.messages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "8px",
                    padding: "8px",
                    borderRadius: "6px",
                    background:
                      message.role === "user"
                        ? "rgba(102, 126, 234, 0.1)"
                        : "rgba(245, 87, 108, 0.1)",
                    border:
                      message.role === "user"
                        ? "1px solid rgba(102, 126, 234, 0.2)"
                        : "1px solid rgba(245, 87, 108, 0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "600",
                      color: message.role === "user" ? "#667eea" : "#f5576c",
                      marginBottom: "4px",
                    }}
                  >
                    {message.role === "user" ? "👤 You" : "🤖 Assistant"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {typeof message.content === "string"
                      ? message.content
                      : typeof message.content === "object" &&
                          Array.isArray(message.content)
                        ? message.content
                            .map((part) =>
                              part.type === "text" ? part.text : "",
                            )
                            .join("")
                        : renderChatMessage(message)}
                  </div>
                </div>
              ))}
              {chatSession.isLoading && (
                <div
                  style={{
                    color: "#64748b",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "12px",
                    background: "rgba(245, 87, 108, 0.05)",
                    borderRadius: "6px",
                    border: "1px solid rgba(245, 87, 108, 0.1)",
                  }}
                >
                  <div style={{ marginBottom: "4px" }}>🤖 Assistant</div>
                  <div>🤔 Thinking...</div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div style={{ display: "flex", gap: "8px" }}>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask about ${selectedNode.title}...`}
                disabled={chatSession.isLoading}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: "4px",
                  fontSize: "12px",
                  resize: "none",
                  height: "60px",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => sendChatMessage(userInput)}
                disabled={chatSession.isLoading || !userInput.trim()}
                style={{
                  padding: "8px 12px",
                  background:
                    chatSession.isLoading || !userInput.trim()
                      ? "#94a3b8"
                      : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    chatSession.isLoading || !userInput.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                  height: "60px",
                  minWidth: "60px",
                }}
              >
                {chatSession.isLoading ? "..." : "📤"}
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 340),
            top: Math.min(contextMenu.y, window.innerHeight - 220),
            transform: "translate(-50%, -20px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3">
            <h3 className="mb-1 text-sm font-semibold text-gray-800">
              AI Assistant
            </h3>
            <p className="text-xs text-gray-600">
              {contextMenu.selectedNode?.type.toUpperCase()}:{" "}
              {contextMenu.selectedNode?.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
              {contextMenu.selectedNode?.description}
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              className="mx-auto block w-64 resize-none rounded-md border border-gray-300 p-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="How would you like to improve this item?"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              autoFocus
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() =>
                  setContextMenu({
                    visible: false,
                    x: 0,
                    y: 0,
                    selectedNode: null,
                  })
                }
                className="px-3 py-1 text-xs text-gray-600 transition-colors hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  contextMenu.selectedNode &&
                  sendToMainChat(quickPrompt, contextMenu.selectedNode)
                }
                disabled={!quickPrompt.trim()}
                className="rounded-md bg-blue-500 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMindMapVisualization;
