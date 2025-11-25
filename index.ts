import { Agent } from './src/agent';
import { Renderer } from './src/ui/renderer';
import * as readline from 'readline';
import ora from 'ora';
import inquirer from 'inquirer';

const cli = new Agent(process.env.GEMINI_API_KEY || '');
const renderer = new Renderer();

// Confirmation callback to pass to executeTool
const confirmChange = async (diff: string): Promise<boolean> => {
    console.log('\n\x1b[33mProposed Changes:\x1b[0m');
    console.log(diff);
    
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Do you want to apply these changes?',
            default: false
        }
    ]);
    return confirm;
};

async function main() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('Please set the GEMINI_API_KEY environment variable.');
        process.exit(1);
    }

    cli.start();
    console.log('\x1b[36mCodeCraft Agent Started. Type "exit" to quit.\x1b[0m');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = () => {
        rl.question('\x1b[32m> \x1b[0m', async (msg) => {
            if (msg.toLowerCase() === 'exit') {
                rl.close();
                process.exit(0);
            }

            const spinner = ora('Thinking...').start();
            try {
                // We need to pass the confirm callback to the chat method,
                // which needs to pass it to executeTool.
                // Since Agent.chat doesn't accept it yet, we need to update Agent.chat signature or property.
                // For now, let's monkey-patch or update Agent class.
                // Update: I'll update Agent class to accept a context/options object in chat().
                
                // Wait, Agent.chat calls executeTool directly. 
                // I should update Agent.chat to accept a callback.
                const response = await cli.chat(msg, confirmChange);
                
                spinner.stop();
                console.log(renderer.render(response));
            } catch (error: any) {
                spinner.fail('Error');
                console.error('\x1b[31mError:\x1b[0m', error.message);
            }

            ask();
        });
    };

    ask();
}

// Only run if main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}