import type { MothertongueResponse } from "./MothertongueResponse";

export default interface AiService {
    generateMothertongueResponse(prompt: string, abortSignal: AbortSignal): Promise<MothertongueResponse>;
}