import type { MothertongueResponse } from "../MothertongueResponse";

export class AiResponseFormatter {
    public static tryParseJson(input: string): MothertongueResponse {
        try {
            return JSON.parse(this.stripMarkdown(input)) as MothertongueResponse;
        }
        catch (e) {
            throw new Error("Failed to parse AI response as JSON: " + e);
        }
    }

    static stripMarkdown(input: string): string {
        // mostly we wanna remove codeblocks and the language designator, e.g. ```js, ```python, etc.
        return input.replace(/```[a-zA-Z]*\n/g, "").replace(/```/g, "");
    }
}