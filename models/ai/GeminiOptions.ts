import type { ThinkingLevel } from "@google/genai";

export interface GeminiOptions {
    thinkingLevel?: ThinkingLevel;
    model?: string;
}