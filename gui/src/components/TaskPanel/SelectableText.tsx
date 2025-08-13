// Component for selectable text with explanation functionality
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import React, { useRef, useState } from "react";

interface SelectableTextProps {
  text: string;
  onTextSelected: (selectedText: string, context: string) => void;
  className?: string;
}

export function SelectableText({
  text,
  onTextSelected,
  className = "",
}: SelectableTextProps) {
  const [showExplainButton, setShowExplainButton] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理文本选择
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && containerRef.current) {
      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);

      // 计算按钮位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setButtonPosition({
        top: rect.bottom - containerRect.top + 8,
        left: Math.min(
          rect.left - containerRect.left,
          containerRect.width - 120, // 确保按钮不会超出容器边界
        ),
      });
      setShowExplainButton(true);
    } else {
      hideButton();
    }
  };

  // 隐藏按钮
  const hideButton = () => {
    setShowExplainButton(false);
    setSelectedText("");
  };

  // 处理解释按钮点击
  const handleExplainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedText) {
      onTextSelected(selectedText, text);
      hideButton();
      // 清除选择
      window.getSelection()?.removeAllRanges();
    }
  };

  // 处理点击其他地方
  const handleDocumentClick = (e: Event) => {
    if (!containerRef.current?.contains(e.target as Node)) {
      hideButton();
    }
  };

  React.useEffect(() => {
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseUp={handleTextSelection}
    >
      <span className="cursor-text select-text">{text}</span>

      {/* 解释按钮 */}
      {showExplainButton && (
        <button
          className="bg-vsc-button-background hover:bg-vsc-button-hoverBackground border-vsc-button-border text-vsc-button-foreground absolute z-50 flex items-center rounded border px-3 py-1.5 text-xs shadow-lg transition-colors"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
          }}
          onClick={handleExplainClick}
          title="Explain selected text"
        >
          <ChatBubbleLeftRightIcon className="mr-1.5 h-3.5 w-3.5" />
          Explain
        </button>
      )}
    </div>
  );
}
