// gui/src/components/TaskPanel/TaskPanel.tsx
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderIcon,
  ListBulletIcon,
  PlayCircleIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import {
  ProjectStructureFlow,
  ProjectStructureGrid,
  ProjectStructurePanel,
} from "../ProjectStructure";
import { CollapseButton } from "./CollapseButton";
import { CollapsedView } from "./CollapsedView";
import { EmptyState } from "./EmptyState";
import { TaskCard } from "./TaskCard";
import { useTaskFile } from "./TaskFileReader";
import { TaskPanelHeader } from "./TaskPanelHeader";

interface TaskPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

type TabType = "tasks" | "structure";
type StructureView = "tree" | "flow" | "grid";

export function TaskPanel({
  isCollapsed,
  onToggleCollapse,
  width = 320,
  onWidthChange,
}: TaskPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [structureView, setStructureView] = useState<StructureView>("tree");
  const [isResizing, setIsResizing] = useState(false);
  const {
    projectInfo,
    tasks,
    lastUpdated,
    refreshTasks,
    debugInfo,
    parseDebugInfo,
  } = useTaskFile();

  // 处理拖拽调整宽度
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCollapsed) return;
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(
        280,
        Math.min(800, startWidth + (startX - e.clientX)),
      );
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

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

  // 渲染标签按钮
  const renderTabs = () => (
    <div className="border-vsc-input-border flex border-b">
      <button
        onClick={() => setActiveTab("tasks")}
        className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
          activeTab === "tasks"
            ? "border-vsc-focusBorder text-vsc-foreground bg-vsc-editor-background border-b-2"
            : "text-vsc-descriptionForeground hover:text-vsc-foreground hover:bg-vsc-editor-hover"
        }`}
      >
        <ListBulletIcon className="mr-2 h-4 w-4" />
        Task List
      </button>
      <button
        onClick={() => setActiveTab("structure")}
        className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
          activeTab === "structure"
            ? "border-vsc-focusBorder text-vsc-foreground bg-vsc-editor-background border-b-2"
            : "text-vsc-descriptionForeground hover:text-vsc-foreground hover:bg-vsc-editor-hover"
        }`}
      >
        <FolderIcon className="mr-2 h-4 w-4" />
        Project Structure
      </button>
    </div>
  );

  // 渲染结构视图切换按钮
  const renderStructureViewToggle = () => (
    <div className="border-vsc-input-border bg-vsc-input-background flex border-b">
      <button
        onClick={() => setStructureView("tree")}
        className={`flex items-center px-2 py-1 text-xs transition-colors ${
          structureView === "tree"
            ? "text-vsc-foreground bg-vsc-editor-background"
            : "text-vsc-descriptionForeground hover:text-vsc-foreground hover:bg-vsc-editor-hover"
        }`}
        title="Tree View"
      >
        <ViewColumnsIcon className="mr-1 h-3 w-3" />
        Tree
      </button>
      <button
        onClick={() => setStructureView("flow")}
        className={`flex items-center px-2 py-1 text-xs transition-colors ${
          structureView === "flow"
            ? "text-vsc-foreground bg-vsc-editor-background"
            : "text-vsc-descriptionForeground hover:text-vsc-foreground hover:bg-vsc-editor-hover"
        }`}
        title="Flow Diagram"
      >
        <ChartBarIcon className="mr-1 h-3 w-3" />
        Flow
      </button>
      <button
        onClick={() => setStructureView("grid")}
        className={`flex items-center px-2 py-1 text-xs transition-colors ${
          structureView === "grid"
            ? "text-vsc-foreground bg-vsc-editor-background"
            : "text-vsc-descriptionForeground hover:text-vsc-foreground hover:bg-vsc-editor-hover"
        }`}
        title="Grid View"
      >
        <Squares2X2Icon className="mr-1 h-3 w-3" />
        Grid
      </button>
    </div>
  );

  // 渲染项目结构内容
  const renderStructureContent = () => {
    if (structureView === "flow") {
      return <ProjectStructureFlow isCollapsed={false} />;
    } else if (structureView === "grid") {
      return <ProjectStructureGrid isCollapsed={false} />;
    }
    return <ProjectStructurePanel isCollapsed={false} />;
  };

  // Task panel with no tasks
  if (!projectInfo || tasks.length === 0) {
    return (
      <div
        className={`border-vsc-input-border relative border-l transition-all duration-300 ${
          isCollapsed ? "w-12" : ""
        }`}
        style={{ width: isCollapsed ? "48px" : `${width}px` }}
      >
        {/* 拖拽调整宽度的手柄 */}
        {!isCollapsed && (
          <div
            className="hover:bg-vsc-focusBorder absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent"
            onMouseDown={handleMouseDown}
            style={{ cursor: isResizing ? "col-resize" : "col-resize" }}
          />
        )}

        <CollapseButton
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
        {!isCollapsed && (
          <div className="flex h-full flex-col">
            {renderTabs()}
            {activeTab === "structure" && renderStructureViewToggle()}
            <div className="flex-1 overflow-hidden">
              {activeTab === "tasks" ? (
                <EmptyState
                  debugInfo={debugInfo}
                  parseDebugInfo={parseDebugInfo}
                  tasks={tasks}
                  refreshTasks={refreshTasks}
                />
              ) : (
                renderStructureContent()
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Task panel with tasks
  return (
    <div
      className={`border-vsc-input-border relative flex h-full flex-col border-l transition-all duration-300 ${
        isCollapsed ? "w-12" : ""
      }`}
      style={{ width: isCollapsed ? "48px" : `${width}px` }}
    >
      {/* 拖拽调整宽度的手柄 */}
      {!isCollapsed && (
        <div
          className="hover:bg-vsc-focusBorder absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent"
          onMouseDown={handleMouseDown}
          style={{ cursor: isResizing ? "col-resize" : "col-resize" }}
        />
      )}

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
        <div className="flex flex-1 flex-col">
          {/* 标签栏 */}
          {renderTabs()}

          {/* 项目结构视图切换 */}
          {activeTab === "structure" && renderStructureViewToggle()}

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "tasks" ? (
              <div className="flex h-full flex-col">
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
                </div>
              </div>
            ) : (
              renderStructureContent()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
