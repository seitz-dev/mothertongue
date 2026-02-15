import { GoogleGenAI } from "@google/genai";
import type { BunFile } from "bun";
import type AiService from "./models/ai/AiService";
import { GeminiService } from "./models/ai/GeminiService";
import path from "node:path"
import AsyncLock from "async-lock";
import { MothertongueProcessor } from "./models/processor/MothertongueProcessor";
import { WatcherService } from './models/watcher/WatcherService';
import { MothertongueLogger } from './models/log/MothertongueLogger';

const params = Bun.argv.slice(2);
export let PROJECT_ROOT = "";

await initialize();

async function initialize() {
    const filePath = params[0];
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

    const ai: AiService = new GeminiService(process.env.GEMINI_TOKEN || "", logger);
    const processor: MothertongueProcessor = new MothertongueProcessor(ai, logger);
    const watcher = new WatcherService(processor, logger);

    await watcher.startWatching(filePath);
}

