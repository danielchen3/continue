import { LinkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import EnhancedMindMapVisualization from "./EnhancedMindMapVisualization";

// Keep interface definitions for compatibility
export interface RequirementItem {
  id: string;
  title: string;
  description: string;
  date: string;
  alignedTasks: TaskItem[];
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  requirementId: string;
}

interface RequirementsTaskAlignmentProps {
  isCollapsed?: boolean;
}

export function RequirementsTaskAlignment({
  isCollapsed = false,
}: RequirementsTaskAlignmentProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  if (isCollapsed) {
    return (
      <div className="flex h-full items-center justify-center p-2">
        <div className="text-center">
          <LinkIcon className="text-vsc-descriptionForeground mx-auto h-6 w-6" />
          <div className="text-vsc-descriptionForeground mt-1 text-xs">
            Mind Map
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header - Fixed */}
      <div className="border-vsc-input-border flex-shrink-0 border-b p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-vsc-foreground flex items-center text-lg font-semibold">
            <LinkIcon className="mr-2 h-5 w-5" />
            Requirements & Tasks Mind Map
          </h3>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-vsc-descriptionForeground hover:text-vsc-foreground text-xs transition-colors"
            title="Show/Hide Instructions"
          >
            {showInstructions ? "Hide Instructions" : "📖 Show Instructions"}
          </button>
        </div>

        {showInstructions && (
          <div className="text-vsc-descriptionForeground bg-vsc-input-background mt-3 rounded-md p-3 text-xs">
            <div className="mb-2 font-medium">Supported files:</div>
            <div className="ml-2">• Plan/re-plan.md</div>
            <div className="ml-2">• plan/re-plan.md</div>
            <div className="ml-2">• re-plan-simple.md</div>
            <div className="mt-2 font-medium">File format example:</div>
            <pre className="mt-1 text-xs">
              {`## R1. Main Requirement Title

### R1.1 Sub Requirement Title

- T1.1.1 Task description
- T1.1.2 Another task`}
            </pre>
          </div>
        )}
      </div>

      {/* Enhanced Mind Map Visualization - Full Screen */}
      <div className="flex-1 overflow-hidden">
        <EnhancedMindMapVisualization className="h-full" />
      </div>
    </div>
  );
}
