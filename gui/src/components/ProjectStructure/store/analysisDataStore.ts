// Persistent storage for AI analysis data across component unmounts
import { AIAnalysisData } from "../types";

// Global storage for analysis results
class AnalysisDataStore {
  private static instance: AnalysisDataStore;
  private data: Map<string, AIAnalysisData> = new Map();
  private rawResults: Map<string, string> = new Map();

  static getInstance(): AnalysisDataStore {
    if (!AnalysisDataStore.instance) {
      AnalysisDataStore.instance = new AnalysisDataStore();
    }
    return AnalysisDataStore.instance;
  }

  // Generate a key based on workspace path
  private getWorkspaceKey(): string {
    return "current_workspace";
  }

  // Store analysis data
  setAnalysisData(data: AIAnalysisData, rawResult?: string): void {
    const key = this.getWorkspaceKey();
    this.data.set(key, data);
    if (rawResult) {
      this.rawResults.set(key, rawResult);
    }

    try {
      localStorage.setItem(`ai_analysis_${key}`, JSON.stringify(data));
      if (rawResult) {
        localStorage.setItem(`ai_analysis_raw_${key}`, rawResult);
      }
    } catch (error) {
      console.warn("Failed to save analysis data to localStorage:", error);
    }
  }

  // Get analysis data
  getAnalysisData(): { data: AIAnalysisData | null; rawResult: string | null } {
    const key = this.getWorkspaceKey();
    let data = this.data.get(key) || null;
    let rawResult = this.rawResults.get(key) || null;

    // If not in memory, try to load from localStorage
    if (!data) {
      try {
        const stored = localStorage.getItem(`ai_analysis_${key}`);
        const storedRaw = localStorage.getItem(`ai_analysis_raw_${key}`);

        if (stored) {
          data = JSON.parse(stored);
          if (data) {
            this.data.set(key, data);
          }
        }

        if (storedRaw) {
          rawResult = storedRaw;
          this.rawResults.set(key, rawResult);
        }
      } catch (error) {
        console.warn("Failed to load analysis data from localStorage:", error);
      }
    }

    return { data, rawResult };
  }

  // Clear analysis data
  clearAnalysisData(): void {
    const key = this.getWorkspaceKey();
    this.data.delete(key);
    this.rawResults.delete(key);

    try {
      localStorage.removeItem(`ai_analysis_${key}`);
      localStorage.removeItem(`ai_analysis_raw_${key}`);
    } catch (error) {
      console.warn("Failed to clear analysis data from localStorage:", error);
    }
  }

  // Check if analysis data exists
  hasAnalysisData(): boolean {
    const { data } = this.getAnalysisData();
    return data !== null;
  }

  // Get data age (for cache invalidation)
  getDataAge(): number {
    const key = this.getWorkspaceKey();
    try {
      const timestamp = localStorage.getItem(`ai_analysis_timestamp_${key}`);
      if (timestamp) {
        return Date.now() - parseInt(timestamp);
      }
    } catch (error) {
      console.warn("Failed to get data age:", error);
    }
    return Infinity;
  }

  // Update timestamp
  private updateTimestamp(): void {
    const key = this.getWorkspaceKey();
    try {
      localStorage.setItem(
        `ai_analysis_timestamp_${key}`,
        Date.now().toString(),
      );
    } catch (error) {
      console.warn("Failed to update timestamp:", error);
    }
  }

  // Enhanced setAnalysisData with timestamp
  setAnalysisDataWithTimestamp(data: AIAnalysisData, rawResult?: string): void {
    this.setAnalysisData(data, rawResult);
    this.updateTimestamp();
  }
}

export const analysisDataStore = AnalysisDataStore.getInstance();
