import { CategoryInfo, FileCategory, FileNode } from "./types";

export const descriptionCache = new Map<string, string>();

// File categorization
export const categorizeFile = (
  path: string,
  content?: string,
): FileCategory => {
  const filename = path.split("/").pop() || "";
  const ext = filename.split(".").pop()?.toLowerCase();

  if (
    path.includes("/frontend/") ||
    path.includes("/client/") ||
    path.includes("/gui/")
  ) {
    return "frontend";
  }
  if (
    path.includes("/backend/") ||
    path.includes("/server/") ||
    path.includes("/core/")
  ) {
    return "backend";
  }
  if (path.includes("/database/") || path.includes("/db/")) {
    return "database";
  }
  if (path.includes("/docs/")) {
    return "docs";
  }
  if (path.includes("/assets/") || path.includes("/public/")) {
    return "assets";
  }

  // Extension-based categorization
  switch (ext) {
    case "tsx":
    case "jsx":
    case "vue":
    case "html":
    case "css":
    case "scss":
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
    case "md":
    case "txt":
    case "rst":
      return "docs";
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "ico":
      return "assets";
    default:
      return "config";
  }
};

export const getCategoryInfo = (category: FileCategory): CategoryInfo => {
  switch (category) {
    case "frontend":
      return {
        name: "Frontend",
        color: "bg-green-500",
        lightColor: "bg-green-100 text-green-800",
      };
    case "backend":
      return {
        name: "Backend",
        color: "bg-purple-500",
        lightColor: "bg-purple-100 text-purple-800",
      };
    case "database":
      return {
        name: "Database",
        color: "bg-orange-500",
        lightColor: "bg-orange-100 text-orange-800",
      };
    case "config":
      return {
        name: "Config",
        color: "bg-gray-500",
        lightColor: "bg-gray-100 text-gray-800",
      };
    case "docs":
      return {
        name: "Docs",
        color: "bg-yellow-500",
        lightColor: "bg-yellow-100 text-yellow-800",
      };
    case "assets":
      return {
        name: "Assets",
        color: "bg-pink-500",
        lightColor: "bg-pink-100 text-pink-800",
      };
    default:
      return {
        name: "Other",
        color: "bg-gray-400",
        lightColor: "bg-gray-100 text-gray-800",
      };
  }
};

// Generate static file description
export const generateStaticDescription = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (filename === "package.json") return "NPM package config";
  if (filename === "README.md") return "Project documentation";
  if (filename === "tsconfig.json") return "TypeScript config";
  if (filename.includes("docker")) return "Docker config";
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
      return "JSON config";
    case "md":
      return "Markdown documentation";
    case "yml":
    case "yaml":
      return "YAML config";
    default:
      return ext?.toUpperCase() || "File";
  }
};

export const getAllFiles = (nodes: FileNode[]): FileNode[] => {
  const files: FileNode[] = [];

  const traverse = (nodeList: FileNode[]) => {
    nodeList.forEach((node) => {
      if (node.type === "file") {
        files.push(node);
      }
      if (node.children) {
        traverse(node.children);
      }
    });
  };

  traverse(nodes);
  return files;
};

export const getFilesByCategory = (fileTree: FileNode[]) => {
  const allFiles = getAllFiles(fileTree);
  const categories: { [key: string]: FileNode[] } = {};

  allFiles.forEach((file) => {
    const category = file.category || "config";
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(file);
  });

  return categories;
};

export const updateNodeDescription = (
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
        children: updateNodeDescription(node.children, targetPath, description),
      };
    }
    return node;
  });
};

// Ignored directories for file scanning
export const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
]);

// Category list
export const CATEGORIES: FileCategory[] = [
  "frontend",
  "backend",
  "database",
  "config",
  "docs",
  "assets",
];
