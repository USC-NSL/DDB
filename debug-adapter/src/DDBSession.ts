import { DebugSession, TargetStopReason, EVENT_TARGET_STOPPED, IDebugSessionEvent } from './dbgmits';
import * as dbg from './dbgmits';
import { spawn, ChildProcess, exec, execSync } from 'child_process';
import { Transform } from 'stream';
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

const CONFIG_DONE = "CONFIGURATION_DONE_EVENT";

export class DDBSessionImpl extends DebugSession {
  // has everything from debug_session.ts
  // accessible as this.ddbServer in DistDebug.ts
  private target_pid?: number;
  private debuggerProcess?: ChildProcess;
  private major_version!: number;
  private tokenNumber = 10000;
  private lastOpTime = 0;
  private _exePaused = true;
  private tokenHandlers: Map<Number, Function> = new Map();

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

  public runCommand(command: string, callback?: Function): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = this.tokenNumber++;
      const fullCmd = `${token}-${command}`;
      // const fullCmd = `-${command}`;
      this.tokenHandlers.set(token, callback);
      console.log("Running command:", fullCmd);
      this.debuggerProcess.stdin?.write(fullCmd + "\n");
    })
  }

  public async waitForStart() {
    return new Promise<void>((resolve, reject) => {
      if (this.isStarted) {
        return resolve();
      } else {
        this.once(dbg.EVENT_SESSION_STARTED, () => {
          console.log("\n\n\nCaptured EVENT_SESSION_STARTED\n\n\n");
          return resolve();
        });

        this.debuggerProcess?.on('close', () => {
          reject();
        });
      }
    });
  }

  public async waitForConfigureDone() {
    return new Promise<void>((resolve, reject) => {
      if (this.isConfigDone) return resolve();
      this.once(CONFIG_DONE, () => {
        this.setConfigDone()
        return resolve();
      })
    })
  }

  public setConfigurationDone() {
    this.emit(CONFIG_DONE);
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

    console.log("Started debugger process: ", this.debuggerProcess)
    this.debuggerProcess.stdout.on("data", this.stdout.bind(this))

    this.on(dbg.EVENT_DBG_CONSOLE_OUTPUT, (out) => {
      console.log("EVENT_DBG_CONSOLE_OUTPUT:", out);
      // check_version(out);
    });

    setInterval(() => {
      if (Date.now() - this.lastOpTime > 2000) {
        console.log("\nCODE RED. NEED MORE OP");
        this.runCommand("\n")
      }
    }, 3000);


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
    this.lastOpTime = Date.now();
    const op = data.toString("utf-8");
    // console.log("Got op:", op);
    this.parseOutput(op);
  }

  public async addBreakpoint(breakpoint: Templates.Breakpoint): Promise<[boolean, Templates.Breakpoint]> {
    return new Promise((resolve, reject) => {
      if (this.breakpoints.has(breakpoint)) {
        return resolve([false, breakpoint]);
      }
      const loc = `"${breakpoint.file}:${breakpoint.line}"`;
      const cmd = `break-insert -f ${loc}`;
      this.runCommand(cmd, (err, result) => {
        if (err) return reject([false, err]);
        return resolve([true, result.bkpt]);
      });

    })
  }

  public async setEntryBreakpoint(): Promise<[boolean, Templates.Breakpoint]> {
    return new Promise((resolve, reject) => {
      console.log("Adding breakpoint on entry");
      const cmd = `break-insert -f -t main`;
      this.runCommand(cmd, (err, result) => {
        if (err) return reject([false, err]);
        console.log("Response for breakpoint on entry")
        return resolve([true, result]);
      });
    })
  }

  public async getThreads(): Promise<{all: [], current: dbg.IThreadInfo}> {
    return new Promise((resolve, reject) => {
      const fullCmd = `thread-info`;
      this.runCommand(fullCmd, (error, result) => {
        if (error) return reject(error);
        const currentThreadId = +result['current-thread-id'];
        let currentThread: dbg.IThreadInfo;
        const threadList = result.threads.map(thread => {
          if (+thread.id === currentThreadId)
            currentThread = thread;
          return {
            ...thread,
            id: +thread.id,
            targetId: thread['target-id'],
            frame: {
              ...thread.frame,
              level: +thread.frame.level,
              line: +thread.frame.line
            },
            isStopped: thread.state === "stopped",
            processorCore: thread.core,
          }
        })
        return resolve({ all: threadList, current: currentThread });
      })
    })
  }

  public startAllInferiors(stopAtStart): Promise<void> {
    return new Promise((resolve, reject) => {
      const fullCmd = `exec-run --all${stopAtStart ? " --start" : ""}`
      this.runCommand(fullCmd, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
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
    if (!this.isStarted) {
      const started = lines.filter(line => line.match(/^\(gdb\)\s*/));
      if (started.length) {
        this.emit(dbg.EVENT_SESSION_STARTED);
        this.setStarted();
        this._exePaused = false;
        this.runCommand("\n")
      }
    }

    const tokenResponses = [];
    lines.forEach((line, index) => {
      if (line.match(/type: result/) && index < lines.length - 1 && lines[index + 1] !== "None") {
        const token = line.match(/(?<=token: )(\d{1,})/gi)?.[0];
        if (!token) return;
        try {
          const response = JSON.parse(lines[index + 1].replace(/'/g, '"'));
          tokenResponses.push([+token, response])
        }
        catch (err) {
          console.error("Cannot parse:", err);
        }
      }
    })

    tokenResponses.forEach(([token, response]) => {
      this.tokenHandlers.get(token)?.(null, response);
    })

    const notifyResponses = [];
    lines.forEach((line, index) => {
      if (line.match(/type: notify/) && index < lines.length - 1 && lines[index + 1] !== "None") {
        const message = line.match(/(?<=message: )([a-zA-Z-]{1,})/gi)?.[0];
        if (!message) return;
        console.log("notify message:", message);
        try {
          const response = JSON.parse(lines[index + 1].replace(/'/g, '"'));
          notifyResponses.push([message, response])
        }
        catch (err) {
          console.error("Cannot parse for notify:", err);
        }
      }
    })

    notifyResponses.forEach(([message, response]) => {
      response.message = message;
      this.handleParsedOutput(response);
    })

  }

  private handleParsedOutput(obj: { reason: String }): void {
    switch (obj.reason) {
      case "breakpoint-hit":
        this._exePaused = true;
        this.emit(dbg.EVENT_BREAKPOINT_HIT, obj['thread-id'])
        // this.handleBreakpoint(response)
        break;
      default:
        console.log("Nothing", obj);
        break
    }
  }
}