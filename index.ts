import type AiService from "./models/ai/AiService";
import { GeminiService } from "./models/ai/GeminiService";
import path from "node:path"
import { MothertongueProcessor } from "./models/processor/MothertongueProcessor";
import { WatcherService } from './models/watcher/WatcherService';
import { MothertongueLogger } from './models/log/MothertongueLogger';
import { parseArgs } from "node:util";
import { ThinkingLevel } from "@google/genai";

export let PROJECT_ROOT = "";
export let USER_INSTRUCTIONS: string | undefined = undefined;

export const { values: programOptions, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        thinking: { type: "string", short: "t" },
        model: { type: "string", short: "m" },
        overrideSystemPrompt: { type: "string", short: "o" },
    },
    allowPositionals: true,
})

await initialize();
async function initialize() {
    const filePath = positionals[0];
    const logger = new MothertongueLogger();

    if (!filePath) {
        logger.err("Please provide a file path to watch.");
        process.exit(1);
    }

    if (filePath.endsWith("/") || filePath.endsWith("\\")) {
        PROJECT_ROOT = filePath;
    } else {
        PROJECT_ROOT = path.dirname(filePath);
    }

    // see if there is a mother_tongue.MD in the project root and if so, read it and set it as user instructions
    const instructionsPath = path.join(PROJECT_ROOT, "mother_tongue.MD");
    if (await Bun.file(instructionsPath).exists()) {
        USER_INSTRUCTIONS = await Bun.file(instructionsPath).text();
    }

    // -thinking HIGH, switch return
    let thinkingLevel = ThinkingLevel.LOW;
    if (programOptions.thinking) {
        switch (programOptions.thinking.toUpperCase()) {
            case "HIGH":
                thinkingLevel = ThinkingLevel.HIGH;
                break;
            case "MEDIUM":
                thinkingLevel = ThinkingLevel.MEDIUM;
                break;
            case "LOW":
                thinkingLevel = ThinkingLevel.LOW;
                break;
            case "MINIMAL":
                thinkingLevel = ThinkingLevel.MINIMAL;
                break;
            default:
                logger.err("Invalid thinking level provided. Valid options are: LOW, MEDIUM, HIGH, MINIMAL.");
                process.exit(1);
        }
    }

    const ai: AiService = new GeminiService(process.env.GEMINI_TOKEN || "", logger, { thinkingLevel, model: programOptions.model });
    const processor: MothertongueProcessor = new MothertongueProcessor(ai, logger);
    const watcher = new WatcherService(processor, logger);

    await watcher.startWatching(filePath);
}

