import AsyncLock from 'async-lock';
import type { FileMapParameters } from './FileMapParameters';
import { Glob, type BunFile } from 'bun';
import path from 'node:path';
import { watch } from 'node:fs';
import type { MothertongueProcessor } from '../processor/MothertongueProcessor';
import { MothertongueLogger } from '../log/MothertongueLogger';

export class WatcherService {
    logger: MothertongueLogger;
    fileMapLock: AsyncLock;

    /**
     * This map determines whether a file is currently being processed. The key is the file path, and the value is a boolean indicating whether the file is being processed (true) or not (false).
     */
    fileMap: Map<string, FileMapParameters>;

    processor: MothertongueProcessor;

    constructor(processor: MothertongueProcessor, logger: MothertongueLogger) {
        this.processor = processor;
        this.fileMapLock = new AsyncLock();
        this.fileMap = new Map<string, FileMapParameters>();
        this.logger = logger;
    }

    /**
    * Watches a directory or specific file.
    * @param filePath The directory (ending in /) or specific file path.
    */
    public async startWatching(filePath: string) {
        const scanner = new Glob("**/*.mother");
        const scanRoot = filePath.endsWith("/") || filePath.endsWith("\\") ? filePath : "./"; // Adjust based on your needs

        for await (const relativePath of scanner.scan(scanRoot)) {
            const fullPath = path.join(scanRoot, relativePath);
            await this.initializeFileEntry(fullPath);
        }

        watch(filePath, { recursive: true }, async (eventType, filename) => {
            if (!filename || !filename.endsWith(".mother")) return;

            const file = Bun.file(path.join(scanRoot, filename));

            if (eventType === "change") {
                await this.processor.fileModified(file);
            }
        });

        if (filePath.endsWith("/") || filePath.endsWith("\\")) {
            this.logger.logClear(`Watching directory: ${filePath}**.mother`);
        } else {
            this.logger.logClear(`Watching file: ${filePath}`);
        }
    }

    private async initializeFileEntry(filePath: string) {
        await this.fileMapLock.acquire(filePath, () => {
            if (!this.fileMap.has(filePath)) {
                this.fileMap.set(filePath, {
                    isBeingProcessed: false,
                    lastModifiedTime: 0
                });
            }
        });
    }

    public async setProcessing(file: BunFile) {
        if (!file.name) {
            throw new Error("File must have a name property");
        }

        await this.fileMapLock.acquire(file.name, async () => {
            this.fileMap.set(file.name!, {
                isBeingProcessed: true,
                lastModifiedTime: (await file.stat()).mtime.getTime()
            });
        });
    }

    public async setNotProcessing(file: BunFile) {
        if (!file.name) {
            throw new Error("File must have a name property");
        }

        await this.fileMapLock.acquire(file.name, async () => {
            this.fileMap.set(file.name!, {
                isBeingProcessed: false,
                lastModifiedTime: (await file.stat()).mtime.getTime()
            });
        });
    }

    public async isBeingProcessed(file: BunFile): Promise<boolean> {
        if (!file.name) {
            throw new Error("File must have a name property");
        }
        return await this.fileMapLock.acquire(file.name, async () => {
            const fileMapParameters = this.fileMap.get(file.name!);
            return fileMapParameters ? fileMapParameters.isBeingProcessed : false;
        });
    }
}