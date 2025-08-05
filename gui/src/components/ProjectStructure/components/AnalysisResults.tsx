// Components for displaying AI analysis results
import { SparklesIcon } from "@heroicons/react/24/outline";
import React from "react";
import { AIAnalysisData } from "../types";

interface AnalysisResultPanelProps {
  analysisResult: string;
  onClose: () => void;
}

interface AnalysisStatusPanelProps {
  analysisData: AIAnalysisData;
  onClear: () => void;
  isCacheValid?: boolean;
}

// Panel for displaying raw analysis results
export const AnalysisResultPanel: React.FC<AnalysisResultPanelProps> = ({
  analysisResult,
  onClose,
}) => {
  const formatAnalysisResult = (result: string) => {
    const jsonMatch =
      result.match(/```json\n([\s\S]*?)\n```/) || result.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const analysisData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return <FormattedAnalysisData data={analysisData} />;
      } catch (e) {
        return (
          <div className="text-vsc-descriptionForeground whitespace-pre-wrap text-xs leading-relaxed">
            {result}
          </div>
        );
      }
    }

    return (
      <div className="text-vsc-descriptionForeground whitespace-pre-wrap text-xs leading-relaxed">
        {result}
      </div>
    );
  };

  return (
    <div className="bg-vsc-input-background border-vsc-input-border absolute bottom-4 right-4 max-h-96 w-96 overflow-y-auto rounded-lg border p-4 text-xs shadow-lg">
      <div className="text-vsc-foreground sticky top-0 mb-3 flex items-center gap-2 bg-inherit font-medium">
        <SparklesIcon className="h-4 w-4 text-blue-500" />
        AI Architecture Analysis Result
        <button
          onClick={onClose}
          className="text-vsc-descriptionForeground hover:text-vsc-foreground ml-auto rounded px-1 text-xs transition-colors"
          title="Close analysis result"
        >
          ✕
        </button>
      </div>
      <div className="border-vsc-input-border border-t pt-3">
        {formatAnalysisResult(analysisResult)}
      </div>
    </div>
  );
};

// Panel for displaying analysis status summary
export const AnalysisStatusPanel: React.FC<AnalysisStatusPanelProps> = ({
  analysisData,
  onClear,
  isCacheValid = true,
}) => {
  return (
    <div className="bg-vsc-input-background border-vsc-input-border absolute bottom-4 right-4 max-w-80 rounded-lg border p-3 text-xs shadow-lg">
      <div className="text-vsc-foreground mb-2 flex items-center gap-2 font-medium">
        <SparklesIcon className="h-4 w-4 text-blue-500" />
        {analysisData.project_name || "Project Analysis"}

        {/* Cache status indicator */}
        <div
          className={`h-2 w-2 rounded-full ${isCacheValid ? "bg-green-500" : "bg-yellow-500"}`}
          title={isCacheValid ? "Data is fresh" : "Data may be outdated"}
        ></div>

        <button
          onClick={onClear}
          className="text-vsc-descriptionForeground hover:text-vsc-foreground ml-auto rounded px-1 text-xs transition-colors"
          title="Clear analysis data"
        >
          ✕
        </button>
      </div>
      {analysisData.description && (
        <p className="text-vsc-descriptionForeground mb-2 text-xs">
          {analysisData.description}
        </p>
      )}

      {/* Cache status text */}
      {!isCacheValid && (
        <p className="mb-2 text-xs text-yellow-400">
          ⚠️ This analysis may be outdated. Consider refreshing.
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
  );
};

// Formatted display for structured analysis data
const FormattedAnalysisData: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="space-y-4">
      {/* Project Overview */}
      {(data.project_name || data.description) && (
        <div>
          <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
            📋 Project Overview
          </h4>
          {data.project_name && (
            <div className="text-vsc-descriptionForeground mb-1 text-xs">
              <span className="font-medium">Name:</span> {data.project_name}
            </div>
          )}
          {data.description && (
            <div className="text-vsc-descriptionForeground text-xs">
              <span className="font-medium">Description:</span>{" "}
              {data.description}
            </div>
          )}
        </div>
      )}

      {/* Tech Stack */}
      {data.tech_stack && <TechStackSection techStack={data.tech_stack} />}

      {/* Project Structure */}
      {data.structure && <StructureSection structure={data.structure} />}

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <RecommendationsSection recommendations={data.recommendations} />
      )}
    </div>
  );
};

// Tech Stack section component
const TechStackSection: React.FC<{ techStack: any }> = ({ techStack }) => (
  <div>
    <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
      🛠️ Tech Stack
    </h4>
    <div className="grid grid-cols-1 gap-2 text-xs">
      {techStack.frontend?.length > 0 && (
        <div className="text-vsc-descriptionForeground">
          <span className="font-medium text-green-400">Frontend:</span>{" "}
          {techStack.frontend.join(", ")}
        </div>
      )}
      {techStack.backend?.length > 0 && (
        <div className="text-vsc-descriptionForeground">
          <span className="font-medium text-purple-400">Backend:</span>{" "}
          {techStack.backend.join(", ")}
        </div>
      )}
      {techStack.other?.length > 0 && (
        <div className="text-vsc-descriptionForeground">
          <span className="font-medium text-blue-400">Other:</span>{" "}
          {techStack.other.join(", ")}
        </div>
      )}
    </div>
  </div>
);

// Structure section component
const StructureSection: React.FC<{ structure: any }> = ({ structure }) => (
  <div>
    <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
      🏗️ Architecture
    </h4>

    {/* Frontend Structure */}
    {structure.frontend?.length > 0 && (
      <StructureSubsection
        title="Frontend Components:"
        items={structure.frontend}
        color="green"
      />
    )}

    {/* Backend Structure */}
    {structure.backend?.length > 0 && (
      <StructureSubsection
        title="Backend Modules:"
        items={structure.backend}
        color="purple"
      />
    )}

    {/* Database Structure */}
    {structure.database?.length > 0 && (
      <StructureSubsection
        title="Database Models:"
        items={structure.database}
        color="orange"
      />
    )}
  </div>
);

// Structure subsection component
const StructureSubsection: React.FC<{
  title: string;
  items: any[];
  color: string;
}> = ({ title, items, color }) => (
  <div className="mb-3">
    <h5 className={`mb-1 text-xs font-medium text-${color}-400`}>{title}</h5>
    <div className="space-y-1">
      {items.map((item: any, index: number) => (
        <div
          key={index}
          className={`text-vsc-descriptionForeground border-l-2 border-${color}-400/30 pl-2 text-xs`}
        >
          <div className="font-medium">{item.file || item.model}</div>
          {item.description && (
            <div className="opacity-80">{item.description}</div>
          )}
          {item.dependencies?.length > 0 && (
            <div className="text-xs opacity-60">
              Deps: {item.dependencies.join(", ")}
            </div>
          )}
          {item.routes?.length > 0 && (
            <div className="mt-1 space-y-1">
              {item.routes.map((route: any, ri: number) => (
                <div key={ri} className="flex gap-2 text-xs opacity-70">
                  <span className="rounded bg-gray-600 px-1 font-mono text-xs">
                    {route.method}
                  </span>
                  <span>{route.path}</span>
                  {route.description && <span>- {route.description}</span>}
                </div>
              ))}
            </div>
          )}
          {item.fields?.length > 0 && (
            <div className="text-xs opacity-60">
              Fields: {item.fields.join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Recommendations section component
const RecommendationsSection: React.FC<{ recommendations: string[] }> = ({
  recommendations,
}) => (
  <div>
    <h4 className="text-vsc-foreground mb-2 text-sm font-medium">
      💡 Recommendations
    </h4>
    <ul className="text-vsc-descriptionForeground space-y-1 text-xs">
      {recommendations.map((rec: string, index: number) => (
        <li key={index} className="flex items-start gap-1">
          <span className="text-yellow-400">•</span>
          {rec}
        </li>
      ))}
    </ul>
  </div>
);
