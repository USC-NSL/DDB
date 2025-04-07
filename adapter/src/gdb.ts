import { MI2DebugSession, RunCommand } from './mibase';
import { DebugSession, InitializedEvent, TerminatedEvent, StoppedEvent, OutputEvent, Thread, StackFrame, Scope, Source, Handles } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { MI2, escape } from "./backend/mi2/mi2";
import { SSHArguments, ValuesFormattingMode } from './backend/backend';
import * as fs from 'fs';
import { promisify } from 'util';
import { spawn } from 'child_process';

const accessAsync = promisify(fs.access);

export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	cwd: string;
	target: string;
	ddbpath: string;
	env: any;
	debugger_args: string[];
	pathSubstitutions: { [index: string]: string };
	arguments: string;
	terminal: string;
	autorun: string[];
	stopAtEntry: boolean | string;
	ssh: SSHArguments;
	valuesFormatting: ValuesFormattingMode;
	printCalls: boolean;
	showDevDebugOutput: boolean;
	pythonPath?: string;
	configFilePath: string;
}

export interface AttachRequestArguments extends DebugProtocol.AttachRequestArguments {
	cwd: string;
	target: string;
	gdbpath: string;
	env: any;
	debugger_args: string[];
	pathSubstitutions: { [index: string]: string };
	executable: string;
	remote: boolean;
	autorun: string[];
	stopAtConnect: boolean;
	stopAtEntry: boolean | string;
	ssh: SSHArguments;
	valuesFormatting: ValuesFormattingMode;
	printCalls: boolean;
	showDevDebugOutput: boolean;
}

async function checkDDBExists(ddbpath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const ddbProc = spawn(ddbpath, ['--version']);

        // Capture stdout and stderr
        let stdout = '';
        let stderr = '';

        ddbProc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ddbProc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ddbProc.on('error', (err) => {
            reject(new Error(`ddb not found ${""}`));
        });

        ddbProc.on('close', (code) => {
            if (code === 0) {
                // Optionally, verify the Python version using stdout or stderr
                resolve();
            } else {
                reject(new Error(`ddb check failed with code ${code}: ${stderr || stdout}`));
            }
        });
    });
}

class GDBDebugSession extends MI2DebugSession {
	protected override initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body.supportsGotoTargetsRequest = true;
		response.body.supportsHitConditionalBreakpoints = true;
		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsConditionalBreakpoints = true;
		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsSetVariable = true;
		response.body.supportsStepBack = false;
		this.sendResponse(response);
	}
	
	protected override async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: LaunchRequestArguments
    ): Promise<void> {
        try {
            // 1. Check if the configuration file exists and is readable
            await fs.promises.access(args.configFilePath, fs.constants.R_OK);
            
            // 2. Check if DDB exists
			await checkDDBExists(args.ddbpath);

            // 3. Initialize the MI Debugger
            this.miDebugger = new MI2(
                args.ddbpath,
                [args.configFilePath],
                args.debugger_args,
                args.env
            );

            // Set various properties
            this.setPathSubstitutions(args.pathSubstitutions);
            this.initDebugger();
            this.quit = false;
            this.attached = false;
            this.initialRunCommand = RunCommand.NONE;
            this.isSSH = false;
            this.started = false;
            this.crashed = false;
            this.setValuesFormattingMode(args.valuesFormatting);
            this.miDebugger.printCalls = !!args.printCalls;
            this.miDebugger.debugOutput = !!args.showDevDebugOutput;
            this.stopAtEntry = args.stopAtEntry;

            // If SSH is not used, load the debugger normally
            await this.miDebugger.load(
                args.cwd,
                args.target,
                args.arguments,
                args.terminal,
                args.autorun || []
            );

            // Send successful response
            this.sendResponse(response);
        } catch (err: any) {
            // Determine the type of error and send appropriate response
            if (err.message.includes('Python')) {
                // Python-related error
                this.sendErrorResponse(response, 104, err.message);
            } else if (err.code === 'ENOENT' || err.code === 'EACCES') {
                // Configuration file-related error
                this.sendErrorResponse(response, 103, `Failed to load config file: ${err.message}`);
            } else {
                // Other unexpected errors
                this.sendErrorResponse(response, 999, `Unexpected error: ${err.message}`);
            }
        }
    }

	// Add extra commands for source file path substitution in GDB-specific syntax
	protected setPathSubstitutions(substitutions: { [index: string]: string }): void {
		if (substitutions) {
			Object.keys(substitutions).forEach(source => {
				this.miDebugger.extraCommands.push("gdb-set substitute-path \"" + escape(source) + "\" \"" + escape(substitutions[source]) + "\" --all");
			});
		}
	}
}
console.log("Starting gdb adapter.......");
DebugSession.run(GDBDebugSession);
