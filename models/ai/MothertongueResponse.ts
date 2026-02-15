import z from "zod";

export interface MothertongueResponse {
    fileName: string;
    fileContent: string
}

export const motherTongueResponseSchema = z.object({
    fileName: z.string().describe("The expected file name for the generated code, including extension. For example: 'output.js' or 'script.py'."),
    fileContent: z.string().describe("The content for the interpolated file.")
});