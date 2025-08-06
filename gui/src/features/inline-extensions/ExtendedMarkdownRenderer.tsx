import React, { useEffect, useRef, useState } from "react";
import StyledMarkdownPreview from "../../components/StyledMarkdownPreview";
import { ExtensionBlock } from "./parseExtendedContent";

interface ExtendedMarkdownRendererProps {
  content: string;
  extensions: ExtensionBlock[];
  isRenderingInStepContainer?: boolean;
  itemIndex?: number;
}

export const ExtendedMarkdownRenderer: React.FC<
  ExtendedMarkdownRendererProps
> = ({ content, extensions, isRenderingInStepContainer, itemIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // 添加调试信息的函数
  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${info}`,
    ]);
  };

  // 如果没有扩展，直接返回原始的 Markdown 预览
  if (extensions.length === 0) {
    return (
      <div>
        <StyledMarkdownPreview
          isRenderingInStepContainer={isRenderingInStepContainer}
          source={content}
          itemIndex={itemIndex}
        />
        <div
          style={{
            backgroundColor: "#2d2d2d",
            color: "#ffa500",
            padding: "10px",
            marginTop: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >
          🔍 调试信息: 没有检测到扩展内容 (长度: {content.length})
        </div>
      </div>
    );
  }

  // 在对应词汇位置添加图标的逻辑
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    if (container.querySelector(".extension-icon")) return;

    const timer = setTimeout(() => {
      addDebugInfo(`🔍 开始处理 ${extensions.length} 个扩展`);
      addDebugInfo(`📄 原始内容长度: ${content.length}`);
      addDebugInfo(`📄 原始内容预览: "${content.substring(0, 100)}..."`);

      extensions.forEach((ext, i) => {
        addDebugInfo(
          `📝 扩展${i + 1}: "${ext.targetWord}" -> "${ext.content.substring(0, 50)}..."`,
        );
      });
      const matches: Array<{
        textNode: Text;
        wordIndex: number;
        ext: ExtensionBlock;
      }> = [];

      extensions.forEach((ext) => {
        addDebugInfo(`🔎 搜索词汇: "${ext.targetWord}"`);

        // 使用 TreeWalker 遍历所有文本节点
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          null,
        );

        let node;
        let nodeCount = 0;

        while ((node = walker.nextNode())) {
          const textNode = node as Text;
          const text = textNode.textContent || "";
          nodeCount++;

          // 更详细的调试：显示每个文本节点的内容
          addDebugInfo(
            `📄 文本节点${nodeCount}: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
          );

          const wordIndex = text
            .toLowerCase()
            .indexOf(ext.targetWord.toLowerCase());

          if (wordIndex !== -1) {
            addDebugInfo(
              `✅ 找到匹配: "${ext.targetWord}" 在位置 ${wordIndex} 文本: "${text.substring(0, 30)}..."`,
            );
            addDebugInfo(`🔍 完整文本节点: "${text}"`);
            matches.push({ textNode, wordIndex, ext });
            break; // 每个扩展只处理第一个匹配
          }
        }

        if (nodeCount === 0) {
          addDebugInfo(`❌ 没有找到任何文本节点`);
        } else {
          addDebugInfo(`📊 遍历了 ${nodeCount} 个文本节点`);
        }
      });

      // 按照在文档中的位置排序（从后往前处理，避免位置偏移）
      matches.reverse();

      addDebugInfo(`🎯 找到 ${matches.length} 个匹配，开始处理...`);

      // 处理所有匹配
      matches.forEach(({ textNode, wordIndex, ext }) => {
        addDebugInfo(`🔧 处理匹配: "${ext.targetWord}"`);
        const text = textNode.textContent || "";
        const parent = textNode.parentNode;

        if (parent) {
          // 分割文本
          const beforeText = text.substring(
            0,
            wordIndex + ext.targetWord.length,
          );
          const afterText = text.substring(wordIndex + ext.targetWord.length);

          // 创建新的文本节点
          const beforeTextNode = document.createTextNode(beforeText);
          const afterTextNode = document.createTextNode(afterText);

          // 创建扩展图标元素
          const iconSpan = document.createElement("span");
          iconSpan.textContent = "📖";
          iconSpan.className = "extension-icon";
          iconSpan.setAttribute("data-extension-id", ext.id);
          iconSpan.style.cssText = `
            color: #007acc;
            cursor: help;
            text-decoration: underline;
            text-decoration-style: dotted;
            font-size: 0.85em;
            display: inline;
            margin-left: 3px;
            margin-right: 3px;
            font-weight: bold;
            background-color: rgba(0, 122, 204, 0.1);
            padding: 1px 3px;
            border-radius: 3px;
            border: 1px solid rgba(0, 122, 204, 0.3);
            transition: all 0.1s ease;
          `;

          // 悬停效果
          iconSpan.addEventListener("mouseenter", () => {
            iconSpan.style.backgroundColor = "rgba(0, 122, 204, 0.2)";
            iconSpan.style.borderColor = "rgba(0, 122, 204, 0.5)";
            iconSpan.style.transform = "scale(1.05)";
          });

          iconSpan.addEventListener("mouseleave", () => {
            iconSpan.style.backgroundColor = "rgba(0, 122, 204, 0.1)";
            iconSpan.style.borderColor = "rgba(0, 122, 204, 0.3)";
            iconSpan.style.transform = "scale(1)";
          });

          // 工具提示功能 - 只显示解释内容
          let tooltip: HTMLDivElement | null = null;

          const showTooltip = () => {
            // 移除已存在的工具提示
            if (tooltip && document.body.contains(tooltip)) {
              document.body.removeChild(tooltip);
            }

            tooltip = document.createElement("div");
            tooltip.innerHTML = ext.content; // 只显示解释内容，不显示词汇
            tooltip.style.cssText = `
              position: fixed;
              background-color: var(--vscode-editor-background, #1e1e1e);
              border: 1px solid var(--vscode-panel-border, #3c3c3c);
              border-radius: 6px;
              padding: 12px 16px;
              max-width: 350px;
              min-width: 200px;
              z-index: 1000;
              color: var(--vscode-editor-foreground, #d4d4d4);
              font-size: 13px;
              line-height: 1.5;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
              pointer-events: none;
            `;

            const rect = iconSpan.getBoundingClientRect();
            const tooltipX = Math.min(rect.left, window.innerWidth - 420);
            const tooltipY = rect.bottom + 8;

            tooltip.style.left = Math.max(0, tooltipX) + "px";
            tooltip.style.top = tooltipY + "px";

            document.body.appendChild(tooltip);
          };

          const hideTooltip = () => {
            if (tooltip && document.body.contains(tooltip)) {
              document.body.removeChild(tooltip);
              tooltip = null;
            }
          };

          iconSpan.addEventListener("mouseenter", showTooltip);
          iconSpan.addEventListener("mouseleave", hideTooltip);

          parent.insertBefore(beforeTextNode, textNode);
          parent.insertBefore(iconSpan, textNode);
          parent.insertBefore(afterTextNode, textNode);
          parent.removeChild(textNode);

          addDebugInfo(`✅ 成功添加图标: "${ext.targetWord}"`);
        } else {
          addDebugInfo(`❌ 无法找到父节点: "${ext.targetWord}"`);
        }
      });
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [extensions]);

  return (
    <div ref={containerRef} className="extended-markdown-container">
      <StyledMarkdownPreview
        isRenderingInStepContainer={isRenderingInStepContainer}
        source={content}
        itemIndex={itemIndex}
      />

      {/* 调试信息面板 */}
      {/* {debugInfo.length > 0 && (
        <div
          style={{
            backgroundColor: "#2d2d2d",
            color: "#ffa500",
            padding: "10px",
            marginTop: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            fontFamily: "monospace",
            maxHeight: "200px",
            overflowY: "auto",
            border: "1px solid #444",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
            🔍 调试信息 ({debugInfo.length} 条记录):
          </div>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ marginBottom: "2px" }}>
              {info}
            </div>
          ))}
        </div>
      )} */}
    </div>
  );
};
