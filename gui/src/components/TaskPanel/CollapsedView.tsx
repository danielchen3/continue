// gui/src/components/TaskPanel/CollapsedView.tsx

interface CollapsedViewProps {
  completedCount: number;
  totalTasks: number;
}

export function CollapsedView({
  completedCount,
  totalTasks,
}: CollapsedViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 py-4">
      <div className="-rotate-90 transform whitespace-nowrap text-xs font-medium text-gray-500">
        Tasks
      </div>
      <div className="flex flex-col items-center space-y-1">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <div className="text-xs font-medium text-gray-600">
          {completedCount}
        </div>
        <div className="w-4 border-t border-gray-300"></div>
        <div className="text-xs font-medium text-gray-600">{totalTasks}</div>
      </div>
    </div>
  );
}
