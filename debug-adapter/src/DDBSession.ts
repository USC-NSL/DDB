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

export declare class DDBSession extends DebugSession {
  constructor(miVersion: string);
  public startDDB(args: ILaunchRequestArguments | IAttachRequestArguments): Promise<void>;
  public pause();
  public ddbexit();
  public attach(pid: number);
  public kill(): Promise<void>;
  public waitForStart(): Promise<void>;
}

export class DDBSessionImpl extends DebugSession {
  private target_pid?: number;
  private debuggerProcess?: ChildProcess;
  private major_version!: number;
  private gdb_arch?: string;

  constructor(private miVersion: string = 'mi') {
    super();
    this.on(dbg.EVENT_THREAD_GROUP_STARTED, (e) => {
      this.target_pid = Number.parseInt(e.pid);
    })
  }

  public async waitForStart() {
    return new Promise<void>((resolve, reject) => {
      if (this.isStarted) {
        resolve();
      } else {
        this.once(dbg.EVENT_SESSION_STARTED, () => {
          resolve();
        });

        this.debuggerProcess?.on('close', () => {
          reject();
        });
      }
    });
  }

  public async startDDB(args: ILaunchRequestArguments | IAttachRequestArguments) {

    console.log("Starting DDB...");

    let debuggerArgs: string[] = args.debuggerArgs ? args.debuggerArgs : [];
    this.target_pid = undefined;

    const debuggerFilename = 'ddb configs/dbg_multithread_print.yaml';

    // debuggerArgs = debuggerArgs.concat(['--interpreter', this.miVersion]);
    console.log("Starting with:", debuggerFilename, debuggerArgs);
    this.debuggerProcess = spawn(debuggerFilename, debuggerArgs);
    
    let check_version = (out: string) => {
      if (out.startsWith('GNU gdb')) {
        let matchs = out.match(/\(GDB\).*?(\d+)/);
        if (matchs) {
          this.major_version = Number.parseInt(matchs[1]);
        }
      } else if (out.startsWith('This GDB was configured as')) {
        let matchs = out.match(/This GDB was configured as "(.*?)"/);
        if (matchs) {
          this.gdb_arch = matchs[1];

        }
        this.removeListener(dbg.EVENT_DBG_CONSOLE_OUTPUT, check_version);
      }
    }

    this.on(dbg.EVENT_DBG_CONSOLE_OUTPUT, (out) => {
      console.log("Checking version...", out);
      check_version(out);
    });
    console.log("Started debugger process: ", this.debuggerProcess)
    this.start(this.debuggerProcess.stdout!, this.debuggerProcess.stdin!);
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
    exec(`ps h -o tty -p ${pid}|tail -n 1`, (error, stdout, stderr) => {
      if (!error) {
        tty = '/dev/' + stdout;
      }
      this.executeCommand(`inferior-tty-set ${tty}`);
    });

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

}