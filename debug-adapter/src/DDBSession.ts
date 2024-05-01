import { DebugSession, TargetStopReason, EVENT_TARGET_STOPPED, IDebugSessionEvent } from './dbgmits';
import * as dbg from './dbgmits';
import { spawn, ChildProcess, exec, execSync } from 'child_process';
import * as vscode from 'vscode';
import { parseMI, MINode } from './miParser';
import * as process from 'process';
import { IAttachRequestArguments, ILaunchRequestArguments } from './arguements';
import * as Templates from './templates';
import _ = require('lodash');

const CONFIG_DONE = "CONFIGURATION_DONE_EVENT";
const tokenOutputRegex = /^\d{1,}[\^\=\*].+/;
const notifyOutputRegex = /^\*+.+/;

export class DDBSessionImpl extends DebugSession {
  // has everything from debug_session.ts
  // accessible as this.ddbServer in DistDebug.ts
  private target_pid?: number;
  private debuggerProcess?: ChildProcess;
  private major_version!: number;
  private tokenNumber = 10000;
  private lastOpTime = 0;
  private opBuffer = "";
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

  public runCommand(command: string, callback?: Function, noToken?: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      if (noToken) {
        this.debuggerProcess.stdin?.write(command + "\n");
        return resolve();
      }
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
        this.runCommand("\n", () => {}, true);
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
      this.debuggerProcess?.stdout?.removeAllListeners();
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
    // this.opBuffer += op;
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
        const miResults = result.results[0];
        const bkptResult = miResults[1].reduce((obj, item) => { return { ...obj, [item[0]]: item[1] } }, {})
        return resolve([true, bkptResult]);
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

  public async getThreads(): Promise<{ all: [], current: dbg.IThreadInfo }> {
    return new Promise((resolve, reject) => {
      const fullCmd = `thread-info`;
      this.runCommand(fullCmd, (error, miResult) => {
        if (error) return reject(error);
        // const result = miResult.results?.reduce((obj, item) => { return { ...obj, [item[0]]: item[1] } }, {});
        const result = _.fromPairs(miResult.results);
        const currentThreadId = +result['current-thread-id'];
        result.threads = result.threads.map(thread => _.fromPairs(thread));
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

  public async getStackTrace(threadId?: number, frameId?: number, maxLevels?: number): Promise<dbg.IStackFrameInfo[]> {
    return new Promise((resolve, reject) => {
      const options = [];
      if (threadId) options.push(`--thread ${threadId}`);
      const fullCmd = `stack-list-frames ${options.join(" ")}`;
      this.runCommand(fullCmd, (error, miResult) => {
        if (error) return reject(error);
        const result = _.fromPairs(miResult.results);
        result.stack = result.stack.map(frame => _.fromPairs(frame));
        const frames = result.stack.map(frame => {
          return {
            level: +frame.level,
            address: frame.addr,
            func: frame.func,
            file: frame.file,
            fullname: frame.fullname,
            line: +frame.line,
            filename: frame.file
          }
        })
        return resolve(frames);
      })
    })
  }

  public async getStackVariables(threadId: number, frame: number): Promise<dbg.IVariableInfo[]> {
    return new Promise((resolve, reject) => {
      const fullCmd = `stack-list-variables --thread ${threadId} --frame ${frame} --simple-values`;
      this.runCommand(fullCmd, (error, miResult) => {
        if (error) return reject(error);
        const result = _.fromPairs(miResult.results);
        result.variables = result.variables.map(variable => _.fromPairs(variable));
        const variables = result.variables.map(variable => {
          return {
            name: variable.name,
            type: variable.type,
            value: variable.value,
            raw: variable
          }
        })
        return resolve(variables);
      })
    })
  }

  public async addWatch(exp: string, threadId?: number, frameLevel?: number): Promise<dbg.IWatchInfo> {
    return new Promise((resolve, reject) => {
      const options = [];
      if (threadId) options.push(`--thread ${threadId}`);
      if (frameLevel) options.push(`--frame ${frameLevel}`);
      const fullCmd = `var-create ${options.join(" ")} - * "${exp}"`;
      this.runCommand(fullCmd, (error, miResult) => {
        if (error) return reject(error);
        const result = _.fromPairs(miResult.results);
        console.log("Add watch result:", result);
        return resolve(result);
      })
    })
  }

  public async resumeThreads(threadId?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const fullCmd = `exec-continue ${threadId ? `--thread ${threadId}` : "all"}`;
      this.runCommand(fullCmd, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    })  
  }

  public async removeWatch(id: string) {
    return new Promise((resolve, reject) => {
      const fullCmd = `var-delete ${id}`;
      this.runCommand(fullCmd, (error, miResult) => {
        if (error) return reject(error);
        return resolve(miResult);
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
    // const end = this.opBuffer.lastIndexOf("\n");
    // let data = "";
    // if (end !== -1) {

    // }

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
    const notifyResponses = [];
    lines.forEach(line => {
      if (tokenOutputRegex.exec(line)) {
        try {
          const parsedResult = parseMI(line);
          if (parsedResult?.resultRecords?.resultClass === "done") {
            const token = +parsedResult.token;
            tokenResponses.push([token, parsedResult.resultRecords]);
          }
        }
        catch (err) {
          console.log("This isnt MI output");
        }
      }
      if (notifyOutputRegex.exec(line)) {
        try {
          const parsedResult = parseMI(line);
          console.log("parsedResult for notify:", parsedResult);
          const parsedOp = parsedResult.outOfBandRecord[0]?.output?.reduce((obj, item) => { return { ...obj, [item[0]]: item[1] } }, {});
          notifyResponses.push(parsedOp);
        } catch(err) {
          console.log("This isnt MI output for notify");
        }
      }


    })

    tokenResponses.forEach(([token, response]) => {
      this.tokenHandlers.get(token)?.(null, response);
    })

    notifyResponses.forEach(this.handleParsedOutput.bind(this));

  }

  private handleParsedOutput(obj: { reason: String }): void {
    switch (obj.reason) {
      case "breakpoint-hit":
        this._exePaused = true;
        this.emit(dbg.EVENT_BREAKPOINT_HIT, obj);
        break;
      case "exited-normally":
        this.emit(dbg.EVENT_TARGET_STOPPED, { reason: TargetStopReason.Exited });
        break;
      default:
        console.log("Nothing", obj);
        break
    }
  }
}