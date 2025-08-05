// Hook for handling AI project analysis functionality
import { useContext, useEffect, useState } from "react";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { FULL_STACK_ANALYSIS_PROMPT } from "../analysisPrompt";
import { analysisDataStore } from "../store/analysisDataStore";
import { AIAnalysisData } from "../types";

export const useAIAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [analysisData, setAnalysisData] = useState<AIAnalysisData | null>(null);
  const ideMessenger = useContext(IdeMessengerContext);

  // Load persisted data on component mount
  useEffect(() => {
    const { data, rawResult } = analysisDataStore.getAnalysisData();
    if (data) {
      setAnalysisData(data);
      if (rawResult) {
        setAnalysisResult(rawResult);
      }
    }
  }, []);

  // Parse JSON from analysis result
  const parseAnalysisResult = (result: string): AIAnalysisData | null => {
    try {
      const jsonMatch =
        result.match(/```json\n([\s\S]*?)\n```/) || result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch (error) {
      console.error("Failed to parse analysis result:", error);
    }
    return null;
  };

  // Main AI analysis function
  const analyzeFullStackProject = async () => {
    if (!ideMessenger) return;

    setIsAnalyzing(true);
    try {
      // Get codebase context using Continue's native approach
      const codebaseContext = await ideMessenger.request(
        "context/getContextItems",
        {
          name: "codebase",
          query: "",
          fullInput: FULL_STACK_ANALYSIS_PROMPT,
          selectedCode: [],
          isInAgentMode: false,
        },
      );

      if (
        codebaseContext.status !== "success" ||
        codebaseContext.content.length === 0
      ) {
        setAnalysisResult(
          "Unable to get codebase content, please ensure project is properly indexed.",
        );
        return;
      }

      // Build messages with context
      const messages = [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: FULL_STACK_ANALYSIS_PROMPT,
            },
            ...codebaseContext.content.map((item) => ({
              type: "text" as const,
              text: `\`\`\`${item.name}\n${item.content}\n\`\`\``,
            })),
          ],
        },
      ];

      // Stream LLM response
      let fullResponse = "";
      const gen = ideMessenger.llmStreamChat(
        {
          completionOptions: {
            maxTokens: 3000,
            temperature: 0.1,
          },
          title: "Full Stack Project Architecture Analysis",
          messages,
        },
        new AbortController().signal,
      );

      let next = await gen.next();
      while (!next.done) {
        if (Array.isArray(next.value)) {
          for (const message of next.value) {
            if (message.role === "assistant" && message.content) {
              if (typeof message.content === "string") {
                fullResponse += message.content;
              } else if (Array.isArray(message.content)) {
                for (const part of message.content) {
                  if (part.type === "text") {
                    fullResponse += part.text;
                  }
                }
              }
            }
          }
        }
        next = await gen.next();
      }

      if (fullResponse.trim()) {
        const trimmedResult = fullResponse.trim();
        setAnalysisResult(trimmedResult);

        const parsedData = parseAnalysisResult(trimmedResult);
        if (parsedData) {
          setAnalysisData(parsedData);
          // Persist the data
          analysisDataStore.setAnalysisDataWithTimestamp(
            parsedData,
            trimmedResult,
          );
        }
      } else {
        setAnalysisResult("Unable to get analysis result, please try again.");
      }
    } catch (error) {
      console.error("Error analyzing project:", error);
      setAnalysisResult(
        `Error occurred during analysis: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear analysis data
  const clearAnalysis = () => {
    setAnalysisData(null);
    setAnalysisResult("");
    analysisDataStore.clearAnalysisData();
  };

  // Check if cached data is still valid (within 24 hours)
  const isCacheValid = () => {
    const age = analysisDataStore.getDataAge();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    return age < TWENTY_FOUR_HOURS;
  };

  // Force refresh analysis
  const refreshAnalysis = async () => {
    clearAnalysis();
    await analyzeFullStackProject();
  };

  return {
    isAnalyzing,
    analysisResult,
    analysisData,
    analyzeFullStackProject,
    clearAnalysis,
    refreshAnalysis,
    isCacheValid,
    setAnalysisResult,
  };
};
