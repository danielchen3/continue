// Flow data conversion and layout utilities
import { Edge, Node } from "reactflow";
import { AIAnalysisData, FileNode } from "../types";

// Helper function to normalize paths to absolute paths
const normalizeFilePath = (
  filePath: string,
  workspaceRoot?: string,
): string => {
  if (!filePath) return "";

  if (/^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith("/")) {
    return filePath;
  }

  let cleanPath = filePath.replace(/^\.[\\/]/, "");

  if (workspaceRoot) {
    const separator = workspaceRoot.includes("\\") ? "\\" : "/";
    const normalizedWorkspace = workspaceRoot.replace(/[\\/]+$/, "");
    const normalizedPath = cleanPath.replace(/^[\\/]+/, "");

    return `${normalizedWorkspace}${separator}${normalizedPath}`;
  }

  return cleanPath;
};

// Layout configurations for different node types
export const layouts = {
  frontend: { x: 100, y: 50, width: 800, height: 200 },
  backend: { x: 100, y: 300, width: 800, height: 200 },
  database: { x: 100, y: 550, width: 800, height: 150 },
  config: { x: 950, y: 50, width: 200, height: 600 },
};

// Convert file structure to ReactFlow format
export const convertToFlowData = (fileStructure: FileNode[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeId = 0;

  const categories = new Map<string, FileNode[]>();

  const processNode = (node: FileNode, parentId?: string) => {
    const currentId = (nodeId++).toString();

    if (node.type === "directory") {
      // Directory node
      nodes.push({
        id: currentId,
        type: "customFolder",
        position: { x: 0, y: 0 },
        data: {
          label: node.name,
          description: `${node.children?.length || 0} items`,
          category: node.category,
          path: node.path,
          type: "directory",
        },
      });

      // Process children
      node.children?.forEach((child) => {
        const childId = processNode(child, currentId);
        if (childId) {
          edges.push({
            id: `${currentId}-${childId}`,
            source: currentId,
            target: childId,
            type: "smoothstep",
            animated: false,
          });
        }
      });
    } else {
      // File node
      nodes.push({
        id: currentId,
        type: "customFile",
        position: { x: 0, y: 0 },
        data: {
          label: node.name,
          description: node.description,
          category: node.category,
          path: node.path,
          type: node.type,
        },
      });

      const category = node.category || "config";
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(node);
    }

    if (parentId) {
      edges.push({
        id: `${parentId}-${currentId}`,
        source: parentId,
        target: currentId,
        type: "smoothstep",
        animated: false,
      });
    }

    return currentId;
  };

  fileStructure.forEach((node) => processNode(node));
  layoutNodes(nodes, categories);

  return { nodes, edges };
};

// Layout nodes in circular/categorical arrangement
const layoutNodes = (nodes: Node[], categories: Map<string, FileNode[]>) => {
  const centerX = 400;
  const centerY = 300;
  const categoryRadius = 200;
  const itemRadius = 80;

  const categoryList = Array.from(categories.keys());
  const angleStep = (2 * Math.PI) / Math.max(categoryList.length, 1);

  categoryList.forEach((category, categoryIndex) => {
    const categoryAngle = categoryIndex * angleStep;
    const categoryCenterX = centerX + Math.cos(categoryAngle) * categoryRadius;
    const categoryCenterY = centerY + Math.sin(categoryAngle) * categoryRadius;

    const categoryNodes = nodes.filter(
      (node) => node.data.category === category,
    );
    const itemAngleStep = (2 * Math.PI) / Math.max(categoryNodes.length, 1);

    categoryNodes.forEach((node, itemIndex) => {
      const itemAngle = itemIndex * itemAngleStep;
      node.position = {
        x: categoryCenterX + Math.cos(itemAngle) * itemRadius,
        y: categoryCenterY + Math.sin(itemAngle) * itemRadius,
      };
    });
  });

  // Handle uncategorized nodes
  const uncategorizedNodes = nodes.filter(
    (node) => !categoryList.includes(node.data.category),
  );
  uncategorizedNodes.forEach((node, index) => {
    node.position = {
      x: centerX + (index % 5) * 120,
      y: centerY + Math.floor(index / 5) * 100,
    };
  });
};

// Convert AI analysis data to ReactFlow format
export const buildFlowFromAnalysis = (
  analysisData: AIAnalysisData,
  workspaceRoot?: string,
) => {
  const newNodes: Node[] = [];
  const newEdges: Edge[] = [];
  let nodeId = 0;

  // Add project overview node
  if (analysisData.project_name) {
    newNodes.push({
      id: (nodeId++).toString(),
      type: "customFolder",
      position: { x: 50, y: 20 },
      data: {
        label: analysisData.project_name,
        description: analysisData.description || "Project Overview",
        category: "project",
      },
    });
  }

  // Frontend components
  if (analysisData.structure?.frontend?.length > 0) {
    addLayerNodes(
      newNodes,
      nodeId,
      "Frontend Layer",
      analysisData.structure.frontend,
      layouts.frontend,
      "frontend",
      workspaceRoot,
    );
    nodeId += analysisData.structure.frontend.length + 1;
  }

  // Backend modules
  if (analysisData.structure?.backend?.length > 0) {
    addLayerNodes(
      newNodes,
      nodeId,
      "Backend Layer",
      analysisData.structure.backend,
      layouts.backend,
      "backend",
      workspaceRoot,
    );
    nodeId += analysisData.structure.backend.length + 1;
  }

  // Database models
  if (analysisData.structure?.database?.length > 0) {
    addLayerNodes(
      newNodes,
      nodeId,
      "Database Layer",
      analysisData.structure.database,
      layouts.database,
      "database",
      workspaceRoot,
    );
    nodeId += analysisData.structure.database.length + 1;
  }

  // Tech stack nodes
  if (analysisData.tech_stack) {
    nodeId = addTechStackNodes(newNodes, nodeId, analysisData.tech_stack);
  }

  // Add connections between layers
  addLayerConnections(newNodes, newEdges);

  return { nodes: newNodes, edges: newEdges };
};

// Helper function to add layer nodes
const addLayerNodes = (
  nodes: Node[],
  startNodeId: number,
  layerTitle: string,
  items: any[],
  layout: { x: number; y: number; width: number; height: number },
  category: string,
  workspaceRoot?: string,
) => {
  // Add layer title node
  nodes.push({
    id: startNodeId.toString(),
    type: "customFolder",
    position: { x: layout.x, y: layout.y },
    data: {
      label: layerTitle,
      description: `${items.length} components`,
      category,
      type: "directory", // Prevent clicking on layer nodes
    },
  });

  // Add component nodes
  items.forEach((item: any, index: number) => {
    const x = layout.x + 150 + (index % 4) * 180;
    const y = layout.y + 60 + Math.floor(index / 4) * 80;

    // Normalize the file path
    const normalizedPath = normalizeFilePath(item.file, workspaceRoot);

    // Debug info for path mapping
    console.log("AI View Path Mapping:", {
      original: item.file,
      workspaceRoot,
      normalized: normalizedPath,
    });

    nodes.push({
      id: (startNodeId + 1 + index).toString(),
      type: "customFile",
      position: { x, y },
      data: {
        label: item.file?.split("/").pop() || item.file || `Item ${index + 1}`,
        description: item.description,
        category,
        path: normalizedPath, // Use normalized path for file opening
        originalPath: item.file, // Keep original for debugging
        type: "file", // Add type for click handling
        routes: item.routes || [],
        fields: item.fields || [],
        dependencies: item.dependencies || [],
      },
    });
  });
};

// Helper function to add tech stack nodes
const addTechStackNodes = (
  nodes: Node[],
  startNodeId: number,
  techStack: any,
) => {
  let configIndex = 0;
  let nodeId = startNodeId;

  // Add tech stack nodes in config area
  const techCategories = [
    { key: "frontend", category: "frontend", label: "Frontend Tech" },
    { key: "backend", category: "backend", label: "Backend Tech" },
    { key: "other", category: "config", label: "Tool/Config" },
  ];

  techCategories.forEach(({ key, category, label }) => {
    if (techStack[key]?.length > 0) {
      techStack[key].forEach((tech: string) => {
        nodes.push({
          id: (nodeId++).toString(),
          type: "customFile",
          position: {
            x: layouts.config.x,
            y: layouts.config.y + configIndex * 50,
          },
          data: {
            label: tech,
            description: label,
            category,
            type: "tech", // Different type for tech stack items
          },
        });
        configIndex++;
      });
    }
  });

  return nodeId;
};

// Add connections between different layers
const addLayerConnections = (nodes: Node[], edges: Edge[]) => {
  const frontendNodes = nodes.filter(
    (n) => n.data.category === "frontend" && n.type === "customFile",
  );
  const backendNodes = nodes.filter(
    (n) => n.data.category === "backend" && n.type === "customFile",
  );
  const databaseNodes = nodes.filter(
    (n) => n.data.category === "database" && n.type === "customFile",
  );

  // Frontend to Backend connections
  frontendNodes.forEach((frontendNode, index) => {
    if (backendNodes[index % backendNodes.length]) {
      edges.push({
        id: `fe-be-${frontendNode.id}`,
        source: frontendNode.id,
        target: backendNodes[index % backendNodes.length].id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#10b981", strokeWidth: 2 },
        label: "API calls",
      });
    }
  });

  // Backend to Database connections
  backendNodes.forEach((backendNode, index) => {
    if (databaseNodes[index % databaseNodes.length]) {
      edges.push({
        id: `be-db-${backendNode.id}`,
        source: backendNode.id,
        target: databaseNodes[index % databaseNodes.length].id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
        label: "data access",
      });
    }
  });
};
