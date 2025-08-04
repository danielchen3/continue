// Flow-specific utility functions
export const getCategoryColor = (category: string) => {
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

// Layout configuration for Flow components
export const layouts = {
  frontend: { x: 100, y: 80, width: 1000, height: 180 },
  backend: { x: 100, y: 320, width: 1000, height: 180 },
  database: { x: 100, y: 560, width: 1000, height: 120 },
  config: { x: 1150, y: 80, width: 250, height: 600 },
};

export const getFileDescription = (
  filePath: string,
  filename: string,
  content?: string,
): string => {
  // Check AI description cache first
  if (descriptionCache.has(filePath)) {
    return descriptionCache.get(filePath)!;
  }
  // Otherwise return static description
  return generateStaticDescription(filename);
};

import { descriptionCache, generateStaticDescription } from "./utils";
