// gui/src/components/TaskPanel/TaskCard.tsx
import React, { useContext, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { KnowledgeArea } from "./ExplanationPanel";
import { RelatedFilesPanel } from "./RelatedFilesPanel";
import { SelectableText } from "./SelectableText";
import { ExplanationItem, useExplanationsContext } from "./TaskPanel";

interface TaskCardProps {
  task: {
    id: number;
    title: string;
    description: string;
    estimatedTime?: string;
    status: "completed" | "in-progress" | "pending";
    progress?: number;
    relatedFiles: Array<{
      path: string;
      summary: string;
    }>;
    checkpoints?: Array<{
      name: string;
      completed: boolean;
    }>;
  };
  index: number;
  getStatusIcon: (status: string) => React.ReactElement;
}

export function TaskCard({ task, index, getStatusIcon }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 使用全局的explanations context
  const { explanations, setExplanations } = useExplanationsContext();
  const ideMessenger = useContext(IdeMessengerContext);

  const getTaskNumberStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600 text-white shadow-md";
      case "in-progress":
        return "bg-blue-600 text-white shadow-md";
      default:
        return "bg-gray-400 text-white shadow-sm";
    }
  };

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
      taskIndex: index, // 添加当前任务的索引
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

  // 清除当前任务的所有解释
  const clearAllExplanations = () => {
    setExplanations((prev) => prev.filter((item) => item.taskIndex !== index));
  };

  // 过滤出属于当前任务的explanations
  const currentTaskExplanations = explanations.filter(
    (exp) => exp.taskIndex === index,
  );

  // 处理文本选择和解释
  const handleTextSelected = async (selectedText: string, context: string) => {
    await addExplanation(selectedText, context);
  };

  return (
    <div
      className={`group relative cursor-pointer rounded-lg border transition-all duration-300 hover:shadow-md ${
        task.status === "in-progress"
          ? "border-blue-300/40 bg-blue-50/80 hover:bg-blue-100/60"
          : task.status === "completed"
            ? "border-green-300/40 bg-green-50/80 hover:bg-green-100/60"
            : "border-vsc-input-border bg-vsc-background hover:bg-vsc-button-background/30"
      } ${isExpanded ? "shadow-lg" : ""}`}
    >
      <div
        className="flex items-start p-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Task number */}
        <div
          className={`mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getTaskNumberStyle(task.status)}`}
        >
          {index + 1}
        </div>

        {/* Task Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3
                className={`text-sm font-medium leading-5 ${
                  task.status === "completed"
                    ? "text-green-800"
                    : task.status === "in-progress"
                      ? "text-blue-800"
                      : "text-vsc-foreground"
                }`}
              >
                <SelectableText
                  text={task.title}
                  onTextSelected={handleTextSelected}
                />
              </h3>
              {task.description && !isExpanded && (
                <p
                  className={`mt-1 line-clamp-2 text-xs ${
                    task.status === "completed"
                      ? "text-green-700/80"
                      : task.status === "in-progress"
                        ? "text-blue-700/80"
                        : "text-vsc-foreground/70"
                  }`}
                >
                  <SelectableText
                    text={task.description}
                    onTextSelected={handleTextSelected}
                  />
                </p>
              )}
            </div>
            <div className="ml-3 flex-shrink-0">
              {getStatusIcon(task.status)}
            </div>
          </div>

          {/* Progress Line */}
          {task.progress && task.progress > 0 && (
            <div className="mt-3">
              <div className="text-vsc-foreground/80 mb-1 flex items-center justify-between text-xs">
                <span>Progress</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <div className="bg-vsc-input-border h-2 w-full rounded-full">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-sm transition-all duration-500"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Checkpoint Preview */}
          {task.checkpoints && task.checkpoints.length > 0 && !isExpanded && (
            <div
              className={`mt-3 flex items-center text-xs ${
                task.status === "completed"
                  ? "text-green-700/80"
                  : task.status === "in-progress"
                    ? "text-blue-700/80"
                    : "text-vsc-foreground/70"
              }`}
            >
              <span
                className={`mr-1 ${
                  task.status === "completed"
                    ? "text-green-600"
                    : task.status === "in-progress"
                      ? "text-blue-500"
                      : "text-green-400"
                }`}
              >
                ✓
              </span>
              <span>
                {task.checkpoints.filter((c) => c.completed).length}/
                {task.checkpoints.length} completed
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unfolded Details */}
      {isExpanded && (
        <div
          className={`border-t px-4 pb-4 ${
            task.status === "completed"
              ? "border-green-200/60 bg-green-50/40"
              : task.status === "in-progress"
                ? "border-blue-200/60 bg-blue-50/40"
                : "border-gray-100"
          }`}
        >
          {task.description && (
            <div className="pt-3">
              <p
                className={`text-sm leading-relaxed ${
                  task.status === "completed"
                    ? "text-green-800"
                    : task.status === "in-progress"
                      ? "text-blue-800"
                      : "text-gray-700"
                }`}
              >
                <SelectableText
                  text={task.description}
                  onTextSelected={handleTextSelected}
                />
              </p>
            </div>
          )}

          {/* Related Files Panel */}
          <RelatedFilesPanel
            files={task.relatedFiles}
            taskStatus={task.status}
          />

          {task.checkpoints && task.checkpoints.length > 0 && (
            <div className="pt-3">
              <h4 className="mb-2 text-xs font-medium text-gray-600">
                Checkpoints:
              </h4>
              <div className="space-y-1.5">
                {task.checkpoints.map((checkpoint, index) => (
                  <div key={index} className="flex items-start text-xs">
                    <span
                      className={`mr-2 mt-0.5 flex-shrink-0 ${
                        checkpoint.completed
                          ? "text-green-500"
                          : "text-gray-300"
                      }`}
                    >
                      {checkpoint.completed ? "✓" : "○"}
                    </span>
                    <span
                      className={
                        checkpoint.completed
                          ? "text-gray-600 line-through"
                          : "text-gray-700"
                      }
                    >
                      <SelectableText
                        text={checkpoint.name}
                        onTextSelected={handleTextSelected}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knowledge Base Area - Show only current task's explanations */}
      <KnowledgeArea
        explanations={currentTaskExplanations}
        onRemoveExplanation={removeExplanation}
        onClearAll={clearAllExplanations}
      />
    </div>
  );
}
