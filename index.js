#!/usr/bin/env node
import { cac } from 'cac';
import { GoogleGenerativeAI } from '@google/generative-ai';
const { generateRepoMap } = require('./rust_engine.linux-x64-gnu.node');
const cli = cac();
cli
    .command('chat <query>', 'Chat with the AI')
    .action(async (query) => {
    try {
        const repoMap = generateRepoMap('.');
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('Please set the GEMINI_API_KEY environment variable.');
            process.exit(1);
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
        You are a CLI coding assistant.
        This is a map of the repository you are working in:
        ${repoMap}

        User query: ${query}
      `;
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
            process.stdout.write(chunk.text());
        }
    }
    catch (error) {
        console.error('An error occurred:', error);
    }
});
cli.help();
cli.parse();
