import { Agent } from './src/agent';
import { Renderer } from './src/ui/renderer';
import * as readline from 'readline';

/**
 * Validates user input before sending to agent.
 * Returns null if valid, error message if invalid.
 */
function validateInput(input: string): string | null {
    if (!input.trim()) {
        return 'Please enter a query.';
    }
    return null;
}

const cli = new Agent(process.env.GEMINI_API_KEY || '');
const renderer = new Renderer();

let mainRl: readline.Interface;

const confirmChange = async (diff: string): Promise<boolean> => {
    console.log('\n\x1b[33mProposed Changes:\x1b[0m');
    console.log(diff);

    return new Promise((resolve) => {
        mainRl.question('\x1b[33mApply these changes? (y/n): \x1b[0m', (answer) => {
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
};

async function main() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('Please set the GEMINI_API_KEY environment variable.');
        process.exit(1);
    }

    cli.start();
    console.log('\x1b[36mCodeCraft Agent Started. Type "exit" to quit.\x1b[0m');

    mainRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Keep stdin open to prevent process from exiting
    process.stdin.resume();

    let isClosing = false;

    mainRl.on('close', () => {
        isClosing = true;
    });

    const ask = async () => {
        while (!isClosing) {
            let msg: string;
            try {
                msg = await new Promise<string>((resolve, reject) => {
                    if (mainRl.closed || isClosing) {
                        reject(new Error('Interface closed'));
                        return;
                    }
                    mainRl.question('\x1b[32m> \x1b[0m', (input) => {
                        resolve(input);
                    });
                });
            } catch (err) {
                break;
            }

            // Validate input before processing
            const validationError = validateInput(msg);
            if (validationError) {
                console.log(validationError);
                continue;
            }

            if (msg.toLowerCase() === 'exit') {
                process.stdin.pause();
                mainRl.close();
                process.exit(0);
            }

            // Custom spinner that doesn't interfere with readline
            const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let frameIndex = 0;
            const spinnerInterval = setInterval(() => {
                process.stdout.write(`\r${spinnerFrames[frameIndex]} Thinking...`);
                frameIndex = (frameIndex + 1) % spinnerFrames.length;
            }, 80);

            try {
                const response = await cli.chat(msg, confirmChange);
                clearInterval(spinnerInterval);
                process.stdout.write('\r\x1b[K'); // Clear the spinner line
                console.log(renderer.render(response));
                console.log();
            } catch (error: any) {
                clearInterval(spinnerInterval);
                process.stdout.write('\r\x1b[K'); // Clear the spinner line
                console.error('\x1b[31mError:\x1b[0m', error.message);
            }
        }
    };

    await ask();
}

// Only run if main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}