import {
  CircleStackIcon,
  CogIcon,
  CpuChipIcon,
  DocumentIcon,
  FolderIcon,
  GlobeAltIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useContext, useEffect, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import FileIcon from "../FileIcon";
import { descriptionCache } from "./ProjectStructurePanel";
import { FULL_STACK_ANALYSIS_PROMPT } from "./analysisPrompt";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  description?: string;
  category?: "frontend" | "backend" | "database" | "config" | "docs" | "assets";
}

interface ProjectStructureFlowProps {
  isCollapsed: boolean;
}

const nodeTypes = {
  customFolder: FolderNode,
  customFile: FileNodeComponent,
};

// Custom folder node component
function FolderNode({ data }: { data: any }) {
  return (
    <div className="min-w-[120px] rounded-lg border-2 border-blue-300 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <FolderIcon className="h-5 w-5" />
        <span className="text-sm font-semibold">{data.label}</span>
      </div>
      {data.description && (
        <div className="mt-1 text-xs opacity-90">{data.description}</div>
      )}
    </div>
  );
}

// Custom file node component
function FileNodeComponent({ data }: { data: any }) {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const ideMessenger = useContext(IdeMessengerContext);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "frontend":
        return "from-green-500 to-green-600 border-green-300";
      case "backend":
        return "from-purple-500 to-purple-600 border-purple-300";
      case "database":
        return "from-orange-500 to-orange-600 border-orange-300";
      case "config":
        return "from-gray-500 to-gray-600 border-gray-300";
      case "docs":
        return "from-yellow-500 to-yellow-600 border-yellow-300";
      case "project":
        return "from-blue-500 to-blue-600 border-blue-300";
      case "assets":
        return "from-pink-500 to-pink-600 border-pink-300";
      default:
        return "from-indigo-500 to-indigo-600 border-indigo-300";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "frontend":
        return <GlobeAltIcon className="h-4 w-4" />;
      case "backend":
        return <CpuChipIcon className="h-4 w-4" />;
      case "database":
        return <CircleStackIcon className="h-4 w-4" />;
      case "config":
        return <CogIcon className="h-4 w-4" />;
      case "project":
        return <FolderIcon className="h-4 w-4" />;
      case "docs":
        return <DocumentIcon className="h-4 w-4" />;
      default:
        return <FileIcon filename={data.label} height="16px" width="16px" />;
    }
  };

  const generateAIDescription = async (
    filePath: string,
    forceRegenerate = false,
  ) => {
    if (!ideMessenger) {
      console.log("No ideMessenger available");
      return;
    }

    console.log(
      "Generating AI description for:",
      filePath,
      "Force regenerate:",
      forceRegenerate,
    );

    if (!forceRegenerate && descriptionCache.has(filePath)) {
      console.log("Description already cached for:", filePath);
      return;
    }

    setIsGeneratingDescription(true);

    try {
      const fileContent = await ideMessenger.ide.readFile(filePath);
      const filename = filePath.split("/").pop() || "";
      const ext = filename.split(".").pop()?.toLowerCase();

      const prompt = `You are a code analysis expert. Analyze this ${ext || "file"} and provide a clear, precise description of what it does.

File: ${filename}
Content:
${fileContent}

Please provide a concise 1-2 sentence description focusing on the main functionality and purpose.`;

      let fullResponse = "";
      const gen = ideMessenger.llmStreamChat(
        {
          completionOptions: {
            maxTokens: 100,
            temperature: 0.3,
          },
          title: "File Description Generator",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        },
        new AbortController().signal,
      );

      let next = await gen.next();
      while (!next.done && next.value) {
        if (Array.isArray(next.value) && next.value.length > 0) {
          const latestMessage = next.value[next.value.length - 1];
          if (latestMessage?.content) {
            fullResponse += latestMessage.content;
          }
        }
        next = await gen.next();
      }

      if (fullResponse.trim()) {
        descriptionCache.set(filePath, fullResponse.trim());
        // 触发Flow组件重新构建数据
        window.dispatchEvent(new CustomEvent("refreshProjectFlow"));
      }
    } catch (error) {
      console.error("Error generating AI description:", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <div
      className={`bg-gradient-to-r ${getCategoryColor(data.category)} relative min-w-[100px] rounded-md border-2 px-3 py-2 text-white shadow-md`}
    >
      <div className="flex items-center gap-2">
        {getCategoryIcon(data.category)}
        <span className="truncate text-xs font-medium">{data.label}</span>
        {data.type === "file" && (
          <button
            onClick={() => generateAIDescription(data.path, true)}
            disabled={isGeneratingDescription}
            className="ml-1 rounded bg-white/20 px-1 py-0.5 text-xs opacity-70 hover:opacity-100 disabled:opacity-50"
            title="Generate AI description"
          >
            {isGeneratingDescription ? "..." : "AI"}
          </button>
        )}
      </div>
      {data.description && (
        <div className="mt-1 line-clamp-2 text-xs opacity-90">
          {data.description}
        </div>
      )}
    </div>
  );
}

export function ProjectStructureFlow({
  isCollapsed,
}: ProjectStructureFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [originalNodes, setOriginalNodes] = useState<Node[]>([]);
  const [originalEdges, setOriginalEdges] = useState<Edge[]>([]); // 存储解析后的分析数据
  const [refreshKey, setRefreshKey] = useState(0);
  const ideMessenger = useContext(IdeMessengerContext);

  // File classification logic
  const categorizeFile = (path: string, content?: string): string => {
    const filename = path.split("/").pop() || "";
    const ext = filename.split(".").pop()?.toLowerCase();

    // Classify by path
    if (
      path.includes("/frontend/") ||
      path.includes("/client/") ||
      path.includes("/web/") ||
      path.includes("/gui/")
    ) {
      return "frontend";
    }
    if (
      path.includes("/backend/") ||
      path.includes("/server/") ||
      path.includes("/api/") ||
      path.includes("/core/")
    ) {
      return "backend";
    }
    if (
      path.includes("/database/") ||
      path.includes("/db/") ||
      path.includes("/models/")
    ) {
      return "database";
    }
    if (path.includes("/docs/") || path.includes("/documentation/")) {
      return "docs";
    }
    if (
      path.includes("/assets/") ||
      path.includes("/static/") ||
      path.includes("/public/")
    ) {
      return "assets";
    }

    // Classify by file type
    switch (ext) {
      case "tsx":
      case "jsx":
      case "vue":
      case "html":
      case "css":
      case "scss":
      case "sass":
        return "frontend";
      case "py":
      case "java":
      case "go":
      case "rs":
      case "cpp":
      case "c":
        return "backend";
      case "sql":
      case "db":
        return "database";
      case "json":
      case "yaml":
      case "yml":
      case "toml":
      case "ini":
        return "config";
      case "md":
      case "txt":
      case "rst":
        return "docs";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "ico":
        return "assets";
      default:
        if (content?.includes("React") || content?.includes("jsx"))
          return "frontend";
        if (content?.includes("express") || content?.includes("fastapi"))
          return "backend";
        return "config";
    }
  };

  // Generate simplified file description
  const generateDescription = (filename: string, content?: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();

    if (filename === "package.json") return "NPM config";
    if (filename === "README.md") return "Project docs";
    if (filename === "tsconfig.json") return "TS config";
    if (filename.includes("docker")) return "Docker config";

    switch (ext) {
      case "tsx":
        return "React component";
      case "ts":
        return "TypeScript";
      case "js":
        return "JavaScript";
      case "py":
        return "Python script";
      case "java":
        return "Java class";
      case "html":
        return "HTML page";
      case "css":
        return "Stylesheet";
      case "json":
        return "JSON config";
      case "md":
        return "Documentation";
      default:
        return ext?.toUpperCase() || "File";
    }
  };

  // Get description from cache or generate simplified description
  const getFileDescription = (
    filePath: string,
    filename: string,
    content?: string,
  ): string => {
    // First check AI description cache
    if (descriptionCache.has(filePath)) {
      return descriptionCache.get(filePath)!;
    }
    // Otherwise return simplified description
    return generateDescription(filename, content);
  };

  // AI full-stack project analysis - using Continue's native approach
  const analyzeFullStackProject = async () => {
    if (!ideMessenger) return;

    setIsAnalyzing(true);
    try {
      // Professional full-stack project analysis prompt
      const userPrompt = FULL_STACK_ANALYSIS_PROMPT;

      // Use @codebase Context Provider to get project content - using Continue's native approach
      const codebaseContext = await ideMessenger.request(
        "context/getContextItems",
        {
          name: "codebase",
          query: "", // CodebaseContextProvider ignores query parameter, so pass empty string
          fullInput: userPrompt, // 🔑 Key: Pass user's actual prompt for embedding retrieval
          selectedCode: [],
          isInAgentMode: false,
        },
      );

      if (
        codebaseContext.status !== "success" ||
        codebaseContext.content.length === 0
      ) {
        setAnalysisResult(
          "Unable to get codebase content, please ensure project is properly indexed.",
        );
        return;
      }

      // Use Continue's approach: build messages directly from Context Items
      const messages = [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: userPrompt,
            },
            // Use Context Provider returned content directly, following Continue's approach
            ...codebaseContext.content.map((item) => ({
              type: "text" as const,
              text: `\`\`\`${item.name}\n${item.content}\n\`\`\``,
            })),
          ],
        },
      ];

      // Use LLM streaming chat - following Continue's calling pattern
      let fullResponse = "";
      const gen = ideMessenger.llmStreamChat(
        {
          completionOptions: {
            maxTokens: 3000,
            temperature: 0.1,
          },
          title: "Full Stack Project Architecture Analysis",
          messages,
        },
        new AbortController().signal,
      );

      let next = await gen.next();
      while (!next.done) {
        // next.value is ChatMessage[] array
        if (Array.isArray(next.value)) {
          for (const message of next.value) {
            if (message.role === "assistant" && message.content) {
              if (typeof message.content === "string") {
                fullResponse += message.content;
              } else if (Array.isArray(message.content)) {
                // If content is MessagePart[] array
                for (const part of message.content) {
                  if (part.type === "text") {
                    fullResponse += part.text;
                  }
                }
              }
            }
          }
        }
        next = await gen.next();
      }

      if (fullResponse.trim()) {
        setAnalysisResult(fullResponse.trim());
        // Parse analysis result and update visualization
        const parsedData = parseAnalysisResult(fullResponse.trim());
        if (parsedData) {
          setAnalysisData(parsedData);
          updateFlowFromAnalysis(parsedData);
        }
      } else {
        setAnalysisResult("Unable to get analysis result, please try again.");
      }
    } catch (error) {
      console.error("Error analyzing project:", error);
      setAnalysisResult(
        `Error occurred during analysis: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Parse analysis result
  const parseAnalysisResult = (result: string) => {
    try {
      const jsonMatch =
        result.match(/```json\n([\s\S]*?)\n```/) || result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch (error) {
      console.error("Failed to parse analysis result:", error);
    }
    return null;
  };

  // Build ReactFlow chart based on AI analysis result
  const updateFlowFromAnalysis = (analysisData: any) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let nodeId = 0;

    // Define layout areas
    const layouts = {
      frontend: { x: 100, y: 50, width: 800, height: 200 },
      backend: { x: 100, y: 300, width: 800, height: 200 },
      database: { x: 100, y: 550, width: 800, height: 150 },
      config: { x: 950, y: 50, width: 200, height: 600 },
    };

    // 1. Add project overview node
    if (analysisData.project_name) {
      newNodes.push({
        id: (nodeId++).toString(),
        type: "customFolder",
        position: { x: 50, y: 20 },
        data: {
          label: analysisData.project_name,
          description: analysisData.description || "Project Overview",
          category: "project",
        },
      });
    }

    // 2. Frontend component nodes
    if (analysisData.structure?.frontend?.length > 0) {
      // Add Frontend area title
      newNodes.push({
        id: (nodeId++).toString(),
        type: "customFolder",
        position: { x: layouts.frontend.x, y: layouts.frontend.y },
        data: {
          label: "Frontend Layer",
          description: `${analysisData.structure.frontend.length} components`,
          category: "frontend",
        },
      });

      // Add Frontend components
      analysisData.structure.frontend.forEach((item: any, index: number) => {
        const x = layouts.frontend.x + 150 + (index % 4) * 180;
        const y = layouts.frontend.y + 60 + Math.floor(index / 4) * 80;

        newNodes.push({
          id: (nodeId++).toString(),
          type: "customFile",
          position: { x, y },
          data: {
            label:
              item.file?.split("/").pop() ||
              item.file ||
              `Component ${index + 1}`,
            description: item.description,
            category: "frontend",
            dependencies: item.dependencies || [],
          },
        });
      });
    }

    // 3. Backend module nodes
    if (analysisData.structure?.backend?.length > 0) {
      // Add Backend area title
      newNodes.push({
        id: (nodeId++).toString(),
        type: "customFolder",
        position: { x: layouts.backend.x, y: layouts.backend.y },
        data: {
          label: "Backend Layer",
          description: `${analysisData.structure.backend.length} modules`,
          category: "backend",
        },
      });

      // Add Backend modules
      analysisData.structure.backend.forEach((item: any, index: number) => {
        const x = layouts.backend.x + 150 + (index % 4) * 180;
        const y = layouts.backend.y + 60 + Math.floor(index / 4) * 80;

        const routeCount = item.routes?.length || 0;
        const routeDesc =
          routeCount > 0 ? `${routeCount} routes` : item.description;

        newNodes.push({
          id: (nodeId++).toString(),
          type: "customFile",
          position: { x, y },
          data: {
            label:
              item.file?.split("/").pop() ||
              item.file ||
              `Service ${index + 1}`,
            description: routeDesc,
            category: "backend",
            routes: item.routes || [],
          },
        });
      });
    }

    // 4. Database model nodes
    if (analysisData.structure?.database?.length > 0) {
      // Add Database area title
      newNodes.push({
        id: (nodeId++).toString(),
        type: "customFolder",
        position: { x: layouts.database.x, y: layouts.database.y },
        data: {
          label: "Database Layer",
          description: `${analysisData.structure.database.length} models`,
          category: "database",
        },
      });

      // Add Database models
      analysisData.structure.database.forEach((item: any, index: number) => {
        const x = layouts.database.x + 150 + (index % 5) * 150;
        const y = layouts.database.y + 60;

        newNodes.push({
          id: (nodeId++).toString(),
          type: "customFile",
          position: { x, y },
          data: {
            label: item.model || `Model ${index + 1}`,
            description: item.description,
            category: "database",
            fields: item.fields || [],
          },
        });
      });
    }

    // 5. Tech stack nodes
    if (analysisData.tech_stack) {
      let configIndex = 0;

      // Frontend tech stack
      if (analysisData.tech_stack.frontend?.length > 0) {
        analysisData.tech_stack.frontend.forEach((tech: string) => {
          newNodes.push({
            id: (nodeId++).toString(),
            type: "customFile",
            position: {
              x: layouts.config.x,
              y: layouts.config.y + configIndex * 50,
            },
            data: {
              label: tech,
              description: "Frontend Tech",
              category: "frontend",
            },
          });
          configIndex++;
        });
      }

      // Backend tech stack
      if (analysisData.tech_stack.backend?.length > 0) {
        analysisData.tech_stack.backend.forEach((tech: string) => {
          newNodes.push({
            id: (nodeId++).toString(),
            type: "customFile",
            position: {
              x: layouts.config.x,
              y: layouts.config.y + configIndex * 50,
            },
            data: {
              label: tech,
              description: "Backend Tech",
              category: "backend",
            },
          });
          configIndex++;
        });
      }

      // Other tech stack
      if (analysisData.tech_stack.other?.length > 0) {
        analysisData.tech_stack.other.forEach((tech: string) => {
          newNodes.push({
            id: (nodeId++).toString(),
            type: "customFile",
            position: {
              x: layouts.config.x,
              y: layouts.config.y + configIndex * 50,
            },
            data: {
              label: tech,
              description: "Tool/Config",
              category: "config",
            },
          });
          configIndex++;
        });
      }
    }

    // 6. Add connection relationships (simplified version - layered connections)
    // Frontend → Backend connections
    const frontendNodes = newNodes.filter(
      (n) => n.data.category === "frontend" && n.type === "customFile",
    );
    const backendNodes = newNodes.filter(
      (n) => n.data.category === "backend" && n.type === "customFile",
    );

    frontendNodes.forEach((frontendNode, index) => {
      if (backendNodes[index % backendNodes.length]) {
        newEdges.push({
          id: `fe-be-${frontendNode.id}`,
          source: frontendNode.id,
          target: backendNodes[index % backendNodes.length].id,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#10b981", strokeWidth: 2 },
          label: "API calls",
        });
      }
    });

    // Backend → Database connections
    const databaseNodes = newNodes.filter(
      (n) => n.data.category === "database" && n.type === "customFile",
    );

    backendNodes.forEach((backendNode, index) => {
      if (databaseNodes[index % databaseNodes.length]) {
        newEdges.push({
          id: `be-db-${backendNode.id}`,
          source: backendNode.id,
          target: databaseNodes[index % databaseNodes.length].id,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#8b5cf6", strokeWidth: 2 },
          label: "data access",
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const formatAnalysisResult = (result: string) => {
    const jsonMatch =
      result.match(/```json\n([\s\S]*?)\n```/) || result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const analysisData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return (
          <div className="space-y-4">
            {/* Project Overview */}
            {(analysisData.project_name || analysisData.description) && (
              <div>
                <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
                  📋 Project Overview
                </h4>
                {analysisData.project_name && (
                  <div className="text-vsc-descriptionForeground mb-1 text-xs">
                    <span className="font-medium">Name:</span>{" "}
                    {analysisData.project_name}
                  </div>
                )}
                {analysisData.description && (
                  <div className="text-vsc-descriptionForeground text-xs">
                    <span className="font-medium">Description:</span>{" "}
                    {analysisData.description}
                  </div>
                )}
              </div>
            )}

            {/* 技术栈 */}
            {analysisData.tech_stack && (
              <div>
                <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
                  🛠️ Tech Stack
                </h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {analysisData.tech_stack.frontend?.length > 0 && (
                    <div className="text-vsc-descriptionForeground">
                      <span className="font-medium text-green-400">
                        Frontend:
                      </span>{" "}
                      {analysisData.tech_stack.frontend.join(", ")}
                    </div>
                  )}
                  {analysisData.tech_stack.backend?.length > 0 && (
                    <div className="text-vsc-descriptionForeground">
                      <span className="font-medium text-purple-400">
                        Backend:
                      </span>{" "}
                      {analysisData.tech_stack.backend.join(", ")}
                    </div>
                  )}
                  {analysisData.tech_stack.other?.length > 0 && (
                    <div className="text-vsc-descriptionForeground">
                      <span className="font-medium text-blue-400">Other:</span>{" "}
                      {analysisData.tech_stack.other.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 项目结构 */}
            {analysisData.structure && (
              <div>
                <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
                  🏗️ Architecture
                </h4>

                {/* Frontend 结构 */}
                {analysisData.structure.frontend?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="mb-1 text-xs font-medium text-green-400">
                      Frontend Components:
                    </h5>
                    <div className="space-y-1">
                      {analysisData.structure.frontend.map(
                        (item: any, index: number) => (
                          <div
                            key={index}
                            className="text-vsc-descriptionForeground border-l-2 border-green-400/30 pl-2 text-xs"
                          >
                            <div className="font-medium">{item.file}</div>
                            {item.description && (
                              <div className="opacity-80">
                                {item.description}
                              </div>
                            )}
                            {item.dependencies?.length > 0 && (
                              <div className="text-xs opacity-60">
                                Deps: {item.dependencies.join(", ")}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Backend 结构 */}
                {analysisData.structure.backend?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="mb-1 text-xs font-medium text-purple-400">
                      Backend Modules:
                    </h5>
                    <div className="space-y-1">
                      {analysisData.structure.backend.map(
                        (item: any, index: number) => (
                          <div
                            key={index}
                            className="text-vsc-descriptionForeground border-l-2 border-purple-400/30 pl-2 text-xs"
                          >
                            <div className="font-medium">{item.file}</div>
                            {item.description && (
                              <div className="opacity-80">
                                {item.description}
                              </div>
                            )}
                            {item.routes?.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {item.routes.map((route: any, ri: number) => (
                                  <div
                                    key={ri}
                                    className="flex gap-2 text-xs opacity-70"
                                  >
                                    <span className="rounded bg-gray-600 px-1 font-mono text-xs">
                                      {route.method}
                                    </span>
                                    <span>{route.path}</span>
                                    {route.description && (
                                      <span>- {route.description}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Database 结构 */}
                {analysisData.structure.database?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="mb-1 text-xs font-medium text-orange-400">
                      Database Models:
                    </h5>
                    <div className="space-y-1">
                      {analysisData.structure.database.map(
                        (item: any, index: number) => (
                          <div
                            key={index}
                            className="text-vsc-descriptionForeground border-l-2 border-orange-400/30 pl-2 text-xs"
                          >
                            <div className="font-medium">{item.model}</div>
                            {item.description && (
                              <div className="opacity-80">
                                {item.description}
                              </div>
                            )}
                            {item.fields?.length > 0 && (
                              <div className="text-xs opacity-60">
                                Fields: {item.fields.join(", ")}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 建议 */}
            {analysisData.recommendations?.length > 0 && (
              <div>
                <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
                  💡 Recommendations
                </h4>
                <ul className="text-vsc-descriptionForeground space-y-1 text-xs">
                  {analysisData.recommendations.map(
                    (rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-yellow-400">•</span>
                        {rec}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      } catch (e) {
        // 如果解析失败，显示原始文本
        return (
          <div className="text-vsc-descriptionForeground whitespace-pre-wrap text-xs leading-relaxed">
            {result}
          </div>
        );
      }
    }

    // 如果没有JSON格式，显示原始文本
    return (
      <div className="text-vsc-descriptionForeground whitespace-pre-wrap text-xs leading-relaxed">
        {result}
      </div>
    );
  };

  // 构建ReactFlow节点和边
  const buildFlowData = async () => {
    if (!ideMessenger) return;

    setIsLoading(true);
    try {
      const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();
      if (workspaceDirs.length === 0) return;

      const fileStructure = await loadFileStructure(workspaceDirs[0]);
      const { nodes: flowNodes, edges: flowEdges } =
        convertToFlowData(fileStructure);

      setNodes(flowNodes);
      setEdges(flowEdges);

      // 保存原始节点和边，用于视图切换
      setOriginalNodes(flowNodes);
      setOriginalEdges(flowEdges);
    } catch (error) {
      console.error("Error building flow data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载文件结构
  const loadFileStructure = async (basePath: string): Promise<FileNode[]> => {
    const entries = await ideMessenger!.ide.listDir(basePath);
    const nodes: FileNode[] = [];

    const ignoredDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "__pycache__",
    ]);

    for (const [name, type] of entries) {
      if (ignoredDirs.has(name) || name.startsWith(".")) continue;

      const fullPath = `${basePath}/${name}`;
      const isDirectory = type === 2;

      let content = "";
      if (!isDirectory) {
        try {
          content = await ideMessenger!.ide.readFile(fullPath);
        } catch (e) {
          // Ignore read errors
        }
      }

      const node: FileNode = {
        name,
        path: fullPath,
        type: isDirectory ? "directory" : "file",
        category: categorizeFile(fullPath, content) as any,
        description: isDirectory
          ? undefined
          : getFileDescription(fullPath, name, content),
      };

      // 只加载第一层，避免过于复杂
      if (isDirectory) {
        try {
          const subEntries = await ideMessenger!.ide.listDir(fullPath);
          node.children = subEntries
            .filter(
              ([subName]) =>
                !ignoredDirs.has(subName) && !subName.startsWith("."),
            )
            .map(([subName, subType]) => ({
              name: subName,
              path: `${fullPath}/${subName}`,
              type: subType === 2 ? "directory" : "file",
              category: categorizeFile(`${fullPath}/${subName}`) as any,
              description:
                subType === 2
                  ? undefined
                  : getFileDescription(`${fullPath}/${subName}`, subName),
            }));
        } catch (e) {
          node.children = [];
        }
      }

      nodes.push(node);
    }

    return nodes;
  };

  // 转换为ReactFlow数据格式
  const convertToFlowData = (fileStructure: FileNode[]) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;

    const categories = new Map<string, FileNode[]>();
    const processNode = (node: FileNode, parentId?: string) => {
      const currentId = (nodeId++).toString();

      if (node.type === "directory") {
        nodes.push({
          id: currentId,
          type: "customFolder",
          position: { x: 0, y: 0 },
          data: {
            label: node.name,
            description: `${node.children?.length || 0} items`,
            category: node.category,
          },
        });

        // 处理子节点
        node.children?.forEach((child) => {
          const childId = processNode(child, currentId);
          if (childId) {
            edges.push({
              id: `${currentId}-${childId}`,
              source: currentId,
              target: childId,
              type: "smoothstep",
              animated: false,
            });
          }
        });
      } else {
        // 文件节点
        nodes.push({
          id: currentId,
          type: "customFile",
          position: { x: 0, y: 0 },
          data: {
            label: node.name,
            description: node.description,
            category: node.category,
          },
        });

        const category = node.category || "config";
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(node);
      }

      if (parentId) {
        edges.push({
          id: `${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: "smoothstep",
          animated: false,
        });
      }

      return currentId;
    };

    fileStructure.forEach((node) => processNode(node));

    layoutNodes(nodes, categories);

    return { nodes, edges };
  };

  const layoutNodes = (nodes: Node[], categories: Map<string, FileNode[]>) => {
    const centerX = 400;
    const centerY = 300;
    const categoryRadius = 200;
    const itemRadius = 80;

    const categoryList = Array.from(categories.keys());
    const angleStep = (2 * Math.PI) / Math.max(categoryList.length, 1);

    let nodeIndex = 0;

    categoryList.forEach((category, categoryIndex) => {
      const categoryAngle = categoryIndex * angleStep;
      const categoryCenterX =
        centerX + Math.cos(categoryAngle) * categoryRadius;
      const categoryCenterY =
        centerY + Math.sin(categoryAngle) * categoryRadius;

      const categoryNodes = nodes.filter(
        (node) => node.data.category === category,
      );
      const itemAngleStep = (2 * Math.PI) / Math.max(categoryNodes.length, 1);

      categoryNodes.forEach((node, itemIndex) => {
        const itemAngle = itemIndex * itemAngleStep;
        node.position = {
          x: categoryCenterX + Math.cos(itemAngle) * itemRadius,
          y: categoryCenterY + Math.sin(itemAngle) * itemRadius,
        };
        nodeIndex++;
      });
    });

    // 处理未分类的节点
    const uncategorizedNodes = nodes.filter(
      (node) => !categoryList.includes(node.data.category),
    );
    uncategorizedNodes.forEach((node, index) => {
      node.position = {
        x: centerX + (index % 5) * 120,
        y: centerY + Math.floor(index / 5) * 100,
      };
    });
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    buildFlowData();
  }, [ideMessenger, refreshKey]);

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener("refreshProjectFlow", handleRefresh);
    return () =>
      window.removeEventListener("refreshProjectFlow", handleRefresh);
  }, []);

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="bg-vsc-editor-background h-full w-full">
      <div className="bg-vsc-input-background border-vsc-input-border flex h-8 items-center border-b px-3">
        <h3 className="text-vsc-foreground text-sm font-medium">
          Project Architecture
        </h3>
        <div className="ml-auto flex items-center gap-2">
          {/* 显示模式切换 */}
          {analysisData && (
            <>
              <button
                onClick={() => {
                  setNodes(originalNodes);
                  setEdges(originalEdges);
                }}
                className="text-vsc-descriptionForeground hover:text-vsc-foreground flex items-center gap-1 text-xs transition-colors"
                title="切换到文件树视图"
              >
                <FolderIcon className="h-3 w-3" />
                File Tree
              </button>
              <span className="text-vsc-descriptionForeground">|</span>
              <button
                onClick={() => updateFlowFromAnalysis(analysisData)}
                className="text-vsc-descriptionForeground hover:text-vsc-foreground flex items-center gap-1 text-xs transition-colors"
                title="切换到AI分析视图"
              >
                <SparklesIcon className="h-3 w-3" />
                AI View
              </button>
            </>
          )}

          <button
            onClick={analyzeFullStackProject}
            disabled={isAnalyzing || isLoading}
            className="text-vsc-descriptionForeground hover:text-vsc-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
            title="AI Full Stack Analysis"
          >
            <SparklesIcon className="h-3 w-3" />
            {isAnalyzing ? "Analyzing..." : "AI Analysis"}
          </button>
          <button
            onClick={buildFlowData}
            disabled={isLoading || isAnalyzing}
            className="text-vsc-descriptionForeground hover:text-vsc-foreground text-xs transition-colors disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-2rem)]">
        {isAnalyzing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <div className="bg-vsc-input-background border-vsc-input-border flex items-center gap-3 rounded-lg border p-4 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-vsc-foreground">
                AI正在分析项目架构，请稍候...
              </span>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-vsc-editor-background"
        >
          <Controls className="bg-vsc-input-background border-vsc-input-border border" />
          <MiniMap
            className="bg-vsc-input-background border-vsc-input-border border"
            nodeColor={(node) => {
              switch (node.data.category) {
                case "frontend":
                  return "#10b981";
                case "backend":
                  return "#8b5cf6";
                case "database":
                  return "#f97316";
                case "config":
                  return "#6b7280";
                case "docs":
                  return "#eab308";
                case "assets":
                  return "#ec4899";
                default:
                  return "#6366f1";
              }
            }}
          />
          <Background color="#2d3748" gap={16} />
        </ReactFlow>
      </div>

      {/* Legend - 动态显示当前视图的图例 */}
      <div className="bg-vsc-input-background border-vsc-input-border absolute bottom-4 left-4 rounded-lg border p-3 text-xs">
        <div className="text-vsc-foreground mb-2 font-medium">
          {analysisData ? "AI Analysis Legend" : "File Structure Legend"}
        </div>
        <div className="space-y-1">
          {analysisData ? (
            // AI分析视图的图例
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-blue-500"></div>
                <span className="text-vsc-descriptionForeground">Project</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500"></div>
                <span className="text-vsc-descriptionForeground">Frontend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-purple-500"></div>
                <span className="text-vsc-descriptionForeground">Backend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-orange-500"></div>
                <span className="text-vsc-descriptionForeground">Database</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-gray-500"></div>
                <span className="text-vsc-descriptionForeground">
                  Config/Tools
                </span>
              </div>
            </>
          ) : (
            // 文件树视图的图例
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500"></div>
                <span className="text-vsc-descriptionForeground">Frontend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-purple-500"></div>
                <span className="text-vsc-descriptionForeground">Backend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-orange-500"></div>
                <span className="text-vsc-descriptionForeground">Database</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-gray-500"></div>
                <span className="text-vsc-descriptionForeground">Config</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-yellow-500"></div>
                <span className="text-vsc-descriptionForeground">Docs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-pink-500"></div>
                <span className="text-vsc-descriptionForeground">Assets</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Analysis Result Panel - 只在有原始分析结果时显示 */}
      {analysisResult && !analysisData && (
        <div className="bg-vsc-input-background border-vsc-input-border absolute bottom-4 right-4 max-h-96 w-96 overflow-y-auto rounded-lg border p-4 text-xs shadow-lg">
          <div className="text-vsc-foreground sticky top-0 mb-3 flex items-center gap-2 bg-inherit font-medium">
            <SparklesIcon className="h-4 w-4 text-blue-500" />
            AI架构分析结果
            <button
              onClick={() => setAnalysisResult("")}
              className="text-vsc-descriptionForeground hover:text-vsc-foreground ml-auto rounded px-1 text-xs transition-colors"
              title="关闭分析结果"
            >
              ✕
            </button>
          </div>
          <div className="border-vsc-input-border border-t pt-3">
            {formatAnalysisResult(analysisResult)}
          </div>
        </div>
      )}

      {/* AI Analysis Status Panel - 当有分析数据时显示摘要信息 */}
      {analysisData && (
        <div className="bg-vsc-input-background border-vsc-input-border absolute bottom-4 right-4 max-w-80 rounded-lg border p-3 text-xs shadow-lg">
          <div className="text-vsc-foreground mb-2 flex items-center gap-2 font-medium">
            <SparklesIcon className="h-4 w-4 text-blue-500" />
            {analysisData.project_name || "Project Analysis"}
            <button
              onClick={() => {
                setAnalysisData(null);
                setAnalysisResult("");
              }}
              className="text-vsc-descriptionForeground hover:text-vsc-foreground ml-auto rounded px-1 text-xs transition-colors"
              title="清除分析数据"
            >
              ✕
            </button>
          </div>
          {analysisData.description && (
            <p className="text-vsc-descriptionForeground mb-2 text-xs">
              {analysisData.description}
            </p>
          )}
          <div className="text-vsc-descriptionForeground flex flex-wrap gap-1 text-xs">
            {analysisData.tech_stack?.frontend?.length > 0 && (
              <span className="rounded bg-green-500/20 px-1 text-green-400">
                {analysisData.tech_stack.frontend.length} Frontend
              </span>
            )}
            {analysisData.tech_stack?.backend?.length > 0 && (
              <span className="rounded bg-purple-500/20 px-1 text-purple-400">
                {analysisData.tech_stack.backend.length} Backend
              </span>
            )}
            {analysisData.structure?.database?.length > 0 && (
              <span className="rounded bg-orange-500/20 px-1 text-orange-400">
                {analysisData.structure.database.length} DB Models
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
