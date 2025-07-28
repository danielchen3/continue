// gui/src/components/TaskPanel/EmptyState.tsx
import { FolderOpenIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface EmptyStateProps {
  debugInfo: string;
  parseDebugInfo: string;
  tasks: any[];
  refreshTasks: () => void;
}

export function EmptyState({
  debugInfo,
  parseDebugInfo,
  tasks,
  refreshTasks,
}: EmptyStateProps) {
  const [showDetailedDebug, setShowDetailedDebug] = useState(false);

  return (
    <div className="p-4 pt-12">
      <div className="text-center text-gray-500">
        <FolderOpenIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
        <p className="text-sm font-medium">No Task Plan Found</p>
        <p className="mt-1 text-xs text-gray-400">
          Ask AI to generate a development plan
        </p>

        {/* Debugging */}
        <div className="mt-4 rounded bg-gray-50 p-3 text-left text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-gray-700">Status</span>
            <button
              onClick={() => setShowDetailedDebug(!showDetailedDebug)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showDetailedDebug ? "Hide" : "Debug"}
            </button>
          </div>

          <div className="space-y-1 text-gray-600">
            <p className="truncate">
              <span className="font-medium">File:</span>{" "}
              {debugInfo || "Searching..."}
            </p>
            <p>
              <span className="font-medium">Tasks:</span> {tasks.length} |
              <span className="font-medium"> Actions:</span>{" "}
            </p>

            {showDetailedDebug && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded border bg-white p-2">
                <p className="mb-1 text-xs font-medium">Expected Locations:</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <div>• ./plan/task.md</div>
                  <div>• ./Plan/task.md</div>
                  <div>• ./manual-testing-sandbox/Plan/task.md</div>
                </div>

                {parseDebugInfo && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium">Debug Log:</p>
                    <div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 p-2 font-mono text-xs">
                      {parseDebugInfo.split("\n").slice(-10).join("\n")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={refreshTasks}
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}
