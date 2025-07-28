// gui/src/components/TaskPanel/CollapseButton.tsx
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface CollapseButtonProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function CollapseButton({
  isCollapsed,
  onToggleCollapse,
}: CollapseButtonProps) {
  return (
    <button
      onClick={onToggleCollapse}
      className="bg-vsc-background border-vsc-input-border hover:bg-vsc-button-background absolute right-0 top-1 z-10 flex h-7 w-6 items-center justify-center rounded-md border shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
      title={isCollapsed ? "Unfold Panel" : "Fold Panel"}
    >
      {isCollapsed ? (
        <ChevronRightIcon className="text-vsc-foreground h-5 w-5" />
      ) : (
        <ChevronLeftIcon className="text-vsc-foreground h-5 w-5" />
      )}
    </button>
  );
}
