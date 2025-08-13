// Component for displaying accumulated text explanations
import {
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

interface ExplanationItem {
  id: string;
  selectedText: string;
  explanation: string;
  timestamp: Date;
  isLoading: boolean;
}

interface KnowledgeAreaProps {
  explanations: ExplanationItem[];
  onRemoveExplanation: (id: string) => void;
  onClearAll: () => void;
}

export function KnowledgeArea({
  explanations,
  onRemoveExplanation,
  onClearAll,
}: KnowledgeAreaProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (explanations.length === 0) {
    return null;
  }

  return (
    <div className="bg-vsc-background border-vsc-input-border mt-3 rounded-lg border">
      {/* Header */}
      <div
        className="border-vsc-input-border text-vsc-foreground hover:bg-vsc-list-hoverBackground flex cursor-pointer items-center justify-between border-b px-4 py-2 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center">
          <AcademicCapIcon className="text-vsc-descriptionForeground mr-2 h-4 w-4" />
          <h4 className="text-sm font-medium">Knowledge Base</h4>
          <span className="text-vsc-descriptionForeground ml-2 text-xs">
            ({explanations.length} explanation
            {explanations.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center">
          {explanations.length > 1 && !isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-vsc-descriptionForeground hover:text-vsc-foreground mr-2 rounded p-1 transition-colors"
              title="Clear all explanations"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          {isCollapsed ? (
            <ChevronDownIcon className="text-vsc-descriptionForeground h-4 w-4" />
          ) : (
            <ChevronUpIcon className="text-vsc-descriptionForeground h-4 w-4" />
          )}
        </div>
      </div>

      {/* Explanations List - Only show when not collapsed */}
      {!isCollapsed && explanations.length > 0 && (
        <div className="scrollbar-thin max-h-32 overflow-y-auto">
          {explanations.map((item, index) => (
            <div
              key={item.id}
              className={`border-vsc-input-border px-3 py-2 ${
                index < explanations.length - 1 ? "border-b" : ""
              }`}
            >
              {/* Selected Text */}
              <div className="mb-2">
                <div className="text-vsc-descriptionForeground mb-1 flex items-center justify-between text-xs">
                  <span>Selected text:</span>
                  <div className="flex items-center">
                    <span className="text-vsc-descriptionForeground mr-2 text-xs">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => onRemoveExplanation(item.id)}
                      className="text-vsc-descriptionForeground rounded p-0.5 transition-colors hover:text-red-400"
                      title="Remove this explanation"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="bg-vsc-input-background border-vsc-input-border text-vsc-foreground rounded border px-2 py-1 text-xs italic">
                  "{item.selectedText}"
                </div>
              </div>

              {/* Explanation */}
              <div>
                <div className="text-vsc-descriptionForeground mb-1 text-xs">
                  Explanation:
                </div>
                <div className="bg-vsc-input-background border-vsc-input-border rounded border px-2 py-2">
                  {item.isLoading ? (
                    <div className="text-vsc-descriptionForeground flex items-center text-xs">
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                      AI is analyzing...
                    </div>
                  ) : (
                    <div className="text-vsc-foreground max-h-16 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
                      {item.explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
