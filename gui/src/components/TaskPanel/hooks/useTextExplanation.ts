// Hook for handling text explanation functionality in TaskPanel
import { useContext, useState } from "react";
import { IdeMessengerContext } from "../../../context/IdeMessenger";

interface ExplanationItem {
  id: string;
  selectedText: string;
  explanation: string;
  timestamp: Date;
  isLoading: boolean;
}

// 导入TaskPanel的ExplanationsContext
interface ExplanationsContextType {
  explanations: ExplanationItem[];
  setExplanations: React.Dispatch<React.SetStateAction<ExplanationItem[]>>;
}

// 这个会在TaskPanel中定义，这里先声明
let ExplanationsContext: React.Context<ExplanationsContextType> | null = null;

// 设置context的函数，由TaskPanel调用
export const setExplanationsContext = (
  context: React.Context<ExplanationsContextType>,
) => {
  ExplanationsContext = context;
};

export const useTextExplanation = () => {
  // 尝试使用全局context，如果没有则fallback到本地state
  let explanations: ExplanationItem[] = [];
  let setExplanations: React.Dispatch<
    React.SetStateAction<ExplanationItem[]>
  > = () => {};

  try {
    if (ExplanationsContext) {
      const context = useContext(ExplanationsContext);
      explanations = context.explanations;
      setExplanations = context.setExplanations;
    }
  } catch {
    // Fallback to local state if context is not available
  }

  // 如果context不可用，使用本地state作为fallback
  const [localExplanations, setLocalExplanations] = useState<ExplanationItem[]>(
    [],
  );

  if (explanations.length === 0 && setExplanations === (() => {})) {
    explanations = localExplanations;
    setExplanations = setLocalExplanations;
  }

  const ideMessenger = useContext(IdeMessengerContext);

  // 添加新的解释
  const addExplanation = async (text: string, context?: string) => {
    if (!ideMessenger || !text.trim()) return;

    // 创建新的解释项
    const newExplanationId = `explanation-${Date.now()}`;
    const newExplanation: ExplanationItem = {
      id: newExplanationId,
      selectedText: text,
      explanation: "",
      timestamp: new Date(),
      isLoading: true,
    };

    // 添加到解释列表
    setExplanations((prev) => [...prev, newExplanation]);

    try {
      // 构建解释提示词
      const prompt = `Please explain the meaning of the following text clearly and understandably. If it's a technical term, please explain its definition and usage; if it's a task description, please analyze its goals and requirements.

Selected text:
"${text}"

${context ? `\nContext:\n${context}` : ""}

Please answer in English, keep it concise and clear.`;

      // 构建消息
      const messages = [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: prompt,
            },
          ],
        },
      ];

      // 流式调用大模型
      let fullResponse = "";
      const gen = ideMessenger.llmStreamChat(
        {
          completionOptions: {
            maxTokens: 1000,
            temperature: 0.3,
          },
          title: "Text Explanation",
          messages,
        },
        new AbortController().signal,
      );

      let next = await gen.next();
      while (!next.done) {
        if (Array.isArray(next.value)) {
          for (const message of next.value) {
            if (message.role === "assistant" && message.content) {
              if (typeof message.content === "string") {
                fullResponse += message.content;
                // 实时更新解释内容
                setExplanations((prev) =>
                  prev.map((item) =>
                    item.id === newExplanationId
                      ? { ...item, explanation: fullResponse }
                      : item,
                  ),
                );
              } else if (Array.isArray(message.content)) {
                for (const part of message.content) {
                  if (part.type === "text") {
                    fullResponse += part.text;
                    // 实时更新解释内容
                    setExplanations((prev) =>
                      prev.map((item) =>
                        item.id === newExplanationId
                          ? { ...item, explanation: fullResponse }
                          : item,
                      ),
                    );
                  }
                }
              }
            }
          }
        }
        next = await gen.next();
      }

      // 完成加载
      setExplanations((prev) =>
        prev.map((item) =>
          item.id === newExplanationId
            ? {
                ...item,
                explanation:
                  fullResponse ||
                  "Unable to get explanation, please try again.",
                isLoading: false,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Error explaining text:", error);
      setExplanations((prev) =>
        prev.map((item) =>
          item.id === newExplanationId
            ? {
                ...item,
                explanation: `Error occurred during explanation: ${error instanceof Error ? error.message : String(error)}`,
                isLoading: false,
              }
            : item,
        ),
      );
    }
  };

  // 删除特定解释
  const removeExplanation = (id: string) => {
    setExplanations((prev) => prev.filter((item) => item.id !== id));
  };

  // 清除所有解释
  const clearAllExplanations = () => {
    setExplanations([]);
  };

  return {
    explanations,
    addExplanation,
    removeExplanation,
    clearAllExplanations,
  };
};
