import {
  CircleStackIcon,
  CodeBracketIcon,
  CogIcon,
  DocumentTextIcon,
  FolderIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";
import React from "react";

import { CategoryInfo, FileCategory } from "./types";

// Get category icon component
export const getCategoryIcon = (category: FileCategory): React.ReactNode => {
  switch (category) {
    case "frontend":
      return <CodeBracketIcon className="h-4 w-4" />;
    case "backend":
      return <CogIcon className="h-4 w-4" />;
    case "database":
      return <CircleStackIcon className="h-4 w-4" />;
    case "config":
      return <CogIcon className="h-4 w-4" />;
    case "docs":
      return <DocumentTextIcon className="h-4 w-4" />;
    case "assets":
      return <SwatchIcon className="h-4 w-4" />;
    default:
      return <FolderIcon className="h-4 w-4" />;
  }
};

// Category rendering component
export const CategoryBadge: React.FC<{ category: FileCategory }> = ({
  category,
}) => {
  const { name, lightColor } = getCategoryInfo(category);
  const icon = getCategoryIcon(category);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${lightColor}`}
    >
      {icon}
      <span className="ml-1">{name}</span>
    </span>
  );
};

// Get category color for styling
const getCategoryInfo = (category: FileCategory): CategoryInfo => {
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
