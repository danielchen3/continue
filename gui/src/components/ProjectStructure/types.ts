// Common types for Project Structure components

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  description?: string;
  isExpanded?: boolean;
  level: number;
  category?: FileCategory;
  size?: number;
}

export type FileCategory =
  | "frontend"
  | "backend"
  | "database"
  | "config"
  | "docs"
  | "assets";

export interface CategoryInfo {
  name: string;
  color: string;
  lightColor: string;
}

export interface ProjectStructureProps {
  isCollapsed: boolean;
}

// AI Analysis types
export interface AIAnalysisData {
  project_name: string;
  description: string;
  tech_stack: {
    frontend: string[];
    backend: string[];
    other: string[];
  };
  structure: {
    frontend: ComponentInfo[];
    backend: ComponentInfo[];
    database: ModelInfo[];
  };
  connections: ConnectionInfo[];
  recommendations: string[];
}

export interface ComponentInfo {
  file: string;
  description: string;
  dependencies?: string[];
  methods?: MethodInfo[];
  routes?: RouteInfo[];
  connects_to?: string[];
  database_models?: string[];
}

export interface ModelInfo {
  model: string;
  fields: string[];
  description: string;
  file: string;
  used_by: string[];
}

export interface MethodInfo {
  name: string;
  line: number;
  description: string;
}

export interface RouteInfo {
  method: string;
  path: string;
  description: string;
  line: number;
}

export interface ConnectionInfo {
  from: string;
  to: string;
  type: "api_call" | "import" | "data_flow" | "route";
  description: string;
  method?: string;
}
