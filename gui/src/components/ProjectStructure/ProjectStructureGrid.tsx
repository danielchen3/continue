import {
  ArrowPathIcon,
  EyeIcon,
  FolderIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useContext, useEffect, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import FileIcon from "../FileIcon";
import { getCategoryIcon } from "./componentUtils";
import { FileCategory, FileNode } from "./types";
import {
  CATEGORIES,
  categorizeFile,
  descriptionCache,
  generateStaticDescription,
  getCategoryInfo,
  getFilesByCategory,
  updateNodeDescription,
} from "./utils";

interface ProjectStructureGridProps {
  isCollapsed: boolean;
}

export function ProjectStructureGrid({
  isCollapsed,
}: ProjectStructureGridProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "kanban">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const ideMessenger = useContext(IdeMessengerContext);

  // Generate AI description
  const generateAIDescription = async (
    filePath: string,
    forceRegenerate: boolean = false,
  ): Promise<string> => {
    if (!ideMessenger) return "";

    // Check cache unless forced to regenerate
    if (!forceRegenerate && descriptionCache.has(filePath)) {
      return descriptionCache.get(filePath)!;
    }

    try {
      const content = await ideMessenger.ide.readFile(filePath);
      const filename = filePath.split("/").pop() || "";
      const ext = filename.split(".").pop()?.toLowerCase();

      const prompt = `You are a code analysis expert. Analyze this ${ext || "file"} and provide a clear, precise description of what it does.

File: ${filename}
Content:
${content}

Please provide a concise 1-2 sentence description focusing on the main functionality and purpose.`;

      let description = "";

      const gen = ideMessenger.llmStreamChat(
        {
          completionOptions: {
            maxTokens: 100,
            temperature: 0.3,
          },
          title: "File Description Generator",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        },
        new AbortController().signal,
      );

      let next = await gen.next();
      while (!next.done) {
        // next.value 是 ChatMessage[] 数组
        if (Array.isArray(next.value)) {
          for (const message of next.value) {
            if (message.role === "assistant" && message.content) {
              if (typeof message.content === "string") {
                description += message.content;
              } else if (Array.isArray(message.content)) {
                // 如果content是MessagePart[]数组
                for (const part of message.content) {
                  if (part.type === "text") {
                    description += part.text;
                  }
                }
              }
            }
          }
        }
        next = await gen.next();
      }

      // 清理响应
      description = description.trim().replace(/^["']|["']$/g, "");

      // 缓存结果
      descriptionCache.set(filePath, description);
      return description;
    } catch (error) {
      console.error("Error generating AI description:", error);
      return generateStaticDescription(filePath.split("/").pop() || "");
    }
  };

  // Load file structure
  const loadFileStructure = useCallback(async () => {
    if (!ideMessenger) return;

    setIsLoading(true);
    try {
      const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();
      if (workspaceDirs.length === 0) return;

      const entries = await ideMessenger.ide.listDir(workspaceDirs[0]);
      const nodes = await buildFileTree(entries, workspaceDirs[0], 0);
      setFileTree(nodes);
    } catch (error) {
      console.error("Error loading file structure:", error);
    } finally {
      setIsLoading(false);
    }
  }, [ideMessenger]);

  // 构建文件树
  const buildFileTree = async (
    entries: [string, number][],
    basePath: string,
    level: number,
  ): Promise<FileNode[]> => {
    const nodes: FileNode[] = [];
    const ignoredDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "__pycache__",
    ]);

    for (const [name, type] of entries) {
      if (ignoredDirs.has(name) || name.startsWith(".")) continue;

      const fullPath = `${basePath}/${name}`;
      const isDirectory = type === 2;

      let description = "";

      if (!isDirectory) {
        // 从缓存获取描述，如果没有则生成静态描述
        if (descriptionCache.has(fullPath)) {
          description = descriptionCache.get(fullPath)!;
        } else {
          description = generateStaticDescription(name);
        }
      }

      const node: FileNode = {
        name,
        path: fullPath,
        type: isDirectory ? "directory" : "file",
        level,
        isExpanded: false,
        category: isDirectory ? undefined : categorizeFile(fullPath),
        description,
      };

      // 只加载第一层目录
      if (isDirectory && level < 2) {
        try {
          const subEntries = await ideMessenger!.ide.listDir(fullPath);
          node.children = await buildFileTree(subEntries, fullPath, level + 1);
        } catch (e) {
          node.children = [];
        }
      }

      nodes.push(node);
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  // 获取所有文件（扁平化）
  // Group files by category
  const getFilesGroupedByCategory = () => {
    return getFilesByCategory(fileTree);
  };

  // 打开文件
  const openFile = async (filePath: string) => {
    if (ideMessenger) {
      await ideMessenger.ide.openFile(filePath);
    }
  };

  // 渲染网格卡片 - 改进版
  const renderFileCard = (file: FileNode) => {
    const categoryInfo = getCategoryInfo(file.category || "config");
    const folderName = file.path.split("/").slice(-2, -1)[0] || "root";

    return (
      <div
        key={file.path}
        onClick={() => openFile(file.path)}
        className="bg-vsc-editor-background hover:bg-vsc-editor-hover border-vsc-input-border group cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
      >
        {/* 文件头部信息 */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileIcon filename={file.name} height="20px" width="20px" />
            <div className="min-w-0 flex-1">
              <div
                className="text-vsc-foreground truncate text-sm font-medium"
                title={file.name}
              >
                {file.name}
              </div>
              <div
                className="text-vsc-descriptionForeground text-xs opacity-75"
                title={`Located in: ${folderName}`}
              >
                📁 {folderName}
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${categoryInfo.lightColor} flex-shrink-0`}
          >
            {categoryInfo.name}
          </span>
        </div>

        {/* 文件描述 */}
        <div className="text-vsc-descriptionForeground mb-4 min-h-[3rem] text-xs leading-relaxed">
          {file.description || (
            <span className="italic opacity-60">No description available</span>
          )}
        </div>

        {/* 文件底部信息和操作 */}
        <div className="flex items-center justify-between">
          <div className="text-vsc-descriptionForeground flex items-center gap-1 text-xs">
            <span className="bg-vsc-input-background rounded px-1.5 py-0.5 font-mono text-xs">
              {file.path.split(".").pop()?.toUpperCase() || "FILE"}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  if (!ideMessenger) return;

                  const description = await generateAIDescription(
                    file.path,
                    true,
                  );

                  // 更新文件树中的描述
                  setFileTree((prevTree) =>
                    updateNodeDescription(prevTree, file.path, description),
                  );
                } catch (error) {
                  console.error("Error generating description:", error);
                }
              }}
              className="hover:bg-vsc-button-background text-vsc-descriptionForeground hover:text-vsc-foreground flex-shrink-0 rounded p-1.5 transition-colors"
              title="Generate AI description"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openFile(file.path);
              }}
              className="hover:bg-vsc-button-background text-vsc-descriptionForeground hover:text-vsc-foreground flex-shrink-0 rounded p-1.5 transition-colors"
              title="Open file"
            >
              <EyeIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render kanban column
  const renderKanbanColumn = (category: string, files: FileNode[]) => {
    const categoryInfo = getCategoryInfo(category as FileCategory);
    const categoryIcon = getCategoryIcon(category as FileCategory);

    return (
      <div key={category} className="w-72 flex-shrink-0">
        <div className={`${categoryInfo.color} rounded-t-lg p-3 text-white`}>
          <div className="flex items-center gap-2">
            {categoryIcon}
            <h3 className="font-medium">{categoryInfo.name}</h3>
            <span className="rounded-full bg-white bg-opacity-20 px-2 py-1 text-xs">
              {files.length}
            </span>
          </div>
        </div>

        <div
          className="bg-vsc-input-background border-vsc-input-border space-y-3 overflow-y-auto rounded-b-lg border border-t-0 p-3"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {files.map((file) => (
            <div
              key={file.path}
              onClick={() => openFile(file.path)}
              className="bg-vsc-editor-background hover:bg-vsc-editor-hover border-vsc-input-border group cursor-pointer rounded border p-3 transition-colors"
            >
              <div className="mb-2 flex items-center gap-2">
                <FileIcon filename={file.name} height="16px" width="16px" />
                <span
                  className="text-vsc-foreground flex-1 truncate text-sm font-medium"
                  title={file.name}
                >
                  {file.name}
                </span>
              </div>
              <div className="text-vsc-descriptionForeground mb-2 text-xs">
                {file.path.split("/").slice(-2, -1)[0] || "root"}
              </div>
              <div className="text-vsc-descriptionForeground mb-3 min-h-[2rem] text-xs">
                {file.description || "No description available"}
              </div>
              <div className="flex items-center justify-end">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const description = await generateAIDescription(
                        file.path,
                        true,
                      );
                      setFileTree((prevTree) =>
                        updateNodeDescription(prevTree, file.path, description),
                      );
                    } catch (error) {
                      console.error("Error generating description:", error);
                    }
                  }}
                  className="hover:bg-vsc-button-background text-vsc-descriptionForeground hover:text-vsc-foreground rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Generate AI description"
                >
                  <SparklesIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadFileStructure();
  }, [loadFileStructure]);

  if (isCollapsed) return null;

  const filesByCategory = getFilesGroupedByCategory();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 头部 */}
      <div className="border-vsc-input-border flex-shrink-0 border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-vsc-foreground text-sm font-medium">
            Project Overview
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setViewMode(viewMode === "grid" ? "kanban" : "grid")
              }
              className="text-vsc-descriptionForeground hover:text-vsc-foreground border-vsc-input-border rounded border px-2 py-1 text-xs"
            >
              {viewMode === "grid" ? "Kanban View" : "Grid View"}
            </button>
            <button
              onClick={loadFileStructure}
              disabled={isLoading}
              className="hover:bg-vsc-button-background rounded p-1"
            >
              <ArrowPathIcon
                className={`text-vsc-foreground h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* 分类过滤器 */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded px-2 py-1 text-xs ${
              selectedCategory === "all"
                ? "bg-vsc-focusBorder text-white"
                : "bg-vsc-input-background text-vsc-descriptionForeground hover:text-vsc-foreground"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((category) => {
            const categoryInfo = getCategoryInfo(category);
            const count = filesByCategory[category]?.length || 0;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded px-2 py-1 text-xs ${
                  selectedCategory === category
                    ? categoryInfo.color + " text-white"
                    : "bg-vsc-input-background text-vsc-descriptionForeground hover:text-vsc-foreground"
                }`}
              >
                {categoryInfo.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 - 修复滚动问题 */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="py-8 text-center">
            <ArrowPathIcon className="text-vsc-descriptionForeground mx-auto mb-2 h-8 w-8 animate-spin" />
            <p className="text-vsc-descriptionForeground text-sm">
              Loading project structure...
            </p>
          </div>
        ) : viewMode === "kanban" ? (
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div
              className="flex h-full gap-6 pb-4"
              style={{ minWidth: "max-content" }}
            >
              {CATEGORIES.map((category) => {
                const files = filesByCategory[category] || [];
                if (files.length === 0) return null;
                return renderKanbanColumn(category, files);
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {CATEGORIES.map((category) => {
              const files = filesByCategory[category] || [];

              // 如果选择了特定分类，只显示该分类
              if (selectedCategory !== "all" && selectedCategory !== category) {
                return null;
              }

              // 如果没有文件，跳过该分类
              if (files.length === 0) {
                return null;
              }

              const categoryInfo = getCategoryInfo(category as FileCategory);
              const categoryIcon = getCategoryIcon(category as FileCategory);

              return (
                <div key={category} className="mb-6">
                  {/* 分类标题 - 只在显示所有分类时显示 */}
                  {selectedCategory === "all" && (
                    <div className="bg-vsc-editor-background sticky top-0 z-10 mb-4 flex items-center gap-2 py-2">
                      {categoryIcon}
                      <h4 className="text-vsc-foreground text-lg font-medium">
                        {categoryInfo.name}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${categoryInfo.lightColor}`}
                      >
                        {files.length} files
                      </span>
                    </div>
                  )}

                  {/* 文件网格 - 确保能够正确换行和显示所有文件 */}
                  <div
                    className="grid w-full gap-4"
                    style={{
                      gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
                      gridAutoRows: "auto", // 确保行高自动调整
                    }}
                  >
                    {files.map((file) => renderFileCard(file))}
                  </div>
                </div>
              );
            })}

            {/* 如果选择的分类没有文件，显示空状态 */}
            {selectedCategory !== "all" &&
              (!filesByCategory[selectedCategory] ||
                filesByCategory[selectedCategory].length === 0) && (
                <div className="py-12 text-center">
                  <FolderIcon className="text-vsc-descriptionForeground mx-auto mb-4 h-12 w-12" />
                  <h3 className="text-vsc-foreground mb-2 text-lg font-medium">
                    No{" "}
                    {getCategoryInfo(
                      selectedCategory as FileCategory,
                    ).name.toLowerCase()}{" "}
                    files found
                  </h3>
                  <p className="text-vsc-descriptionForeground text-sm">
                    Try selecting a different category or refresh the project
                    structure.
                  </p>
                </div>
              )}

            {/* 底部间距，确保最后的内容不会被遮挡 */}
            <div className="h-4"></div>
          </div>
        )}
      </div>
    </div>
  );
}
