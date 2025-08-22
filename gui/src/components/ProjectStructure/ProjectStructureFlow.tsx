// ProjectStructureFlow.tsx - Simplified AI Description Visualization component
import { useContext, useEffect, useState } from "react";

import { IdeMessengerContext } from "../../context/IdeMessenger";

import { AnalysisResultPanel } from "./components/AnalysisResults";
import ProjectDescriptionVisualization from "./components/ProjectDescriptionVisualization";
import { useAIAnalysis } from "./hooks/useAIAnalysis";
import { ProjectStructureProps } from "./types";

export function ProjectStructureFlow({ isCollapsed }: ProjectStructureProps) {
  // Component state
  const [refreshKey, setRefreshKey] = useState(0);

  // Contexts
  const ideMessenger = useContext(IdeMessengerContext);

  // Custom hooks
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

  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Effects
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
      {/* Simple Toolbar */}
      <div className="bg-vsc-input-background border-vsc-input-border flex h-8 items-center justify-between border-b px-3">
        <h3 className="text-vsc-foreground text-sm font-medium">
          AI Project Description
        </h3>
        <div className="flex items-center gap-2">
          {/* Cache Status */}
          {analysisData && (
            <div className="flex items-center gap-1 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${isCacheValid() ? "bg-green-500" : "bg-yellow-500"}`}
              ></div>
              <span className="text-vsc-descriptionForeground">
                {isCacheValid() ? "Cached" : "Outdated"}
              </span>
            </div>
          )}

          {/* AI Analysis Button */}
          <button
            onClick={analyzeFullStackProject}
            disabled={isAnalyzing}
            className="text-vsc-descriptionForeground hover:text-vsc-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
            title="AI Analysis"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            {isAnalyzing ? "Analyzing..." : "AI Analysis"}
          </button>

          {/* Refresh Analysis */}
          {analysisData && (
            <button
              onClick={refreshAnalysis}
              disabled={isAnalyzing}
              className="text-vsc-descriptionForeground hover:text-vsc-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
              title="Refresh Analysis"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          )}

          {/* Clear Analysis */}
          {analysisData && (
            <button
              onClick={clearAnalysis}
              className="text-vsc-descriptionForeground hover:text-vsc-foreground flex items-center gap-1 text-xs transition-colors"
              title="Clear Analysis"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
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

        {/* AI Description Visualization */}
        {analysisResult ? (
          <ProjectDescriptionVisualization
            analysisResult={analysisResult}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <svg
                className="text-vsc-descriptionForeground mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="text-vsc-foreground mt-2 text-sm font-medium">
                No analysis available
              </h3>
              <p className="text-vsc-descriptionForeground mt-1 text-sm">
                Click "AI Analysis" to analyze your project structure
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Result Panels */}
      {analysisResult && !analysisData && (
        <AnalysisResultPanel
          analysisResult={analysisResult}
          onClose={() => setAnalysisResult("")}
        />
      )}
    </div>
  );
}
