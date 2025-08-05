// Custom React Flow node components
import {
  CircleStackIcon,
  CogIcon,
  CpuChipIcon,
  DocumentIcon,
  FolderIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useContext, useState } from "react";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import FileIcon from "../../FileIcon";
import { descriptionCache } from "../utils";

// Custom folder node for ReactFlow
export function FolderNode({ data }: { data: any }) {
  return (
    <div className="min-w-[120px] rounded-lg border-2 border-blue-300 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <FolderIcon className="h-5 w-5" />
        <span className="text-sm font-semibold">{data.label}</span>
      </div>
      {data.description && (
        <div className="mt-1 text-xs opacity-90">{data.description}</div>
      )}
    </div>
  );
}

// Custom file node with AI description generation
export function FileNodeComponent({ data }: { data: any }) {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const ideMessenger = useContext(IdeMessengerContext);

  // Get category-specific colors
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "frontend":
        return "from-green-500 to-green-600 border-green-300";
      case "backend":
        return "from-purple-500 to-purple-600 border-purple-300";
      case "database":
        return "from-orange-500 to-orange-600 border-orange-300";
      case "config":
        return "from-gray-500 to-gray-600 border-gray-300";
      case "docs":
        return "from-yellow-500 to-yellow-600 border-yellow-300";
      case "project":
        return "from-blue-500 to-blue-600 border-blue-300";
      case "assets":
        return "from-pink-500 to-pink-600 border-pink-300";
      default:
        return "from-indigo-500 to-indigo-600 border-indigo-300";
    }
  };

  // Get category-specific icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "frontend":
        return <GlobeAltIcon className="h-4 w-4" />;
      case "backend":
        return <CpuChipIcon className="h-4 w-4" />;
      case "database":
        return <CircleStackIcon className="h-4 w-4" />;
      case "config":
        return <CogIcon className="h-4 w-4" />;
      case "project":
        return <FolderIcon className="h-4 w-4" />;
      case "docs":
        return <DocumentIcon className="h-4 w-4" />;
      default:
        return <FileIcon filename={data.label} height="16px" width="16px" />;
    }
  };

  // Generate AI description for file
  const generateAIDescription = async (
    filePath: string,
    forceRegenerate = false,
  ) => {
    if (!ideMessenger) {
      console.log("No ideMessenger available");
      return;
    }

    console.log(
      "Generating AI description for:",
      filePath,
      "Force regenerate:",
      forceRegenerate,
    );

    if (!forceRegenerate && descriptionCache.has(filePath)) {
      console.log("Description already cached for:", filePath);
      return;
    }

    setIsGeneratingDescription(true);

    try {
      const fileContent = await ideMessenger.ide.readFile(filePath);
      const filename = filePath.split("/").pop() || "";
      const ext = filename.split(".").pop()?.toLowerCase();

      const prompt = `You are a code analysis expert. Analyze this ${ext || "file"} and provide a clear, precise description of what it does.

File: ${filename}
Content:
${fileContent}

Please provide a concise 1-2 sentence description focusing on the main functionality and purpose.`;

      let fullResponse = "";
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
      while (!next.done && next.value) {
        if (Array.isArray(next.value) && next.value.length > 0) {
          const latestMessage = next.value[next.value.length - 1];
          if (latestMessage?.content) {
            fullResponse += latestMessage.content;
          }
        }
        next = await gen.next();
      }

      if (fullResponse.trim()) {
        descriptionCache.set(filePath, fullResponse.trim());
        // Trigger Flow component to rebuild data
        window.dispatchEvent(new CustomEvent("refreshProjectFlow"));
      }
    } catch (error) {
      console.error("Error generating AI description:", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <div
      className={`bg-gradient-to-r ${getCategoryColor(data.category)} relative min-w-[100px] cursor-pointer rounded-md border-2 px-3 py-2 text-white shadow-md transition-all hover:scale-105 hover:shadow-lg`}
      title={`Click to ${data.type === "file" && data.path ? "open file" : data.routes?.length > 0 ? "open route" : "view details"}`}
    >
      <div className="flex items-center gap-2">
        {getCategoryIcon(data.category)}
        <span className="truncate text-xs font-medium">{data.label}</span>
        {data.type === "file" && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the node click
              generateAIDescription(data.path, true);
            }}
            disabled={isGeneratingDescription}
            className="ml-1 rounded bg-white/20 px-1 py-0.5 text-xs opacity-70 hover:opacity-100 disabled:opacity-50"
            title="Generate AI description"
          >
            {isGeneratingDescription ? "..." : "AI"}
          </button>
        )}
        {/* Show clickable indicators */}
        {(data.path || data.routes?.length > 0 || data.url) && (
          <div className="ml-1 flex h-2 w-2 items-center justify-center rounded-full bg-white/30">
            <div className="h-1 w-1 rounded-full bg-white"></div>
          </div>
        )}
      </div>
      {data.description && (
        <div className="mt-1 line-clamp-2 text-xs opacity-90">
          {data.description}
        </div>
      )}
      {/* Show route information if available */}
      {data.routes && data.routes.length > 0 && (
        <div className="mt-1 text-xs opacity-75">
          🔗 {data.routes[0].method} {data.routes[0].path}
        </div>
      )}
    </div>
  );
}
