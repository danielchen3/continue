// gui/src/components/TaskPanel/TaskPanel.tsx
import {
  CheckCircleIcon,
  ClockIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { CollapseButton } from "./CollapseButton";
import { CollapsedView } from "./CollapsedView";
import { EmptyState } from "./EmptyState";
import { TaskCard } from "./TaskCard";
import { useTaskFile } from "./TaskFileReader";
import { TaskPanelHeader } from "./TaskPanelHeader";

interface TaskPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function TaskPanel({ isCollapsed, onToggleCollapse }: TaskPanelProps) {
  const {
    projectInfo,
    tasks,
    lastUpdated,
    refreshTasks,
    debugInfo,
    parseDebugInfo,
  } = useTaskFile();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "in-progress":
        return <PlayCircleIcon className="h-5 w-5 text-blue-500" />;
      case "pending":
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const completedCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const progressPercentage =
    tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Task panel with no tasks
  if (!projectInfo || tasks.length === 0) {
    return (
      <div
        className={`border-vsc-input-border relative border-l transition-all duration-300 ${
          isCollapsed ? "w-12" : "w-80"
        }`}
      >
        <CollapseButton
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
        {!isCollapsed && (
          <EmptyState
            debugInfo={debugInfo}
            parseDebugInfo={parseDebugInfo}
            tasks={tasks}
            refreshTasks={refreshTasks}
          />
        )}
      </div>
    );
  }

  // Task panel with tasks
  return (
    <div
      className={`border-vsc-input-border relative flex h-full flex-col border-l transition-all duration-300 ${
        isCollapsed ? "w-12" : "w-80"
      }`}
    >
      <CollapseButton
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {/* Fold */}
      {isCollapsed && (
        <CollapsedView
          completedCount={completedCount}
          totalTasks={tasks.length}
        />
      )}

      {/* Unfold */}
      {!isCollapsed && (
        <>
          {/* Header */}
          <div className="flex-shrink-0">
            <TaskPanelHeader
              projectInfo={projectInfo}
              completedCount={completedCount}
              totalTasks={tasks.length}
              progressPercentage={progressPercentage}
              lastUpdated={lastUpdated}
              refreshTasks={refreshTasks}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Task List */}
            <div className="space-y-2 p-4">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>

            {/* <NextActions nextActions={nextActions} /> */}
          </div>
        </>
      )}
    </div>
  );
}
