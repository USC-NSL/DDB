import * as vscode from 'vscode';

class Logger {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel("DDB Extension", {
			log: true,
		});
    }

    public log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
        // Optionally show the output channel (false = don't steal focus)
        this.outputChannel.show(false);
    }

    public debug(message: string): void {
        this.log(`[debug] ${message}`);
    }

    public info(message: string): void {
        this.log(`[INFO] ${message}`);
    }

    public warn(message: string): void {
        this.log(`[WARN] ${message}`);
    }

    public error(message: string): void {
        this.log(`[ERROR] ${message}`);
    }
}

// Export a singleton instance of the logger
export const logger = new Logger();
