// Toolbar component for ProjectStructureFlow
import {
  ArrowPathIcon,
  CogIcon,
  DocumentTextIcon,
  FolderIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { AIAnalysisData } from "../types";

interface FlowToolbarProps {
  analysisData: AIAnalysisData | null;
  analysisResult?: string; // 添加 analysisResult 用于描述视图
  isAnalyzing: boolean;
  isLoading: boolean;
  isCacheValid?: boolean;
  devServerUrl?: string;
  onAIAnalysis: () => void;
  onRefresh: () => void;
  onRefreshAnalysis?: () => void;
  onSwitchToFileTree: () => void;
  onSwitchToAIView: () => void;
  onSwitchToDescriptionView?: () => void; // 添加描述视图切换函数
  onDevServerUrlChange?: (url: string) => void;
}

// Toolbar with analysis and view switching controls
export const FlowToolbar: React.FC<FlowToolbarProps> = ({
  analysisData,
  analysisResult = "",
  isAnalyzing,
  isLoading,
  isCacheValid = true,
  devServerUrl = "http://localhost:3000",
  onAIAnalysis,
  onRefresh,
  onRefreshAnalysis,
  onSwitchToFileTree,
  onSwitchToAIView,
  onSwitchToDescriptionView,
  onDevServerUrlChange,
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(devServerUrl);

  const handleUrlSubmit = () => {
    if (onDevServerUrlChange) {
      onDevServerUrlChange(urlInput);
    }
    setShowUrlInput(false);
  };

  return (
    <div className="bg-vsc-input-background border-vsc-input-border flex h-8 items-center border-b px-3">
      <h3 className="text-vsc-foreground text-sm font-medium">
        Project Architecture
      </h3>
      <div className="ml-auto flex items-center gap-2">
        {/* Cache Status Indicator */}
        {analysisData && (
          <div className="flex items-center gap-1 text-xs">
            <div
              className={`h-2 w-2 rounded-full ${isCacheValid ? "bg-green-500" : "bg-yellow-500"}`}
            ></div>
            <span className="text-vsc-descriptionForeground">
              {isCacheValid ? "Cached" : "Outdated"}
            </span>
          </div>
        )}

        {/* View Mode Toggle */}
        {(analysisData || analysisResult) && (
          <ViewModeToggle
            onSwitchToFileTree={onSwitchToFileTree}
            onSwitchToAIView={onSwitchToAIView}
            onSwitchToDescriptionView={onSwitchToDescriptionView}
            hasAnalysisData={!!analysisData}
            hasAnalysisResult={!!analysisResult}
          />
        )}

        {/* AI Analysis Buttons */}
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={onAIAnalysis}
            disabled={isAnalyzing || isLoading}
            icon={<SparklesIcon className="h-3 w-3" />}
            label={isAnalyzing ? "Analyzing..." : "AI Analysis"}
            title="AI Full Stack Analysis"
          />

          {/* Refresh Analysis Button - only show if we have existing data */}
          {analysisData && onRefreshAnalysis && (
            <ActionButton
              onClick={onRefreshAnalysis}
              disabled={isAnalyzing || isLoading}
              icon={<ArrowPathIcon className="h-3 w-3" />}
              label="Refresh AI"
              title="Refresh AI analysis (clears cache)"
            />
          )}
        </div>

        {/* File Structure Refresh Button */}
        <ActionButton
          onClick={onRefresh}
          disabled={isLoading || isAnalyzing}
          label={isLoading ? "Loading..." : "Refresh"}
          title="Refresh file structure"
        />

        {/* Dev Server URL Configuration */}
        <div className="relative">
          <ActionButton
            onClick={() => setShowUrlInput(!showUrlInput)}
            icon={<CogIcon className="h-3 w-3" />}
            label="URL"
            title="Configure development server URL"
          />

          {showUrlInput && (
            <div className="border-vsc-input-border bg-vsc-input-background absolute right-0 top-8 z-10 min-w-[250px] rounded-md border p-2 shadow-lg">
              <div className="text-vsc-descriptionForeground mb-2 text-xs">
                Development Server URL:
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="bg-vsc-editor-background border-vsc-input-border text-vsc-foreground flex-1 rounded border px-2 py-1 text-xs"
                  placeholder="http://localhost:3000"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUrlSubmit();
                    } else if (e.key === "Escape") {
                      setShowUrlInput(false);
                      setUrlInput(devServerUrl);
                    }
                  }}
                />
                <button
                  onClick={handleUrlSubmit}
                  className="bg-vsc-button-background text-vsc-button-foreground hover:bg-vsc-button-hoverBackground rounded px-2 py-1 text-xs"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// View mode toggle buttons
const ViewModeToggle: React.FC<{
  onSwitchToFileTree: () => void;
  onSwitchToAIView: () => void;
  onSwitchToDescriptionView?: () => void;
  hasAnalysisData: boolean;
  hasAnalysisResult: boolean;
}> = ({
  onSwitchToFileTree,
  onSwitchToAIView,
  onSwitchToDescriptionView,
  hasAnalysisData,
  hasAnalysisResult,
}) => (
  <>
    <ActionButton
      onClick={onSwitchToFileTree}
      icon={<FolderIcon className="h-3 w-3" />}
      label="File Tree"
      title="Switch to file tree view"
    />
    {hasAnalysisData && (
      <>
        <span className="text-vsc-descriptionForeground">|</span>
        <ActionButton
          onClick={onSwitchToAIView}
          icon={<SparklesIcon className="h-3 w-3" />}
          label="AI View"
          title="Switch to AI analysis view"
        />
      </>
    )}
    {hasAnalysisResult && onSwitchToDescriptionView && (
      <>
        <span className="text-vsc-descriptionForeground">|</span>
        <ActionButton
          onClick={onSwitchToDescriptionView}
          icon={<DocumentTextIcon className="h-3 w-3" />}
          label="Description"
          title="Switch to description visualization view"
        />
      </>
    )}
  </>
);

// Reusable action button component
const ActionButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  title?: string;
}> = ({ onClick, disabled, icon, label, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="text-vsc-descriptionForeground hover:text-vsc-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
    title={title}
  >
    {icon}
    {label}
  </button>
);
