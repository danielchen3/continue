// Hook for handling file structure loading and processing
import { useContext, useState } from "react";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { FileNode } from "../types";
import { categorizeFile, getFileDescription } from "../utils";

export const useFileStructure = () => {
  const [isLoading, setIsLoading] = useState(false);
  const ideMessenger = useContext(IdeMessengerContext);

  // Load file structure from workspace
  const loadFileStructure = async (basePath: string): Promise<FileNode[]> => {
    const entries = await ideMessenger!.ide.listDir(basePath);
    const nodes: FileNode[] = [];

    const ignoredDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "__pycache__",
    ]);

    for (const [name, type] of entries) {
      if (ignoredDirs.has(name) || name.startsWith(".")) continue;

      const fullPath = `${basePath}/${name}`;
      const isDirectory = type === 2;

      let content = "";
      if (!isDirectory) {
        try {
          content = await ideMessenger!.ide.readFile(fullPath);
        } catch (e) {
          // Ignore read errors for binary files, etc.
        }
      }

      const node: FileNode = {
        name,
        path: fullPath,
        type: isDirectory ? "directory" : "file",
        level: 0,
        category: categorizeFile(fullPath, content),
        description: isDirectory
          ? undefined
          : getFileDescription(fullPath, name, content),
      };

      // Load first level children for directories
      if (isDirectory) {
        try {
          const subEntries = await ideMessenger!.ide.listDir(fullPath);
          node.children = subEntries
            .filter(
              ([subName]) =>
                !ignoredDirs.has(subName) && !subName.startsWith("."),
            )
            .map(([subName, subType]) => ({
              name: subName,
              path: `${fullPath}/${subName}`,
              type: subType === 2 ? "directory" : "file",
              level: 1,
              category: categorizeFile(`${fullPath}/${subName}`),
              description:
                subType === 2
                  ? undefined
                  : getFileDescription(`${fullPath}/${subName}`, subName),
            }));
        } catch (e) {
          node.children = [];
        }
      }

      nodes.push(node);
    }

    return nodes;
  };

  // Build file structure data
  const buildFileStructure = async () => {
    if (!ideMessenger) return [];

    setIsLoading(true);
    try {
      const workspaceDirs = await ideMessenger.ide.getWorkspaceDirs();
      if (workspaceDirs.length === 0) return [];

      return await loadFileStructure(workspaceDirs[0]);
    } catch (error) {
      console.error("Error building file structure:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    buildFileStructure,
    loadFileStructure,
  };
};
