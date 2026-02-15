import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type AiService from "./AiService";
import { motherTongueResponseSchema, type MothertongueResponse } from './MothertongueResponse';
import { AiResponseFormatter } from "./utils/AiResponseFormatter";
import z from "zod";
import { MothertongueLogger } from '../log/MothertongueLogger';
import type { GeminiOptions } from "./GeminiOptions";

export class GeminiService implements AiService {
    private client: GoogleGenAI;
    private logger: MothertongueLogger;
    private options: GeminiOptions;

    public constructor(private apiKey: string, logger: MothertongueLogger, options?: GeminiOptions) {
        this.logger = logger;
        this.options = options || { thinkingLevel: ThinkingLevel.LOW, model: "gemini-3-flash-preview" };

        this.client = new GoogleGenAI({
            apiKey: this.apiKey
        });

        if(!this.options.model) {
            this.options.model = "gemini-3-flash-preview";
        }

        if(!this.options.thinkingLevel) {
            this.options.thinkingLevel = ThinkingLevel.LOW;
        }
    }

    async generateMothertongueResponse(prompt: string, abortSignal: AbortSignal): Promise<MothertongueResponse> {
        const response = await this.generateResponse<string>(prompt, abortSignal);

        if (!response) {
            throw new Error("No response from Gemini API");
        }

        return AiResponseFormatter.tryParseJson(response) as MothertongueResponse;
    }

    async generateResponse<T>(prompt: string, abortSignal: AbortSignal): Promise<T> {
        this.logger.debug(`Sending prompt to Gemini API with thinking level ${this.options.thinkingLevel}... using model ${this.options.model}.`);
        this.logger.debug(`Prompt: ${prompt}`);

        const stream = await this.client.models.generateContentStream({
            model: this.options.model || "gemini-3-flash-preview",
            contents: prompt,
            config: {
                candidateCount: 1,
                temperature: 0.2,
                responseMimeType: "application/json",
                responseJsonSchema: z.toJSONSchema(motherTongueResponseSchema),
                thinkingConfig: {
                    thinkingLevel: this.options.thinkingLevel
                },
                tools: [
                    { googleSearch: {}}
                ],
                abortSignal: abortSignal
            },
        });

        let response: string | null = "";
        let totalBytes = 0;

        for await (const part of stream) {
            if (abortSignal.aborted) {
                throw new Error("AbortError");
            }

            if (part.candidates && part.candidates.length > 0) {
                const text = part.candidates[0]?.content?.parts?.[0]?.text;
                if (text) {
                    totalBytes += text.length;
                    this.logger.logClear(`Received ${totalBytes} bytes from Gemini API...`);
                    response += text;
                }
            }
        }

        return response as unknown as T;
    }

}