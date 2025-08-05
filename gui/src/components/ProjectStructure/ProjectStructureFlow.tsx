// ProjectStructureFlow.tsx - Main ReactFlow visualization component
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

import {
  AnalysisResultPanel,
  AnalysisStatusPanel,
} from "./components/AnalysisResults";
import { FlowLegend } from "./components/FlowLegend";
import { FileNodeComponent, FolderNode } from "./components/FlowNodes";
import { FlowToolbar } from "./components/FlowToolbar";
import { useAIAnalysis } from "./hooks/useAIAnalysis";
import { useFileStructure } from "./hooks/useFileStructure";
import { ProjectStructureProps } from "./types";
import {
  buildFlowFromAnalysis,
  convertToFlowData,
} from "./utils/flowDataUtils";

// Custom node types for ReactFlow
const nodeTypes = {
  customFolder: FolderNode,
  customFile: FileNodeComponent,
};

export function ProjectStructureFlow({ isCollapsed }: ProjectStructureProps) {
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Component state
  const [originalNodes, setOriginalNodes] = useState<Node[]>([]);
  const [originalEdges, setOriginalEdges] = useState<Edge[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [devServerUrl, setDevServerUrl] = useState("http://localhost:3000");

  // Contexts
  const ideMessenger = useContext(IdeMessengerContext);

  // Custom hooks
  const { isLoading, buildFileStructure } = useFileStructure();
  const {
    isAnalyzing,
    analysisResult,
    analysisData,
    analyzeFullStackProject,
    clearAnalysis,
    refreshAnalysis,
    isCacheValid,
    setAnalysisResult,
  } = useAIAnalysis();

  // Build flow data from file structure
  const buildFlowData = async () => {
    const fileStructure = await buildFileStructure();
    if (fileStructure.length === 0) return;

    const { nodes: flowNodes, edges: flowEdges } =
      convertToFlowData(fileStructure);

    setNodes(flowNodes);
    setEdges(flowEdges);
    setOriginalNodes(flowNodes);
    setOriginalEdges(flowEdges);
  };

  // Switch to file tree view
  const switchToFileTree = () => {
    setNodes(originalNodes);
    setEdges(originalEdges);
  };

  // Switch to AI analysis view
  const switchToAIView = async () => {
    if (analysisData && ideMessenger) {
      try {
        // Get workspace root directory
        const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();
        const workspaceRoot =
          workspaceDirs.length > 0 ? workspaceDirs[0] : undefined;

        const { nodes: aiNodes, edges: aiEdges } = buildFlowFromAnalysis(
          analysisData,
          workspaceRoot,
        );
        setNodes(aiNodes);
        setEdges(aiEdges);
      } catch (error) {
        console.error("Error switching to AI view:", error);
        // Fallback without workspace root
        const { nodes: aiNodes, edges: aiEdges } =
          buildFlowFromAnalysis(analysisData);
        setNodes(aiNodes);
        setEdges(aiEdges);
      }
    }
  };

  // Handle refresh flow data
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // ReactFlow connection handler
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Handle node click for file navigation
  const onNodeClick = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!ideMessenger) return;

      const data = node.data;

      // Handle file nodes - open file in editor
      if (data.type === "file" && data.path) {
        console.log("Attempting to open file:", {
          path: data.path,
          originalPath: data.originalPath,
          label: data.label,
          category: data.category,
        });

        try {
          await ideMessenger.ide.openFile(data.path);
          console.log("Successfully opened file:", data.path);
        } catch (error) {
          console.error("Error opening file with normalized path:", error);

          // Try with original path as fallback
          if (data.originalPath && data.originalPath !== data.path) {
            console.log("Trying with original path:", data.originalPath);
            try {
              await ideMessenger.ide.openFile(data.originalPath);
              console.log(
                "Successfully opened file with original path:",
                data.originalPath,
              );
            } catch (originalError) {
              console.error(
                "Error opening file with original path:",
                originalError,
              );
              console.log("Failed path details:", {
                attempted: data.path,
                original: data.originalPath,
              });
            }
          }
        }
        return;
      }

      // Handle route nodes - if node has routes, show route information
      if (data.routes && data.routes.length > 0) {
        const firstRoute = data.routes[0];
        if (firstRoute.path) {
          // Try to construct a potential URL for the route
          const fullUrl = `${devServerUrl}${firstRoute.path}`;

          try {
            await ideMessenger.post("openUrl", fullUrl);
          } catch (error) {
            console.error("Error opening route URL:", error);
            // Fallback: just log the route information
            console.log("Route info:", firstRoute);
          }
        }
        return;
      }

      // Handle external URLs if any
      if (data.url) {
        try {
          await ideMessenger.post("openUrl", data.url);
        } catch (error) {
          console.error("Error opening URL:", error);
        }
        return;
      }

      // Log click for debugging
      console.log("Node clicked:", {
        type: data.type,
        label: data.label,
        path: data.path,
        category: data.category,
        routes: data.routes,
      });
    },
    [ideMessenger],
  );

  // Effects
  useEffect(() => {
    buildFlowData();
  }, [refreshKey]);

  useEffect(() => {
    const handleRefreshEvent = () => handleRefresh();
    window.addEventListener("refreshProjectFlow", handleRefreshEvent);
    return () =>
      window.removeEventListener("refreshProjectFlow", handleRefreshEvent);
  }, []);

  // Don't render if collapsed
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="bg-vsc-editor-background h-full w-full">
      {/* Toolbar */}
      <FlowToolbar
        analysisData={analysisData}
        isAnalyzing={isAnalyzing}
        isLoading={isLoading}
        isCacheValid={isCacheValid()}
        devServerUrl={devServerUrl}
        onAIAnalysis={analyzeFullStackProject}
        onRefresh={handleRefresh}
        onRefreshAnalysis={refreshAnalysis}
        onSwitchToFileTree={switchToFileTree}
        onSwitchToAIView={switchToAIView}
        onDevServerUrlChange={setDevServerUrl}
      />

      {/* Main Flow Area */}
      <div className="h-[calc(100%-2rem)]">
        {/* Loading overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <div className="bg-vsc-input-background border-vsc-input-border flex items-center gap-3 rounded-lg border p-4 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-vsc-foreground">
                AI is analyzing project architecture, please wait...
              </span>
            </div>
          </div>
        )}

        {/* ReactFlow Component */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
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

      {/* Legend */}
      <FlowLegend analysisData={analysisData} />

      {/* Analysis Result Panels */}
      {analysisResult && !analysisData && (
        <AnalysisResultPanel
          analysisResult={analysisResult}
          onClose={() => setAnalysisResult("")}
        />
      )}

      {analysisData && (
        <AnalysisStatusPanel
          analysisData={analysisData}
          onClear={clearAnalysis}
          isCacheValid={isCacheValid()}
        />
      )}
    </div>
  );
}
