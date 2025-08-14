import { ChatHistoryItem } from "core";
import { renderChatMessage, stripImages } from "core/util/messageContent";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  ExtendedMarkdownRenderer,
  hasExtensions,
  parseExtendedContent,
} from "../../features/inline-extensions";
import { useAppSelector } from "../../redux/hooks";
import { selectUIConfig } from "../../redux/slices/configSlice";
import { deleteMessage } from "../../redux/slices/sessionSlice";
import SelectionContextMenu from "../SelectionContextMenu";
import StyledMarkdownPreview from "../StyledMarkdownPreview";
import Reasoning from "./Reasoning";
import ResponseActions from "./ResponseActions";
import ThinkingIndicator from "./ThinkingIndicator";

interface StepContainerProps {
  item: ChatHistoryItem;
  index: number;
  isLast: boolean;
}

export default function StepContainer(props: StepContainerProps) {
  const dispatch = useDispatch();
  const [isTruncated, setIsTruncated] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isStreaming = useAppSelector((state) => state.session.isStreaming);
  const historyItemAfterThis = useAppSelector(
    (state) => state.session.history[props.index + 1],
  );
  const uiConfig = useAppSelector(selectUIConfig);

  const isNextMsgAssistantOrThinking =
    historyItemAfterThis?.message.role === "assistant" ||
    historyItemAfterThis?.message.role === "thinking" ||
    historyItemAfterThis?.message.role === "tool";

  const shouldRenderResponseAction = () => {
    if (isNextMsgAssistantOrThinking) {
      return false;
    }

    if (!historyItemAfterThis) {
      return !props.item.toolCallStates;
    }

    return true;
  };

  // 检查消息内容是否可能包含流程图数据
  // const messageContent = renderChatMessage(props.item.message);
  // const hasFlowChartContent =
  //   typeof messageContent === "string" &&
  //   props.item.message.role === "assistant" &&
  //   detectFlowChartContent(messageContent);

  useEffect(() => {
    if (!isStreaming) {
      const content = renderChatMessage(props.item.message).trim();
      const endingPunctuation = [".", "?", "!", "```", ":"];

      // If not ending in punctuation or emoji, we assume the response got truncated
      if (
        content.trim() !== "" &&
        !(
          endingPunctuation.some((p) => content.endsWith(p)) ||
          /\p{Emoji}/u.test(content.slice(-2))
        )
      ) {
        setIsTruncated(true);
      } else {
        setIsTruncated(false);
      }
    }
  }, [props.item.message.content, isStreaming]);

  function onDelete() {
    dispatch(deleteMessage(props.index));
  }

  function onContinueGeneration() {
    window.postMessage(
      {
        messageType: "userInput",
        data: {
          input: "Continue your response exactly where you left off:",
        },
      },
      "*",
    );
  }

  function handleTextSelection(event: MouseEvent) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowContextMenu(false);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) {
      setShowContextMenu(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (
      containerRef.current &&
      containerRef.current.contains(range.commonAncestorContainer)
    ) {
      setSelectedText(selectedText);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setShowContextMenu(true);
    }
  }

  // handle document click to close context menu
  function handleDocumentClick(event: MouseEvent) {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setShowContextMenu(false);
    }
  }

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  // handle context-aware question
  function handleAskAboutSelection(question: string) {
    window.postMessage(
      {
        messageType: "askAboutSelection",
        data: {
          selectedText,
          question,
          itemIndex: props.index,
        },
      },
      "*",
    );
    setShowContextMenu(false);
  }

  const messageContent = stripImages(props.item.message.content);
  const parsedContent = hasExtensions(messageContent)
    ? parseExtendedContent(messageContent)
    : null;

  // 调试输出
  // if (parsedContent) {
  //   console.log("🔍 StepContainer: 检测到扩展内容");
  //   console.log("📝 原始内容长度:", messageContent.length);
  //   console.log("📝 主内容长度:", parsedContent.mainContent.length);
  //   console.log("🔗 扩展数量:", parsedContent.extensions.length);
  //   parsedContent.extensions.forEach((ext, i) => {
  //     console.log(
  //       `📖 扩展 ${i + 1}: "${ext.targetWord}" -> "${ext.content.substring(0, 50)}..."`,
  //     );
  //   });
  // }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div className="bg-background overflow-hidden p-1 px-1.5">
        {uiConfig?.displayRawMarkdown ? (
          <pre className="text-2xs max-w-full overflow-x-auto whitespace-pre-wrap break-words p-4">
            {renderChatMessage(props.item.message)}
          </pre>
        ) : (
          <>
            <Reasoning {...props} />

            {/* 检查是否有扩展内容 */}
            {parsedContent ? (
              <ExtendedMarkdownRenderer
                content={parsedContent.mainContent}
                extensions={parsedContent.extensions}
                isRenderingInStepContainer
                itemIndex={props.index}
              />
            ) : (
              <StyledMarkdownPreview
                isRenderingInStepContainer
                source={messageContent}
                itemIndex={props.index}
              />
            )}

            {/**
             * 在这里添加流程图渲染，只有当检测到流程图内容且不在流式传输中时显示
             * {hasFlowChartContent && !isStreaming && (
             *   <div className="mt-4">
             *     <FlowChartRenderer {...parseFlowChartContent(messageContent)} />
             *   </div>
             * )}
             */}
          </>
        )}
        {props.isLast && <ThinkingIndicator historyItem={props.item} />}
      </div>
      {shouldRenderResponseAction() && (
        // We want to occupy space in the DOM regardless of whether the actions are visible to avoid jank on stream complete
        <div className={`mt-2 h-7 transition-opacity duration-300 ease-in-out`}>
          {!isStreaming && (
            <ResponseActions
              isTruncated={isTruncated}
              onDelete={onDelete}
              onContinueGeneration={onContinueGeneration}
              index={props.index}
              item={props.item}
              isLast={props.isLast}
            />
          )}
        </div>
      )}

      {/* 选择文本的上下文菜单 */}
      {showContextMenu && contextMenuPosition && (
        <SelectionContextMenu
          position={contextMenuPosition}
          selectedText={selectedText}
          onAskAboutSelection={handleAskAboutSelection}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
}
