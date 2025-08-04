import { useState } from "react";
import { History } from "../../components/History";
import { TaskPanel } from "../../components/TaskPanel/TaskPanel";
import { Chat } from "./Chat";

export default function GUI() {
  const [isTaskPanelCollapsed, setIsTaskPanelCollapsed] = useState(false);
  const [taskPanelWidth, setTaskPanelWidth] = useState(320);

  return (
    <div className="flex h-screen w-screen flex-row overflow-hidden">
      <aside className="4xl:flex border-vsc-input-border no-scrollbar hidden w-96 overflow-y-auto border-0 border-r border-solid">
        <History />
      </aside>
      <main className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
        <Chat />
      </main>
      <TaskPanel
        isCollapsed={isTaskPanelCollapsed}
        onToggleCollapse={() => setIsTaskPanelCollapsed(!isTaskPanelCollapsed)}
        width={taskPanelWidth}
        onWidthChange={setTaskPanelWidth}
      />
    </div>
  );
}
