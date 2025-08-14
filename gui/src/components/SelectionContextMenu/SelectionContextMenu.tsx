import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";

interface SelectionContextMenuProps {
  position: { x: number; y: number };
  selectedText: string;
  onAskAboutSelection: (question: string) => void;
  onClose: () => void;
}

const predefinedQuestions = [
  {
    icon: DocumentTextIcon,
    label: "Brief explanation",
    question: "Please explain this briefly",
  },
  {
    icon: LightBulbIcon,
    label: "Give examples",
    question: "Please provide examples for this",
  },
  {
    icon: DocumentTextIcon,
    label: "Detailed explanation",
    question: "Please explain this in detail",
  },
  {
    icon: SparklesIcon,
    label: "Simplify explanation",
    question: "Please explain this simply",
  },
  {
    icon: ChatBubbleLeftRightIcon,
    label: "Related questions",
    question: "What are related questions or concepts for this",
  },
];

export default function SelectionContextMenu({
  position,
  selectedText,
  onAskAboutSelection,
  onClose,
}: SelectionContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // adjust window
  const menuHeight = 280;
  const menuWidth = 320;
  const padding = 10;

  let adjustedX = position.x;
  let adjustedY = position.y;

  if (position.x + menuWidth > window.innerWidth) {
    adjustedX = window.innerWidth - menuWidth - padding;
  }
  if (adjustedX < padding) {
    adjustedX = padding;
  }

  const showAbove = position.y + menuHeight > window.innerHeight;
  if (showAbove) {
    // adjust y position to show above
    adjustedY = position.y - menuHeight - 30;

    if (adjustedY < padding) {
      adjustedY = Math.max(padding, window.innerHeight - menuHeight - padding);
    }
  }

  const adjustedPosition = {
    x: adjustedX,
    y: adjustedY,
  };

  return (
    <div
      ref={menuRef}
      className="bg-vsc-background border-vsc-input-border fixed z-50 min-w-[280px] max-w-[320px] rounded-lg border shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* selected context */}
      <div className="border-vsc-input-border border-b p-3">
        <div className="text-vsc-foreground/70 mb-2 text-xs font-medium">
          Selected text:
        </div>
        <div className="text-vsc-foreground bg-vsc-editor-background border-vsc-input-border max-h-20 overflow-y-auto rounded border px-3 py-2 text-sm leading-relaxed">
          {selectedText.length > 100
            ? `${selectedText.substring(0, 100)}...`
            : selectedText}
        </div>
      </div>

      {/* pre-defined question */}
      <div className="p-3">
        <div className="text-vsc-foreground/80 mb-3 px-1 text-xs font-medium">
          Choose an action:
        </div>
        {predefinedQuestions.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              onAskAboutSelection(`${item.question}: ${selectedText}`);
              onClose();
            }}
            className="mb-1.5 flex w-full items-center space-x-3 rounded-md bg-gray-700 px-3 py-2.5 text-sm text-white transition-colors duration-150 hover:bg-gray-600"
          >
            <item.icon className="h-4 w-4 flex-shrink-0 text-gray-300" />
            <span className="text-gray-100">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
