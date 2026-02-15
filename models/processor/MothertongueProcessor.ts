import { Glob, type BunFile } from 'bun';
import path, { basename, join } from 'node:path';
import type AiService from '../ai/AiService';
import AsyncLock from 'async-lock';
import type { MothertongueResponse } from '../ai/MothertongueResponse';
import { MothertongueLogger } from '../log/MothertongueLogger';
import { programOptions, PROJECT_ROOT, USER_INSTRUCTIONS } from '../..';
import { globSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import prompt from "../../prompt.md" with {type: "text"};


const promptLocation = prompt;

export class MothertongueProcessor {
    private taskLock: AsyncLock;
    private ai: AiService;
    private activeControllers: Map<string, AbortController>;
    private logger: MothertongueLogger;

    public constructor(aiService: AiService, logger: MothertongueLogger) {
        this.taskLock = new AsyncLock();
        this.ai = aiService;
        this.activeControllers = new Map();
        this.logger = logger;
    }

    public async fileModified(file: BunFile) {
        if (!file || !file.name) {
            this.logger.err("File name is missing.");
            return;
        }

        const fileName = file.name;

        if (this.activeControllers.has(fileName)) {
            this.activeControllers.get(fileName)?.abort();
            this.activeControllers.delete(fileName);
        }

        const controller = new AbortController();
        this.activeControllers.set(fileName, controller);

        await this.taskLock.acquire(fileName, async () => {
            try {
                if (controller.signal.aborted) return;

                this.logger.logClear(`Processing: ${fileName}`);

                const contents = await file.text();
                let promptContents = await promptLocation;

                const data: Record<string, string> = {
                    FILE_NAME: fileName,
                    FILE_CONTENT: contents
                };

                if (USER_INSTRUCTIONS) {
                    data["USER_INSTRUCTIONS"] = "# User Instructions\n\n" + USER_INSTRUCTIONS;

                    if (programOptions.overrideSystemPrompt) {
                        promptContents = USER_INSTRUCTIONS;
                    }

                } else {
                    data["USER_INSTRUCTIONS"] = "";
                }

                if (contents.includes("#@")) {
                    // build directory tree string for prompt
                    const directoryTree = await this.buildTree(PROJECT_ROOT);
                    data["PROJECT_FILES"] = `# Project Directory\n\n ${directoryTree}`;
                } else {
                    data["PROJECT_FILES"] = "";
                }

                // get all lines starting with "#@"
                const instructionLines = contents.split("\n").filter(line => line.trim().startsWith("#@"));

                let context = "";
                for (const line of instructionLines) {
                    // remove "," from line and grab all words
                    const words = line.replace(/,/g, "").split(" ").map(w => w.trim().toUpperCase());

                    for (const word of words) {
                        const filePath = await this.findFileByName(word);
                        if (filePath) {
                            const fileContents = Bun.file(filePath).text();
                            context += `### Context from ${filePath}\n\n${await fileContents}\n\n`;
                        }
                    }
                }

                data["IMPORT_CONTEXT"] = context;

                const prompt = promptContents.replace(/{{(\w+)}}/g, (_: any, key: string) => {
                    return data[key] || 'COULD_NOT_FIND';
                });

                let response: MothertongueResponse;

                try {
                    response = await this.ai.generateMothertongueResponse(prompt, controller.signal);
                } catch (e: any) {
                    if (e.message === "AbortError") {
                        return;
                    }

                    throw e;
                }

                const targetDir = path.dirname(fileName);
                const outputPath = path.join(targetDir, response.fileName);

                await Bun.write(outputPath, response.fileContent);
                this.logger.logClear(`Successfully wrote: ${response.fileName}`);

            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    console.error("Error processing file modification:", e);
                }
            } finally {
                if (this.activeControllers.get(fileName) === controller) {
                    this.activeControllers.delete(fileName);
                }
            }
        });
    }

    async findFileByName(fileName: string): Promise<string | null> {
        // search for file in project directory, file just needs to have the fileName as part of its name (e.g., "index" would match "src/index.ts")
        const files = globSync(join(PROJECT_ROOT, '**', '*'));
        const matchingFile = files.find(file => path.basename(file).includes(fileName));
        return matchingFile || null;
    }

    async buildTree(dirPath: string, prefix: string = ""): Promise<string> {
        let output = "";

        // Get the base name of the current directory (e.g., "src" from "/app/src")
        const currentDirName = basename(dirPath);

        // If this is the very first call (root), add the root folder name
        if (prefix === "") {
            output += `${currentDirName}\n`;
        }

        try {
            // Read directory contents
            let items = await readdir(dirPath);

            // ignore node_modules and .git folders
            items = items.filter(item =>
                item !== "node_modules" &&
                item !== ".git" &&
                item !== "dist" &&
                item !== "build" &&
                item !== "out" &&
                item !== "target"
            );

            // Filter out hidden files (optional: remove this filter to see .git, .env, etc.)
            const visibleItems = items.filter(item => !item.startsWith("."));

            for (let i = 0; i < visibleItems.length; i++) {
                const item = visibleItems[i];
                const isLast = i === visibleItems.length - 1;

                // Determine the connector style
                const connector = isLast ? "└── " : "├── ";
                const childPrefix = isLast ? "    " : "│   ";

                output += `${prefix}${connector}${item}\n`;

                const fullPath = join(dirPath, item ?? "");
                const itemStats = await stat(fullPath);

                if (itemStats.isDirectory()) {
                    // Recursively build the tree for subdirectories
                    output += await this.buildTree(fullPath, `${prefix}${childPrefix}`);
                }
            }
        } catch (error) {
            output += `${prefix}└── [Error accessing dir]\n`;
        }

        return output;
    }
}