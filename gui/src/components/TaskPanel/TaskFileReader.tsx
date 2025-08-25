// gui/src/components/TaskPanel/TaskFileReader.tsx
import { useContext, useEffect, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";

interface TaskItem {
  id: number;
  title: string;
  description: string;
  estimatedTime?: string;
  status: "completed" | "in-progress" | "pending";
  progress?: number;
  completedTime?: string;
  relatedFiles: Array<{
    path: string;
    summary: string;
  }>;
  checkpoints?: Array<{
    name: string;
    completed: boolean;
  }>;
}

interface ProjectInfo {
  name: string;
  type: string;
  totalTime?: string;
  currentProgress: string;
}

export function useTaskFile() {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [parseDebugInfo, setParseDebugInfo] = useState<string>(""); // 新增解析调试信息
  const ideMessenger = useContext(IdeMessengerContext);

  const parseTaskFile = (content: string) => {
    let debugLog = "";
    const addLog = (message: string) => {
      debugLog += message + "\n";
      setParseDebugInfo(debugLog);
    };

    addLog(`🔍 Starting to parse file content, length: ${content.length}`);
    addLog(`🔍 File content preview: ${content.substring(0, 300)}...`);

    const lines = content.split("\n");
    let currentSection = "";
    let currentTask: Partial<TaskItem> = {};
    let parsedTasks: TaskItem[] = [];
    let parsedProjectInfo: ProjectInfo | null = null;
    let parsedNextActions: string[] = [];
    let inRelatedFilesSection = false;

    addLog(`📄 Total lines in file: ${lines.length}`);
    addLog("📄 First 10 lines:");
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      addLog(`Line ${i}: "${lines[i]}"`);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Parse project info - support both English and Chinese, with or without dash prefix
      if (
        line.includes("**Project Name**:") ||
        line.includes("**项目名称**:")
      ) {
        const name = line.split(":")[1]?.trim() || "";
        addLog(`📝 Found project name: "${name}" from line: "${line}"`);
        parsedProjectInfo = { ...parsedProjectInfo, name } as ProjectInfo;
      }
      if (
        line.includes("**Project Type**:") ||
        line.includes("**项目类型**:")
      ) {
        const type = line.split(":")[1]?.trim() || "";
        addLog(`📝 Found project type: "${type}" from line: "${line}"`);
        parsedProjectInfo = { ...parsedProjectInfo, type } as ProjectInfo;
      }
      if (
        line.includes("**Current Progress**:") ||
        line.includes("**当前进度**:")
      ) {
        const currentProgress = line.split(":")[1]?.trim() || "";
        addLog(
          `📝 Found current progress: "${currentProgress}" from line: "${line}"`,
        );
        parsedProjectInfo = {
          ...parsedProjectInfo,
          currentProgress,
        } as ProjectInfo;
      }

      // Parse task title line
      if (line.match(/^### [✅🔄📝❌]/)) {
        addLog(`🎯 Found potential task line: "${line}"`);

        // Save previous task
        if (currentTask.title) {
          addLog(`📋 Saving previous task: "${currentTask.title}"`);
          parsedTasks.push(currentTask as TaskItem);
        }

        // Reset section tracking
        inRelatedFilesSection = false;

        // Start new task
        const statusIcon = line.match(/[✅🔄📝❌]/)?.[0];
        const status = getStatusFromIcon(statusIcon);

        // More careful title extraction to preserve emojis
        let title = line.replace(/^###\s*/, ""); // Remove ###

        const id = parsedTasks.length + 1;

        addLog(
          `🆕 New task parsed: id=${id}, title="${title}", status=${status}, icon=${statusIcon}`,
        );

        currentTask = {
          id,
          title,
          status,
          relatedFiles: [],
          checkpoints: [],
          description: "", // default value
        };
      }

      // Parse task attributes - support both English and Chinese
      if (line.includes("**Description**:") || line.includes("**描述**:")) {
        currentTask.description = line.split(":")[1]?.trim() || "";
        addLog(`📝 Task description: "${currentTask.description}"`);
      }

      // Parse related files
      if (
        line.includes("**Related Files**:") ||
        line.includes("**相关文件**:")
      ) {
        // This is the start of related files section, we'll parse the following lines
        inRelatedFilesSection = true;
        addLog(`📄 Found Related Files section`);
      }

      // Reset section tracking when we hit other sections
      if (
        line.includes("**Checkpoints**:") ||
        line.includes("**检查点**:") ||
        line.includes("#### Work Log") ||
        line.match(/^###\s/)
      ) {
        inRelatedFilesSection = false;
      }

      // Parse individual related file lines (format: "  - file/path description")
      // Only when we're in the related files section and it's not a checkbox or markdown formatting
      if (
        inRelatedFilesSection &&
        line.match(/^\s*-\s+\S+/) &&
        !line.includes("[x]") &&
        !line.includes("[ ]") &&
        !line.includes("**") &&
        currentTask.relatedFiles !== undefined
      ) {
        const fileMatch = line.match(/^\s*-\s+(\S+)\s*(.*)/);
        if (fileMatch) {
          const path = fileMatch[1];
          const summary = fileMatch[2] || "";
          if (currentTask.relatedFiles) {
            currentTask.relatedFiles.push({ path, summary });
            addLog(`📄 Related file: "${path}" - "${summary}"`);
          }
        }
      }

      // Parse checkpoints
      if (line.match(/^\s*- \[[x\s]\]/)) {
        const completed = line.includes("[x]");
        const name = line.replace(/^\s*- \[[x\s]\]\s*/, "");
        if (currentTask.checkpoints) {
          currentTask.checkpoints.push({ name, completed });
          addLog(`✓ Checkpoint: "${name}", completed=${completed}`);
        }
      }

      // Parse files from Work Log as backup if Related Files is empty
      if (
        line.includes("**Files Changed**:") &&
        currentTask.relatedFiles &&
        currentTask.relatedFiles.length === 0
      ) {
        const filesContent = line.split(":")[1]?.trim() || "";
        if (filesContent) {
          // Parse files from Work Log format, handle both comma-separated and individual files
          const files = filesContent
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
          const fileObjects = files.map((file) => ({
            path: file,
            summary: "Frome Work Log",
          }));
          currentTask.relatedFiles.push(...fileObjects);
          addLog(`📄 Work log files: ${JSON.stringify(files)}`);
        }
      }
    }

    // Add last task
    if (currentTask.title) {
      addLog(`📋 Saving last task: "${currentTask.title}"`);
      parsedTasks.push(currentTask as TaskItem);
    }

    addLog("✅ Parsing completed:");
    addLog(`  - Project info: ${JSON.stringify(parsedProjectInfo)}`);
    addLog(`  - Task count: ${parsedTasks.length}`);
    addLog(`  - Tasks: ${JSON.stringify(parsedTasks, null, 2)}`);

    setProjectInfo(parsedProjectInfo);
    setTasks(parsedTasks);
    setLastUpdated(new Date());
  };

  const getStatusFromIcon = (
    icon?: string,
  ): "completed" | "in-progress" | "pending" => {
    switch (icon) {
      case "✅":
        return "completed";
      case "🔄":
        return "in-progress";
      case "📝":
        return "pending";
      default:
        return "pending";
    }
  };

  const loadTaskFile = async () => {
    try {
      console.log("🚀 [TaskPanel] Starting to load task file...");
      setDebugInfo("Starting to load task file...");

      // Get workspace directories using correct API
      console.log("📂 [TaskPanel] Getting workspace directories...");
      const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();
      console.log("📂 [TaskPanel] Workspace directories:", workspaceDirs);
      setDebugInfo(`Workspace dirs: ${JSON.stringify(workspaceDirs)}`);

      if (workspaceDirs && workspaceDirs.length > 0) {
        // Try multiple possible paths
        const possiblePaths = [
          `${workspaceDirs[0]}/Plan/task.md`,
          `${workspaceDirs[0]}/plan/task.md`,
          `${workspaceDirs[0]}/PLAN/task.md`,
        ];

        console.log("🔍 [TaskPanel] Trying these paths:", possiblePaths);

        let fileFound = false;
        let lastError = "";

        for (const taskFilePath of possiblePaths) {
          try {
            console.log(`📖 [TaskPanel] Attempting to read: ${taskFilePath}`);
            setDebugInfo(`Attempting to read: ${taskFilePath}`);

            const content = await ideMessenger.ide.readFile(taskFilePath);
            console.log(`📖 [TaskPanel] Read result:`, {
              path: taskFilePath,
              hasContent: !!content,
              contentLength: content?.length || 0,
            });

            if (content) {
              console.log(
                `✅ [TaskPanel] Successfully read file: ${taskFilePath}`,
              );
              setDebugInfo(`Successfully read file: ${taskFilePath}`);
              parseTaskFile(content);
              fileFound = true;
              break;
            }
          } catch (error) {
            console.error(
              `❌ [TaskPanel] Failed to read: ${taskFilePath}`,
              error,
            );
            lastError = `${taskFilePath}: ${error}`;
            continue;
          }
        }

        if (!fileFound) {
          console.warn("❌ [TaskPanel] All paths failed:", lastError);
          setDebugInfo(`All paths failed: ${lastError}`);
          console.log(
            "Task file not found in any of the paths:",
            possiblePaths,
          );
          setProjectInfo(null);
          setTasks([]);
        }
      } else {
        console.warn("❌ [TaskPanel] No workspace directories found");
        setDebugInfo("No workspace directories found");
      }
    } catch (error) {
      const errorMsg = `Loading failed: ${error}`;
      console.error("❌ [TaskPanel] Failed to load task file:", error);
      setDebugInfo(errorMsg);
      setProjectInfo(null);
      setTasks([]);
    }
  };

  useEffect(() => {
    console.log(
      "🔄 [TaskPanel] useEffect triggered, starting to load task file",
    );
    loadTaskFile();

    // Set up file monitoring - check every 3 seconds
    const interval = setInterval(() => {
      console.log("⏰ [TaskPanel] Scheduled refresh of task file");
      loadTaskFile();
    }, 3000);

    return () => {
      console.log("🛑 [TaskPanel] Cleaning up timer");
      clearInterval(interval);
    };
  }, [ideMessenger]);

  return {
    projectInfo,
    tasks,
    lastUpdated,
    refreshTasks: loadTaskFile,
    debugInfo,
    parseDebugInfo,
  };
}
