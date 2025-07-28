import { ArrowRightIcon } from "@heroicons/react/24/outline";

interface FlowChartNode {
  id: string;
  text: string;
}

interface FlowChartEdge {
  source: string;
  target: string;
  label?: string;
}

interface FlowChartProps {
  nodes: FlowChartNode[];
  edges: FlowChartEdge[];
}

// regx 检测
export function detectFlowChartContent(content: string): boolean {
  // 检测是否有多个编号/列表项，以及箭头或步骤指示
  const hasNumberedItems = /(\d+\.\s+.+\n){2,}/i.test(content);
  const hasArrows = /(->\s*|→\s*|steps?:)/i.test(content);

  return hasNumberedItems || hasArrows;
}

// 简单的解析方法从文本中提取节点和边
export function parseFlowChartContent(content: string): FlowChartProps {
  // 这里只是一个简化的实现，实际上您可能需要更复杂的解析
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  const nodes: FlowChartNode[] = [];
  const edges: FlowChartEdge[] = [];

  // 匹配编号列表项：如 "1. 第一步"
  const numberedItemRegex = /^(\d+)\.\s+(.+)$/;

  lines.forEach((line, index) => {
    const match = line.match(numberedItemRegex);

    if (match) {
      const id = match[1];
      const text = match[2];

      nodes.push({
        id,
        text,
      });

      // 如果不是第一个节点，添加一条从前一个节点到当前节点的边
      if (index > 0 && nodes.length > 1) {
        const prevNode = nodes[nodes.length - 2];
        edges.push({
          source: prevNode.id,
          target: id,
        });
      }
    }
  });

  return { nodes, edges };
}

export function FlowChartRenderer({ nodes, edges }: FlowChartProps) {
  return (
    <div className="my-4 rounded-md bg-slate-50 p-4 shadow-sm dark:bg-slate-800">
      <h3 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
        Flow Chart
      </h3>
      <div className="flex flex-col space-y-4">
        {nodes.map((node, index) => (
          <div key={node.id} className="flow-chart-node">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {node.id}
              </div>
              <div className="ml-3 flex-1 rounded-md bg-white p-2 shadow-sm dark:bg-slate-700">
                {node.text}
              </div>
            </div>

            {index < nodes.length - 1 && (
              <div className="my-2 ml-4 flex justify-center">
                <ArrowRightIcon className="h-5 w-5 rotate-90 transform text-slate-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
