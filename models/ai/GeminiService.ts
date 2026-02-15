import { GenerateContentResponse, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type AiService from "./AiService";
import { motherTongueResponseSchema, type MothertongueResponse } from './MothertongueResponse';
import { AiResponseFormatter } from "./utils/AiResponseFormatter";
import zodToJsonSchema from "zod-to-json-schema";
import z from "zod";
import { MothertongueLogger } from '../log/MothertongueLogger';

export class GeminiService implements AiService {
    private client: GoogleGenAI;
    private logger: MothertongueLogger;

    public constructor(private apiKey: string, logger: MothertongueLogger) {
        this.logger = logger;
        this.client = new GoogleGenAI({
            apiKey: this.apiKey
        });
    }

    async generateMothertongueResponse(prompt: string, abortSignal: AbortSignal): Promise<MothertongueResponse> {
        const response = await this.generateResponse<string>(prompt, abortSignal);

        if (!response) {
            throw new Error("No response from Gemini API");
        }

        return AiResponseFormatter.tryParseJson(response) as MothertongueResponse;
    }

    async generateResponse<T>(prompt: string, abortSignal: AbortSignal): Promise<T> {
        const stream = await this.client.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: z.toJSONSchema(motherTongueResponseSchema),
                thinkingConfig: {
                    thinkingLevel: ThinkingLevel.LOW
                }
            },
        });

        let response: string | null = "";
        let totalBytes = 0;

        for await (const part of stream) {
            if(abortSignal.aborted) {
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