import { GoogleGenAI } from "@google/genai";
import type { BunFile } from "bun";

const ai = new GoogleGenAI({
    apiKey: Bun.env.GEMINI_TOKEN
});

const params = Bun.argv.slice(2);

// get first param, which should be the path to the file to watch
const filePath = params[0];

if (!filePath) {
    console.error("Please provide a file path to watch.");
    process.exit(1);
}

// does file extension end in .mother?
if (!filePath.endsWith(".mother")) {
    console.error("Please provide a file with the .mother extension.");
    process.exit(1);
}

let file: BunFile;

// does file exist?
file = Bun.file(filePath);
if (!file) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const exists = await file.exists();
if (!exists) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

console.log(`Watching file: ${filePath}`);

let lastModified = (await file.stat()).size;
while (true) {
    const newFile = Bun.file(filePath);
    const newModified = (await newFile.stat()).size;
    if (newModified !== lastModified) {
        console.log(`File changed: ${filePath}`);
        lastModified = newModified;
        await fileModified(newFile);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
}

async function fileModified(file: BunFile) {
    // read file, send to Gemini API, get response, write response to new file
    // gemini should send JSON payload:
    // {
    //     "file_name": "fileName.extension", // notice how instead of .mother, it should be the language of the code, e.g. .js, .py, etc.
    //     "file_content: "language -> code"
    // }

    const prompt = `This file: ${file.name} has been modified. Please read the file.  It includes pseudo code to be translated to the language designated the top via the comment:, eg: 
    #js
    console.log("hello world") should be translated to JavaScript. Please return only the code, no explanations. Ideally, you should return a JSON object with the file name and the file content, which should be the code in the language designated by the comment at the top of the file (this comment will be like so: #js for Javascript)`;

    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
    });
    console.log("Raw response from Gemini API:", response.execu);
}

function stripMdText(text: string) {
    // get rid of ```json and ```
    return text.replace(/```json/g, "").replace(/```/g, "");
}