import { DocumentTextIcon, LinkIcon } from "@heroicons/react/24/outline";
import { useContext, useEffect, useState } from "react";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { ReactFlowVisualization } from "./ReactFlowVisualization";

export interface RequirementItem {
  id: string;
  title: string;
  description: string;
  date: string;
  alignedTasks: TaskItem[];
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  requirementId: string;
}

interface TaskAlignment {
  taskId: string;
  taskTitle: string;
  requirementIds: string[];
}

interface RequirementsTaskAlignmentProps {
  isCollapsed?: boolean;
}

export function RequirementsTaskAlignment({
  isCollapsed = false,
}: RequirementsTaskAlignmentProps) {
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [taskAlignments, setTaskAlignments] = useState<TaskAlignment[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [parseDebugInfo, setParseDebugInfo] = useState<string>("");

  const ideMessenger = useContext(IdeMessengerContext);

  const parseRePlanFile = (content: string) => {
    let debugLog = "";
    const addLog = (message: string) => {
      debugLog += message + "\n";
      setParseDebugInfo(debugLog);
    };

    addLog(
      `🔍 Starting to parse re-plan.md content, length: ${content.length}`,
    );
    addLog(`📄 Content preview: ${content.substring(0, 200)}...`);

    const lines = content.split("\n");
    const parsedRequirements: RequirementItem[] = [];
    const parsedAlignments: TaskAlignment[] = [];

    let currentRequirement: Partial<RequirementItem> = {};
    let currentLevel = 0; // 0: none, 2: ##, 3: ###

    addLog(`📄 Total lines in file: ${lines.length}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 每100行打印一次进度
      if (i % 50 === 0) {
        addLog(
          `📍 Processing line ${i}/${lines.length}: "${trimmedLine.substring(0, 50)}..."`,
        );
      }

      // 跳过空行和注释
      if (
        !trimmedLine ||
        trimmedLine.startsWith("<!--") ||
        trimmedLine.startsWith("---")
      ) {
        continue;
      }

      // 跳过Mermaid代码块
      if (
        trimmedLine.startsWith("```mermaid") ||
        trimmedLine.startsWith("````mermaid")
      ) {
        // 找到对应的结束标记并跳过整个块
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith("```") || nextLine.startsWith("````")) {
            i = j; // 跳过到结束标记
            break;
          }
          j++;
        }
        continue;
      }

      // 解析需求项目 - R1, R2, R3等
      if (trimmedLine.match(/^## R\d+\./)) {
        addLog(`🔍 Found main requirement line: "${trimmedLine}"`);

        // 保存前一个需求
        if (currentRequirement.id) {
          parsedRequirements.push(currentRequirement as RequirementItem);
          addLog(`📋 Saved previous requirement: ${currentRequirement.title}`);
        }

        // 开始新需求
        const reqIdMatch = trimmedLine.match(/R(\d+)/);
        const reqId = reqIdMatch
          ? reqIdMatch[1]
          : (parsedRequirements.length + 1).toString();
        const title = trimmedLine.replace(/^##\s*R\d+\.\s*/, "").trim();

        currentRequirement = {
          id: `R${reqId}`,
          title,
          date: new Date().toISOString().split("T")[0], // 默认今天
          description: "",
          alignedTasks: [],
        };

        currentLevel = 2;
        addLog(`🆕 New main requirement: R${reqId} - ${title}`);
      }

      // 解析子需求 - R1.1, R1.2等
      else if (trimmedLine.match(/^### R\d+\.\d+/)) {
        const subReqMatch = trimmedLine.match(/R(\d+)\.(\d+)/);
        if (subReqMatch) {
          const mainReqId = subReqMatch[1];
          const subReqId = subReqMatch[2];
          const subTitle = trimmedLine
            .replace(/^###\s*R\d+\.\d+\s*/, "")
            .trim();

          // 创建子需求
          const subRequirement: RequirementItem = {
            id: `R${mainReqId}.${subReqId}`,
            title: subTitle,
            date: new Date().toISOString().split("T")[0],
            description: "",
            alignedTasks: [],
          };

          parsedRequirements.push(subRequirement);
          addLog(
            `� Added sub-requirement: R${mainReqId}.${subReqId} - ${subTitle}`,
          );
        }
        currentLevel = 3;
      }

      // 解析任务 - T1.1.1等
      else if (trimmedLine.match(/^- T\d+\.\d+\.\d+/)) {
        const taskMatch = trimmedLine.match(/- T(\d+)\.(\d+)\.(\d+)\s+(.+)/);
        if (taskMatch) {
          const reqId = taskMatch[1];
          const subReqId = taskMatch[2];
          const taskId = taskMatch[3];
          const taskTitle = taskMatch[4];

          const task: TaskItem = {
            id: `T${reqId}.${subReqId}.${taskId}`,
            title: taskTitle,
            description: "",
            requirementId: `R${reqId}.${subReqId}`,
          };

          // 找到对应的需求并添加任务
          const requirement = parsedRequirements.find(
            (r) => r.id === `R${reqId}.${subReqId}`,
          );
          if (requirement) {
            requirement.alignedTasks.push(task);
            addLog(
              `� Added task: ${task.id} - ${taskTitle} to ${requirement.id}`,
            );
          }
        }
      }
    }

    // 保存最后一个需求
    if (currentRequirement.id && currentLevel === 2) {
      parsedRequirements.push(currentRequirement as RequirementItem);
      addLog(`📋 Saved final requirement: ${currentRequirement.title}`);
    }

    // 生成任务对齐关系
    parsedRequirements.forEach((req) => {
      req.alignedTasks.forEach((task) => {
        const alignment: TaskAlignment = {
          taskId: task.id,
          taskTitle: task.title,
          requirementIds: [req.id],
        };
        parsedAlignments.push(alignment);
      });
    });

    addLog("✅ Parsing completed:");
    addLog(`  - Requirements count: ${parsedRequirements.length}`);
    addLog(`  - Alignments count: ${parsedAlignments.length}`);

    // 详细列出所有需求
    parsedRequirements.forEach((req, index) => {
      addLog(
        `    ${index + 1}. ${req.id}: "${req.title}" (tasks: ${req.alignedTasks?.length || 0})`,
      );
      req.alignedTasks?.forEach((task, taskIndex) => {
        addLog(`       - ${task.id}: "${task.title}"`);
      });
    });

    setRequirements(parsedRequirements);
    setTaskAlignments(parsedAlignments);
    setLastUpdated(new Date());
  };

  const loadRePlanFile = async () => {
    try {
      console.log(
        "🚀 [RequirementsTaskAlignment] Starting to load re-plan file...",
      );
      setDebugInfo("Starting to load re-plan file...");

      const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();
      console.log(
        "📂 [RequirementsTaskAlignment] Workspace directories:",
        workspaceDirs,
      );

      if (workspaceDirs && workspaceDirs.length > 0) {
        const possiblePaths = [
          `${workspaceDirs[0]}/Plan/re-plan.md`,
          `${workspaceDirs[0]}/plan/re-plan.md`,
          `${workspaceDirs[0]}/PLAN/re-plan.md`,
          `${workspaceDirs[0]}/Plan/re-plan-simple.md`,
          `${workspaceDirs[0]}/plan/re-plan-simple.md`,
          `${workspaceDirs[0]}/PLAN/re-plan-simple.md`,
        ];

        console.log(
          "🔍 [RequirementsTaskAlignment] Trying these paths:",
          possiblePaths,
        );

        let fileFound = false;
        let lastError = "";

        for (const filePath of possiblePaths) {
          try {
            console.log(
              `📖 [RequirementsTaskAlignment] Attempting to read: ${filePath}`,
            );
            setDebugInfo(`Attempting to read: ${filePath}`);

            const content = await ideMessenger.ide.readFile(filePath);

            if (content) {
              console.log(
                `✅ [RequirementsTaskAlignment] Successfully read file: ${filePath}`,
              );
              setDebugInfo(`Successfully read file: ${filePath}`);
              parseRePlanFile(content);
              fileFound = true;
              break;
            }
          } catch (error) {
            console.error(
              `❌ [RequirementsTaskAlignment] Failed to read: ${filePath}`,
              error,
            );
            lastError = `${filePath}: ${error}`;
            continue;
          }
        }

        if (!fileFound) {
          console.warn(
            "❌ [RequirementsTaskAlignment] All paths failed:",
            lastError,
          );
          setDebugInfo(`All paths failed: ${lastError}`);
          setRequirements([]);
          setTaskAlignments([]);
        }
      } else {
        console.warn(
          "❌ [RequirementsTaskAlignment] No workspace directories found",
        );
        setDebugInfo("No workspace directories found");
      }
    } catch (error) {
      const errorMsg = `Loading failed: ${error}`;
      console.error(
        "❌ [RequirementsTaskAlignment] Failed to load re-plan file:",
        error,
      );
      setDebugInfo(errorMsg);
      setRequirements([]);
      setTaskAlignments([]);
    }
  };

  useEffect(() => {
    console.log(
      "🔄 [RequirementsTaskAlignment] useEffect triggered, starting to load re-plan file",
    );
    loadRePlanFile();

    // 监控文件变化 - 每5秒检查一次
    const interval = setInterval(() => {
      console.log(
        "⏰ [RequirementsTaskAlignment] Scheduled refresh of re-plan file",
      );
      loadRePlanFile();
    }, 5000);

    return () => {
      console.log("🛑 [RequirementsTaskAlignment] Cleaning up timer");
      clearInterval(interval);
    };
  }, [ideMessenger]);

  // 渲染空状态
  if (requirements.length === 0 && taskAlignments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <DocumentTextIcon className="text-vsc-descriptionForeground mb-4 h-12 w-12" />
        <h3 className="text-vsc-foreground mb-2 text-lg font-medium">
          No Requirements-Task Alignment Data
        </h3>
        <p className="text-vsc-descriptionForeground mb-4 max-w-sm text-sm">
          Create a re-plan.md file in the Plan/ folder to visualize requirement
          and task relationships
        </p>
        <div className="text-vsc-descriptionForeground bg-vsc-input-background rounded-md p-3 text-xs">
          <div className="mb-1 font-medium">Supported file names:</div>
          <div>• re-plan.md</div>
          <div>• re-plan-simple.md</div>
          <div className="mt-2 font-medium">Parsing status:</div>
          <div>📋 Requirements: {requirements.length}</div>
          <div>
            📝 Tasks:{" "}
            {requirements.reduce(
              (sum, req) => sum + (req.alignedTasks?.length || 0),
              0,
            )}
          </div>
          <div>🎨 Visualization: React Flow</div>
        </div>
        {debugInfo && (
          <details className="mt-4 text-xs">
            <summary className="text-vsc-descriptionForeground cursor-pointer">
              Debug Information
            </summary>
            <pre className="bg-vsc-input-background mt-2 max-w-md overflow-auto rounded border p-2 text-left">
              {debugInfo}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header - Fixed */}
      <div className="border-vsc-input-border flex-shrink-0 border-b p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-vsc-foreground flex items-center text-lg font-semibold">
            <LinkIcon className="mr-2 h-5 w-5" />
            Requirements-Task Alignment
          </h3>
          <button
            onClick={loadRePlanFile}
            className="text-vsc-descriptionForeground hover:text-vsc-foreground text-xs transition-colors"
            title="Refresh alignment data"
          >
            🔄 Refresh
          </button>
        </div>
        {lastUpdated && (
          <p className="text-vsc-descriptionForeground text-xs">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* React Flow Visualization - Full Screen */}
      <div className="flex-1 overflow-hidden">
        {requirements.length > 0 ? (
          <ReactFlowVisualization
            requirements={requirements}
            className="h-full"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <DocumentTextIcon className="text-vsc-descriptionForeground mb-4 h-12 w-12" />
            <h3 className="text-vsc-foreground mb-2 text-lg font-medium">
              No Requirements-Task Data
            </h3>
            <p className="text-vsc-descriptionForeground mb-4 max-w-sm text-sm">
              Create a re-plan.md file in the Plan/ folder to visualize
              requirement and task relationships
            </p>
            <div className="text-vsc-descriptionForeground bg-vsc-input-background rounded-md p-3 text-xs">
              <div className="mb-1 font-medium">Supported file names:</div>
              <div>• re-plan.md</div>
              <div>• re-plan-simple.md</div>
              <div className="mt-2 font-medium">Parsing status:</div>
              <div>📋 Requirements: {requirements.length}</div>
              <div>
                📝 Tasks:{" "}
                {requirements.reduce(
                  (sum, req) => sum + (req.alignedTasks?.length || 0),
                  0,
                )}
              </div>
              <div>
                🎨 Visualization:{" "}
                {requirements.length > 0 ? "✅ React Flow" : "❌"}
              </div>
            </div>
            {debugInfo && (
              <details className="mt-4 text-xs">
                <summary className="text-vsc-descriptionForeground cursor-pointer">
                  Debug Information
                </summary>
                <pre className="bg-vsc-input-background mt-2 max-w-md overflow-auto rounded border p-2 text-left">
                  {debugInfo}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Fixed Footer - Statistics */}
      {(requirements.length > 0 || taskAlignments.length > 0) && (
        <div className="border-vsc-input-border bg-vsc-input-background flex-shrink-0 border-t p-4">
          <div className="text-vsc-descriptionForeground flex items-center justify-between text-xs">
            <span>📋 Requirements: {requirements.length}</span>
            <span>
              📝 Tasks:{" "}
              {requirements.reduce(
                (sum, req) => sum + (req.alignedTasks?.length || 0),
                0,
              )}
            </span>
            <span>
              🎨 Visualization:{" "}
              {requirements.length > 0 ? "✅ React Flow" : "❌"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
