import { DebugSession, TargetStopReason, EVENT_TARGET_STOPPED, IDebugSessionEvent } from './dbgmits';
import * as dbg from './dbgmits';
import { spawn, ChildProcess, exec, execSync } from 'child_process';
import * as vscode from 'vscode';
import { SIGINT, SIGQUIT } from 'constants';
import { promises, fstat } from 'fs';
import * as process from 'process';
import * as os from 'os';
import { getExtensionFilePath } from './util';
import * as path from 'path';
import { match } from 'assert';
import { LogLevel } from '@vscode/debugadapter/lib/logger';
import { IAttachRequestArguments, ILaunchRequestArguments } from './arguements';
import * as Templates from './templates';

export declare class DDBSession extends DebugSession {
  constructor(miVersion: string);
  public startDDB(args: ILaunchRequestArguments | IAttachRequestArguments): Promise<void>;
  public pause();
  public ddbexit();
  public attach(pid: number);
  public kill(): Promise<void>;
  public waitForStart(): Promise<void>;
  public clearBreakpoints(source?: string): Promise<void>;
  public addBreakpoint(breakpoint: Templates.Breakpoint): Promise<[boolean, Templates.Breakpoint]>;
}

export class DDBSessionImpl extends DebugSession {
  // has everything from debug_session.ts
  // accessible as this.ddbServer in DistDebug.ts
  private target_pid?: number;
  private debuggerProcess?: ChildProcess;
  private major_version!: number;
  private tokenNumber = 1;
  private tokenHandlers: Map<number, (data: string) => void> = new Map();
  
  private breakpoints: Map<Templates.Breakpoint, Number> = new Map();

  constructor(private miVersion: string = 'mi') {
    super();
    this.on(dbg.EVENT_THREAD_GROUP_STARTED, (e) => {
      this.target_pid = Number.parseInt(e.pid);
    })

    this.on("SKIP_LINE_AND_PRINT", line => {
      // console.log("Got skip line and printing:", line);
      // this.printToDebugConsole
      // this.sendEvent()
    })
  }

  public runCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = this.tokenNumber++;
      // const fullCmd = `${token}-${command}\n`;
      const fullCmd = `-${command}`;
      this.tokenHandlers.set(token, (data: string) => {
        // parse and handle here.
        console.log("Got data from runCommand:", data);
        resolve();
      });
      console.log("Running command:", fullCmd);
      this.debuggerProcess.stdin?.write(fullCmd + "\n");
    })
  }

  public async waitForStart() {
    return new Promise<void>((resolve, reject) => {
      if (this.isStarted) {
        resolve();
      } else {
        this.once(dbg.EVENT_SESSION_STARTED, () => {
          console.log("\n\n\nCaptured EVENT_SESSION_STARTED\n\n\n");
          resolve();
        });

        this.debuggerProcess?.on('close', () => {
          reject();
        });
      }
    });
  }

  public async startDDB(args: ILaunchRequestArguments | IAttachRequestArguments) {

    console.log("Starting DDB...", args.configFile);

    let debuggerArgs: string[] = args.debuggerArgs ? args.debuggerArgs : [];
    this.target_pid = undefined;

    const debuggerFilename = 'python3.9';

    debuggerArgs = debuggerArgs.concat(["/home/ubuntu/USC-NSL/distributed-debugger/py_testing/main.py"]);
    debuggerArgs = debuggerArgs.concat([args.configFile]);
    // debuggerArgs = debuggerArgs.concat(['/home/ubuntu/USC-NSL/distributed-debugger/py_testing/configs/dbg_multithread_print.yaml']);

    this.debuggerProcess = spawn(debuggerFilename, debuggerArgs);

    this.on(dbg.EVENT_DBG_CONSOLE_OUTPUT, (out) => {
      console.log("EVENT_DBG_CONSOLE_OUTPUT:", out);
      // check_version(out);
    });
    console.log("Started debugger process: ", this.debuggerProcess)
    this.debuggerProcess.stdout?.on('data', this.stdout.bind(this));


    // this.start(this.debuggerProcess.stdout!, this.debuggerProcess.stdin!);
    //create terminal and it's tty
    let currentTerminal = vscode.window.terminals.find((value, index, obj) => {
      return value.name === 'DDB';
    });
    if (!currentTerminal) {
      currentTerminal = vscode.window.createTerminal('DDB');
    }
    currentTerminal.show(true);
    let pid = await currentTerminal.processId;
    console.log("Current terminal pid:", pid);
    var tty = '/dev/pts/0';
    // exec(`ps h -o tty -p ${pid}|tail -n 1`, (error, stdout, stderr) => {
    //   if (!error) {
    //     tty = '/dev/' + stdout;
    //   }
      // this.executeCommand(`inferior-tty-set ${tty}`);
    // });

    this.debuggerProcess.on('error', (error: Error) => {
      vscode.window.showErrorMessage(error.message);
      this.emit(EVENT_TARGET_STOPPED, { reason: TargetStopReason.Exited });
    });

    this.debuggerProcess.once('exit', () => {
      this.end(false);
    });

    this.debuggerProcess.on('SIGINT', () => {
      this.logger.log('process: SIGINT');
    });
  }

  public pause() {
    return new Promise<void>((resolve, reject): void => {
      try {
        // %HANDLE_WINDOWS_CODE%
        if (this.debuggerProcess) {
          process.kill(this.debuggerProcess.pid, "SIGINT");
        }
      } catch (error) {
        //this.logger.error("pause failure. "+this.debuggerProcess.toString()+error);
        reject();
      }
      //resolve();
      this.once(EVENT_TARGET_STOPPED, (e) => {
        resolve();
      });
    });
  }

  public kill(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (this.debuggerProcess) {
          process.kill(this.debuggerProcess.pid);
        }
        resolve();
      } catch (error) {
        reject();
      }
      //resolve();
      this.once(EVENT_TARGET_STOPPED, (e) => {
        resolve();
      });
    });
  }

  startInferior(
    options?: { threadGroup?: string; stopAtStart?: boolean }): Promise<void> {
      console.log("Starting inferior with options:", options);
    if (options?.stopAtStart) {
      if (this.major_version > 7) {
        return this.execNativeCommand('starti');
      }
    }
    return super.startInferior(options);
  }

  public async ddbexit() {
    await this.end(true);
  }

  public async attach(pid: number) {
    await this.targetAttach(pid);
    this.target_pid = pid;
  }

  private stdout(data: Buffer) {
    const op = data.toString("utf-8");
    console.log("Got op:", op);
    this.parseOutput(op);
  }

  public async addBreakpoint(breakpoint: Templates.Breakpoint): Promise<[boolean, Templates.Breakpoint]> {
    return new Promise((resolve, reject) => {
      console.log("Adding breakpoint:", breakpoint);
      if (this.breakpoints.has(breakpoint)) {
        return resolve([false, breakpoint]);
      }
      const loc = `"${breakpoint.file}:${breakpoint.line}"`;
      const cmd = `break-insert -f ${loc}`;
      this.runCommand(cmd);

    })
  }

  public async clearBreakpoints(source?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const promises: Promise<void>[] = [];
      return resolve();
      const currentBreakpoints = this.breakpoints;
      this.breakpoints = new Map();
      currentBreakpoints.forEach((num, bp) => {
        if (bp.file === source) {
          // promises.push(this.deleteBreakpoint(num));
        }
      })
    })
  }

  private async parseOutput(data: string) {
    const lines = data.split("\n");

    lines.forEach(line => {
      if (line.match(/^\(gdb\)\s*/)) {
        if (!this.isStarted) {
          this.emit(dbg.EVENT_SESSION_STARTED);
          this.setStarted();

        }

      }
    })
  }
}