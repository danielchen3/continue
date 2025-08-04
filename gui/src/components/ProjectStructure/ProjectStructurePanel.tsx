import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useContext, useEffect, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import FileIcon from "../FileIcon";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  description?: string;
  isExpanded?: boolean;
  level: number;
  category?: "frontend" | "backend" | "database" | "config" | "docs" | "assets";
  size?: number;
}

interface ProjectStructurePanelProps {
  isCollapsed: boolean;
}

const descriptionCache = new Map<string, string>();

export function ProjectStructurePanel({
  isCollapsed,
}: ProjectStructurePanelProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });
  const ideMessenger = useContext(IdeMessengerContext);

  const categorizeFile = (
    path: string,
    content?: string,
  ): "frontend" | "backend" | "database" | "config" | "docs" | "assets" => {
    const filename = path.split("/").pop() || "";
    const ext = filename.split(".").pop()?.toLowerCase();

    // path
    if (
      path.includes("/frontend/") ||
      path.includes("/client/") ||
      path.includes("/web/") ||
      path.includes("/gui/")
    ) {
      return "frontend";
    }
    if (
      path.includes("/backend/") ||
      path.includes("/server/") ||
      path.includes("/api/") ||
      path.includes("/core/")
    ) {
      return "backend";
    }
    if (
      path.includes("/database/") ||
      path.includes("/db/") ||
      path.includes("/models/")
    ) {
      return "database";
    }
    if (path.includes("/docs/") || path.includes("/documentation/")) {
      return "docs";
    }
    if (
      path.includes("/assets/") ||
      path.includes("/static/") ||
      path.includes("/public/")
    ) {
      return "assets";
    }

    switch (ext) {
      case "tsx":
      case "jsx":
      case "vue":
      case "html":
      case "css":
      case "scss":
      case "sass":
        return "frontend";
      case "py":
      case "java":
      case "go":
      case "rs":
      case "cpp":
      case "c":
      case "ts":
        return "backend";
      case "sql":
      case "db":
        return "database";
      case "json":
      case "yaml":
      case "yml":
      case "toml":
      case "ini":
        return "config";
      case "md":
      case "txt":
      case "rst":
        return "docs";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "ico":
        return "assets";
      default:
        if (content?.includes("React") || content?.includes("jsx"))
          return "frontend";
        if (content?.includes("express") || content?.includes("fastapi"))
          return "backend";
        return "config";
    }
  };

  // generate static file description
  const generateStaticDescription = (
    filename: string,
    content?: string,
  ): string => {
    const ext = filename.split(".").pop()?.toLowerCase();

    if (filename === "package.json") return "NPM package configuration";
    if (filename === "README.md") return "Project documentation";
    if (filename === "tsconfig.json") return "TypeScript configuration";
    if (filename.includes("docker")) return "Docker configuration";
    if (filename.includes("test") || filename.includes("spec"))
      return "Test file";

    switch (ext) {
      case "tsx":
        return "React TypeScript component";
      case "jsx":
        return "React JavaScript component";
      case "ts":
        return "TypeScript file";
      case "js":
        return "JavaScript file";
      case "py":
        return "Python script";
      case "java":
        return "Java class file";
      case "html":
        return "HTML template";
      case "css":
        return "Stylesheet";
      case "scss":
        return "Sass stylesheet";
      case "json":
        return "JSON configuration";
      case "md":
        return "Markdown documentation";
      case "yml":
      case "yaml":
        return "YAML configuration";
      default:
        return ext?.toUpperCase() || "File";
    }
  };

  // 使用AI生成文件描述
  const generateAIDescription = async (
    filePath: string,
    content?: string,
    forceRegenerate: boolean = false,
  ): Promise<string> => {
    if (!ideMessenger) return "";

    // 检查缓存，除非强制重新生成
    if (!forceRegenerate && descriptionCache.has(filePath)) {
      return descriptionCache.get(filePath)!;
    }

    try {
      // 如果没有提供内容，则读取文件
      let fileContent = content;
      if (!fileContent) {
        console.log("Reading file content for:", filePath);
        fileContent = await ideMessenger.ide.readFile(filePath);
      }

      const filename = filePath.split("/").pop() || "";
      const ext = filename.split(".").pop()?.toLowerCase();

      // DEBUG: 打印文件内容的前几行来验证
      console.log("=== DEBUG PANEL: File content received ===");
      console.log("File path:", filePath);
      console.log("File name:", filename);
      console.log("File extension:", ext);
      console.log("Content length:", fileContent?.length || 0);
      console.log("Content preview (first 500 chars):");
      console.log(fileContent?.substring(0, 500) || "No content");
      console.log("=== END DEBUG PANEL ===");

      const prompt = `Please analyze the following ${ext || "file"} named "${filename}" and provide a concise, precise description (around 20-30 words) of its main purpose and functionality. Please return a relatively refined and brief answer without extra explanation:

File content:
${fileContent}

Description:`;

      console.log("Sending prompt to AI for:", filename);
      let description = "";

      const gen = ideMessenger.llmStreamChat(
        {
          completionOptions: {
            // 不限制maxTokens，让AI自由发挥
            temperature: 0.3,
          },
          title: "File Description Generator",
          messages: [{ role: "user", content: prompt }],
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
      console.log("AI response received for", filename, ":", description);

      // 缓存结果
      descriptionCache.set(filePath, description);
      return description;
    } catch (error) {
      console.error("Error generating AI description:", error);
      return generateStaticDescription(filePath.split("/").pop() || "");
    }
  };

  // 批量生成AI描述
  const generateBatchDescriptions = async () => {
    if (!ideMessenger) return;

    setIsGeneratingAI(true);

    try {
      const allFiles = getAllFiles(fileTree);
      const filesToProcess = allFiles.filter(
        (file) =>
          file.type === "file" &&
          !descriptionCache.has(file.path) &&
          !file.path.includes("node_modules") &&
          !file.path.includes(".git"),
      );

      setAiProgress({ current: 0, total: filesToProcess.length });

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setAiProgress({ current: i + 1, total: filesToProcess.length });

        try {
          const content = await ideMessenger.ide.readFile(file.path);
          const description = await generateAIDescription(
            file.path,
            content,
            false,
          );

          // 更新文件树中的描述
          setFileTree((prevTree) =>
            updateNodeDescription(prevTree, file.path, description),
          );

          // 添加延迟以避免API限制
          if (i < filesToProcess.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error processing ${file.path}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in batch description generation:", error);
    } finally {
      setIsGeneratingAI(false);
      setAiProgress({ current: 0, total: 0 });
    }
  };

  // 更新节点描述的辅助函数
  const updateNodeDescription = (
    nodes: FileNode[],
    targetPath: string,
    description: string,
  ): FileNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, description };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeDescription(
            node.children,
            targetPath,
            description,
          ),
        };
      }
      return node;
    });
  };

  // 获取所有文件（扁平化）
  const getAllFiles = (nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = [];

    const traverse = (nodeList: FileNode[]) => {
      nodeList.forEach((node) => {
        files.push(node);
        if (node.children) {
          traverse(node.children);
        }
      });
    };

    traverse(nodes);
    return files;
  };

  // 加载文件结构
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

      let content = "";
      let description = "";

      if (!isDirectory) {
        try {
          content = await ideMessenger!.ide.readFile(fullPath);
          // 检查缓存或生成静态描述
          if (descriptionCache.has(fullPath)) {
            description = descriptionCache.get(fullPath)!;
          } else {
            description = generateStaticDescription(name, content);
          }
        } catch (e) {
          description = generateStaticDescription(name);
        }
      }

      const node: FileNode = {
        name,
        path: fullPath,
        type: isDirectory ? "directory" : "file",
        level,
        isExpanded: false,
        category: isDirectory ? undefined : categorizeFile(fullPath, content),
        description,
      };

      // 递归加载子目录
      if (isDirectory && level < 3) {
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

  // 切换展开/折叠
  const toggleExpanded = (path: string) => {
    setFileTree((prevTree) => toggleNodeExpanded(prevTree, path));
  };

  const toggleNodeExpanded = (
    nodes: FileNode[],
    targetPath: string,
  ): FileNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      if (node.children) {
        return {
          ...node,
          children: toggleNodeExpanded(node.children, targetPath),
        };
      }
      return node;
    });
  };

  // 打开文件
  const openFile = async (filePath: string) => {
    if (ideMessenger) {
      await ideMessenger.ide.openFile(filePath);
    }
  };

  // 渲染文件树节点
  const renderNode = (node: FileNode) => {
    const isDirectory = node.type === "directory";
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = node.isExpanded;

    return (
      <div key={node.path}>
        <div
          className="hover:bg-vsc-editor-hover group flex cursor-pointer items-center px-2 py-1"
          style={{ paddingLeft: `${node.level * 12 + 8}px` }}
          onClick={() =>
            isDirectory ? toggleExpanded(node.path) : openFile(node.path)
          }
        >
          {isDirectory ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.path);
              }}
              className="mr-1 flex-shrink-0"
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDownIcon className="text-vsc-descriptionForeground h-3 w-3" />
                ) : (
                  <ChevronRightIcon className="text-vsc-descriptionForeground h-3 w-3" />
                )
              ) : (
                <div className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}

          <div className="mr-2 flex-shrink-0">
            {isDirectory ? (
              isExpanded ? (
                <FolderOpenIcon className="text-vsc-directory h-4 w-4" />
              ) : (
                <FolderIcon className="text-vsc-directory h-4 w-4" />
              )
            ) : (
              <FileIcon filename={node.name} height="16px" width="16px" />
            )}
          </div>

          <span className="text-vsc-foreground flex-1 truncate text-sm">
            {node.name}
          </span>

          {!isDirectory && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    console.log(
                      "Generating AI description for (tree):",
                      node.path,
                    );
                    const description = await generateAIDescription(
                      node.path,
                      undefined,
                      true,
                    );
                    console.log("Generated description (tree):", description);
                    setFileTree((prevTree) =>
                      updateNodeDescription(prevTree, node.path, description),
                    );
                  } catch (error) {
                    console.error("Error generating description:", error);
                  }
                }}
                className="hover:bg-vsc-button-background rounded p-1"
                title="Generate AI description"
              >
                <SparklesIcon className="text-vsc-descriptionForeground h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* 显示文件描述 */}
        {!isDirectory && node.description && (
          <div
            className="text-vsc-descriptionForeground border-vsc-input-border mb-1 ml-2 border-l pl-4 text-xs italic"
            style={{ paddingLeft: `${node.level * 12 + 32}px` }}
          >
            {node.description}
          </div>
        )}

        {isDirectory && isExpanded && hasChildren && (
          <div>{node.children!.map((child) => renderNode(child))}</div>
        )}
      </div>
    );
  };

  useEffect(() => {
    loadFileStructure();
  }, [loadFileStructure]);

  if (isCollapsed) return null;

  return (
    <div className="flex h-full flex-col">
      {/* 头部 */}
      <div className="border-vsc-input-border flex-shrink-0 border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-vsc-foreground text-sm font-medium">
            Project Files
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={generateBatchDescriptions}
              disabled={isGeneratingAI || isLoading}
              className="text-vsc-descriptionForeground hover:text-vsc-foreground border-vsc-input-border rounded border px-2 py-1 text-xs disabled:opacity-50"
              title="Generate AI descriptions for all files"
            >
              <SparklesIcon className="mr-1 inline h-3 w-3" />
              {isGeneratingAI ? "Generating..." : "AI Descriptions"}
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

        {/* AI 进度条 */}
        {isGeneratingAI && (
          <div className="mb-2">
            <div className="text-vsc-descriptionForeground mb-1 flex items-center justify-between text-xs">
              <span>Generating AI descriptions...</span>
              <span>
                {aiProgress.current}/{aiProgress.total}
              </span>
            </div>
            <div className="bg-vsc-input-background h-1 w-full rounded-full">
              <div
                className="bg-vsc-focusBorder h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${(aiProgress.current / aiProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="text-vsc-descriptionForeground text-xs">
          Total files:{" "}
          {getAllFiles(fileTree).filter((f) => f.type === "file").length}
        </div>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <ArrowPathIcon className="text-vsc-descriptionForeground mx-auto mb-2 h-8 w-8 animate-spin" />
            <p className="text-vsc-descriptionForeground text-sm">
              Loading project structure...
            </p>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="py-8 text-center">
            <FolderIcon className="text-vsc-descriptionForeground mx-auto mb-2 h-8 w-8" />
            <p className="text-vsc-descriptionForeground text-sm">
              No files found
            </p>
          </div>
        ) : (
          <div className="py-2">{fileTree.map((node) => renderNode(node))}</div>
        )}
      </div>
    </div>
  );
}

// 导出描述缓存供其他组件使用
export { descriptionCache };
