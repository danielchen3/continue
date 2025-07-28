// gui/src/components/TaskPanel/TaskCard.tsx
import React, { useState } from "react";

interface TaskCardProps {
  task: {
    id: number;
    title: string;
    description: string;
    estimatedTime?: string;
    status: "completed" | "in-progress" | "pending";
    progress?: number;
    // relatedFiles: string[];
    checkpoints?: Array<{
      name: string;
      completed: boolean;
    }>;
  };
  index: number;
  getStatusIcon: (status: string) => React.ReactElement;
}

export function TaskCard({ task, index, getStatusIcon }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTaskNumberStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white";
      case "in-progress":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  return (
    <div
      className={`group relative cursor-pointer rounded-lg border transition-all duration-300 hover:shadow-md ${
        task.status === "in-progress"
          ? "border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/15"
          : task.status === "completed"
            ? "border-green-400/30 bg-green-500/10 hover:bg-green-500/15"
            : "border-vsc-input-border bg-vsc-background hover:bg-vsc-button-background/50"
      } ${isExpanded ? "shadow-lg" : ""}`}
    >
      <div
        className="flex items-start p-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Task number */}
        <div
          className={`mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${getTaskNumberStyle(task.status)}`}
        >
          {index + 1}
        </div>

        {/* Task Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3
                className={`text-sm font-medium leading-5 ${
                  task.status === "completed"
                    ? "text-green-300"
                    : "text-vsc-foreground"
                }`}
              >
                {task.title}
              </h3>
              {task.description && !isExpanded && (
                <p className="text-vsc-foreground/70 mt-1 line-clamp-2 text-xs">
                  {task.description}
                </p>
              )}
            </div>
            <div className="ml-3 flex-shrink-0">
              {getStatusIcon(task.status)}
            </div>
          </div>

          {/* Progress Line */}
          {task.progress && task.progress > 0 && (
            <div className="mt-3">
              <div className="text-vsc-foreground/80 mb-1 flex items-center justify-between text-xs">
                <span>Progress</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <div className="bg-vsc-input-border h-2 w-full rounded-full">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-sm transition-all duration-500"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Checkpoint Preview */}
          {task.checkpoints && task.checkpoints.length > 0 && !isExpanded && (
            <div className="text-vsc-foreground/70 mt-3 flex items-center text-xs">
              <span className="mr-1 text-green-400">✓</span>
              <span>
                {task.checkpoints.filter((c) => c.completed).length}/
                {task.checkpoints.length} completed
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unfolded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-3 pb-3">
          {task.description && (
            <div className="pt-3">
              <p className="text-sm leading-relaxed text-gray-700">
                {task.description}
              </p>
            </div>
          )}

          {/* {task.relatedFiles.length > 0 && (
            <div className="pt-3">
              <h4 className="mb-2 text-xs font-medium text-gray-600">
                Related Files:
              </h4>
              <div className="space-y-1">
                {task.relatedFiles.map((file, index) => (
                  <div key={index} className="flex items-center text-xs">
                    <span className="mr-2 text-gray-400">📄</span>
                    <code className="rounded bg-blue-50 px-1 py-0.5 text-blue-600">
                      {file}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {task.checkpoints && task.checkpoints.length > 0 && (
            <div className="pt-3">
              <h4 className="mb-2 text-xs font-medium text-gray-600">
                Checkpoints:
              </h4>
              <div className="space-y-1.5">
                {task.checkpoints.map((checkpoint, index) => (
                  <div key={index} className="flex items-start text-xs">
                    <span
                      className={`mr-2 mt-0.5 flex-shrink-0 ${
                        checkpoint.completed
                          ? "text-green-500"
                          : "text-gray-300"
                      }`}
                    >
                      {checkpoint.completed ? "✓" : "○"}
                    </span>
                    <span
                      className={
                        checkpoint.completed
                          ? "text-gray-600 line-through"
                          : "text-gray-700"
                      }
                    >
                      {checkpoint.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
