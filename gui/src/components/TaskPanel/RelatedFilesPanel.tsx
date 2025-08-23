// gui/src/components/TaskPanel/RelatedFilesPanel.tsx
import { useContext } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";

interface RelatedFilesPanelProps {
  files: Array<{
    path: string;
    summary: string;
  }>;
  taskStatus: "completed" | "in-progress" | "pending";
}

export function RelatedFilesPanel({
  files,
  taskStatus,
}: RelatedFilesPanelProps) {
  const ideMessenger = useContext(IdeMessengerContext);

  // 处理文件点击
  const handleFileClick = async (filePath: string) => {
    try {
      if (ideMessenger?.ide?.getWorkspaceDirs && ideMessenger?.ide?.openFile) {
        // 获取工作区目录
        const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();
        if (workspaceDirs && workspaceDirs.length > 0) {
          // 构建完整的文件路径
          const fullPath = `${workspaceDirs[0]}/${filePath}`;
          console.log(`Opening file: ${fullPath}`);
          await ideMessenger.ide.openFile(fullPath);
        }
      }
    } catch (error) {
      console.error("Failed to open file:", filePath, error);
    }
  };

  // 获取文件图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return "📄";
      case "ts":
      case "tsx":
        return "📘";
      case "css":
        return "🎨";
      case "html":
        return "🌐";
      case "json":
        return "📋";
      case "md":
        return "📝";
      case "py":
        return "🐍";
      default:
        return "📄";
    }
  };

  // 获取状态相关的颜色样式
  const getStatusColors = () => {
    switch (taskStatus) {
      case "completed":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-700",
          hover: "hover:bg-green-100",
        };
      case "in-progress":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-700",
          hover: "hover:bg-blue-100",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-700",
          hover: "hover:bg-gray-100",
        };
    }
  };

  if (!files || files.length === 0) {
    return null;
  }

  const colors = getStatusColors();

  return (
    <div className="pt-3">
      <h4 className="mb-2 flex items-center text-xs font-medium text-gray-600">
        <span className="mr-1">📁</span>
        Related Files ({files.length}):
      </h4>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={index}
            className={`group rounded border p-2 transition-colors ${colors.bg} ${colors.border} ${colors.hover}`}
          >
            <div
              className="flex cursor-pointer items-center"
              onClick={() => handleFileClick(file.path)}
              title={`Click to open ${file.path}`}
            >
              <span className="mr-2 text-base">{getFileIcon(file.path)}</span>
              <code
                className={`flex-1 ${colors.text} break-all font-mono text-xs`}
              >
                {file.path}
              </code>
              <span className="ml-2 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                →
              </span>
            </div>
            {file.summary && (
              <div className="ml-6 mt-1 text-xs text-gray-500">
                {file.summary}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
