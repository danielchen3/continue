// Legend component for ReactFlow visualization
import React from "react";
import { AIAnalysisData } from "../types";

interface FlowLegendProps {
  analysisData: AIAnalysisData | null;
}

// Legend showing color coding for different node types
export const FlowLegend: React.FC<FlowLegendProps> = ({ analysisData }) => {
  return (
    <div className="bg-vsc-input-background border-vsc-input-border absolute bottom-4 left-4 rounded-lg border p-3 text-xs">
      <div className="text-vsc-foreground mb-2 font-medium">
        {analysisData ? "AI Analysis Legend" : "File Structure Legend"}
      </div>
      <div className="space-y-1">
        {analysisData ? <AIAnalysisLegend /> : <FileStructureLegend />}
      </div>
    </div>
  );
};

// Legend for AI analysis view
const AIAnalysisLegend: React.FC = () => (
  <>
    <LegendItem color="blue-500" label="Project" />
    <LegendItem color="green-500" label="Frontend" />
    <LegendItem color="purple-500" label="Backend" />
    <LegendItem color="orange-500" label="Database" />
    <LegendItem color="gray-500" label="Config/Tools" />
  </>
);

// Legend for file tree view
const FileStructureLegend: React.FC = () => (
  <>
    <LegendItem color="green-500" label="Frontend" />
    <LegendItem color="purple-500" label="Backend" />
    <LegendItem color="orange-500" label="Database" />
    <LegendItem color="gray-500" label="Config" />
    <LegendItem color="yellow-500" label="Docs" />
    <LegendItem color="pink-500" label="Assets" />
  </>
);

// Individual legend item
const LegendItem: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <div className="flex items-center gap-2">
    <div className={`h-3 w-3 rounded bg-${color}`}></div>
    <span className="text-vsc-descriptionForeground">{label}</span>
  </div>
);
