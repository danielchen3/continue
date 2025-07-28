// gui/src/components/TaskPanel/TaskPanelHeader.tsx
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface ProjectInfo {
  name: string;
  type: string;
  totalTime?: string;
  currentProgress: string;
}

interface TaskPanelHeaderProps {
  projectInfo: ProjectInfo;
  completedCount: number;
  totalTasks: number;
  progressPercentage: number;
  lastUpdated: Date | null;
  refreshTasks: () => void;
}

export function TaskPanelHeader({
  projectInfo,
  completedCount,
  totalTasks,
  progressPercentage,
  lastUpdated,
  refreshTasks,
}: TaskPanelHeaderProps) {
  return (
    <div className="border-vsc-input-border bg-vsc-background border-b p-4 pt-12">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="truncate text-lg font-semibold">{projectInfo.name}</h2>
        <button
          onClick={refreshTasks}
          className="rounded p-1 hover:bg-gray-100"
          title="Refresh Tasks"
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>{projectInfo.type}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
            {completedCount}/{totalTasks} tasks
          </span>
        </div>
        {lastUpdated && (
          <p className="mt-1 text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* 进度条 */}
      <div className="mb-2">
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-medium">Overall Progress</span>
          <span className="font-medium">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              progressPercentage === 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {progressPercentage === 100 && (
          <p className="mt-1 text-xs font-medium text-green-600">
            🎉 All tasks completed!
          </p>
        )}
      </div>
    </div>
  );
}
