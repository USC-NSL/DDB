/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/*
 * mockDebug.ts implements the Debug Adapter that "adapts" or translates the Debug Adapter Protocol (DAP) used by the client (e.g. VS Code)
 * When implementing your own debugger extension for VS Code, most of the work will go into the Debug Adapter.
 * Since the Debug Adapter is independent from VS Code, it can be used in any client (IDE) supporting the Debug Adapter Protocol.
 */

import {
  DebugSession, logger, TerminatedEvent, StoppedEvent,
  InitializedEvent, BreakpointEvent, OutputEvent,
  ProgressStartEvent, ProgressUpdateEvent, ProgressEndEvent, InvalidatedEvent,
  Thread, StackFrame, Scope, Source, Handles, Breakpoint, MemoryEvent
} from '@vscode/debugadapter';
import * as vscode from "vscode"
import { DebugProtocol } from '@vscode/debugprotocol';
import * as iconv from 'iconv-lite';
import { TerminalEscape, TE_Style } from "./terminalEscape";
import * as dbg from './dbgmits';
import * as path from 'path';
import { DDBSession, DDBSessionImpl } from './DDBSession';
import { ILaunchRequestArguments, IAttachRequestArguments } from "./arguements"
import { Subject } from 'await-notify';


enum EMsgType {
  info,	//black
  error,
  alert,
  info2,
  info3,
}

const EVENT_CONFIG_DOWN = 'configdown';

export class DistDebug extends DebugSession {
  private _variableHandles = new Handles<string>();
  private _locals: { frame?: dbg.IStackFrameInfo, vars: dbg.IVariableInfo[], watch: dbg.IWatchInfo[] } = { frame: null, vars: [], watch: [] };

  private ddbServer!: DDBSession;
  private _isRunning: boolean = false;
  private _isAttached = false;
  private _breakPoints = new Map<string, DebugProtocol.Breakpoint[]>();
  private _watchs: Map<string, dbg.IWatchInfo> = new Map();
  private _currentFrameLevel = 0;
  private _currentThreadId?: dbg.IThreadInfo;

  //current language  of debugged program
  private language!: string;

  //default charset 
  private defaultStringCharset?: string;

  private _configurationDone = new Subject();

  private _cancellationTokens = new Map<number, boolean>();

  private _reportProgress = false;
  private _progressId = 10000;
  private _cancelledProgressId: string | undefined = undefined;
  private _isProgressCancellable = true;

  private _valuesInHex = false;
  private _useInvalidatedEvent = false;
  private varUpperCase: boolean = false;

  private _addressesInHex = true;

  private printToDebugConsole(msg: string, itype: EMsgType = EMsgType.info) {
    let style = [TE_Style.Blue];

    switch (itype) {
      case EMsgType.error:
        style = [TE_Style.Red];
        break;
      case EMsgType.info2:
        style = [TE_Style.Blue];
      case EMsgType.alert:
        style = [TE_Style.Yellow];
      default:
        break;
    }
    this.sendEvent(new OutputEvent(TerminalEscape.apply({ msg: msg, style: style })));
  }

  private waitForConfingureDone(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this._configurationDone) {
        resolve();
      } else {
        this.once(EVENT_CONFIG_DOWN, () => {
          resolve();
        });
        if (this._configurationDone) {
          resolve();
        }
      }
    });
  }

  private initDebugSession() {
    console.log('DDB started');
    this.ddbServer = new DDBSessionImpl();

    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);

    this.ddbServer.on(dbg.EVENT_SIGNAL_RECEIVED, (event: dbg.ISignalReceivedEvent) => {
      logger.log(event.reason.toString());
    })
    this.ddbServer.on(dbg.EVENT_DBG_CONSOLE_OUTPUT, (out: string) => {
      this.printToDebugConsole(out);
    });
    this.ddbServer.on(dbg.EVENT_TARGET_RUNNING, (out) => {
      this._isRunning = true;
      logger.log(out);
    });

    this.ddbServer.on(dbg.EVENT_TARGET_STOPPED, (e: dbg.ITargetStoppedEvent) => {
      logger.log("stoped:" + e.reason.toString());
      this._isRunning = false;
      this._variableHandles.reset();


      switch (e.reason) {

        /** A breakpoint was hit. */
        case dbg.TargetStopReason.BreakpointHit:
        /** A step instruction finished. */
        case dbg.TargetStopReason.EndSteppingRange:
        /** A step-out instruction finished. */
        case dbg.TargetStopReason.FunctionFinished:
        /** The target was signalled. */
        case dbg.TargetStopReason.SignalReceived:
        /** The target encountered an exception (this is LLDB specific). */
        case dbg.TargetStopReason.ExceptionReceived:
          break;



        /** An inferior terminated because it received a signal. */
        case dbg.TargetStopReason.ExitedSignalled:
        /** An inferior terminated (for some reason, check exitCode for clues). */
        case dbg.TargetStopReason.Exited:
        /** The target finished executing and terminated normally. */
        case dbg.TargetStopReason.ExitedNormally:
          this.sendEvent(new TerminatedEvent(false));
          break;

        /** Catch-all for any of the other numerous reasons. */
        case dbg.TargetStopReason.Unrecognized:
        default:
          this.sendEvent(new StoppedEvent('Unrecognized', e.threadId));
      }

    });

    //'step', 'breakpoint', 'exception', 'pause', 'entry', 'goto', 'function breakpoint', 'data breakpoint', 'instruction breakpoint'
    this.ddbServer.on(dbg.EVENT_BREAKPOINT_HIT, (e: dbg.IBreakpointHitEvent) => {
      console.log("\n\n\n\t\t\tBreakpoint hit on thread:", e.threadId);
      this.sendEvent(new StoppedEvent('breakpoint', e.threadId));
    });
    this.ddbServer.on(dbg.EVENT_STEP_FINISHED, (e: dbg.IStepFinishedEvent) => {
      this.sendEvent(new StoppedEvent('step', e.threadId));
    });
    this.ddbServer.on(dbg.EVENT_FUNCTION_FINISHED, (e: dbg.IStepOutFinishedEvent) => {
      this.sendEvent(new StoppedEvent('function breakpoint', e.threadId));
    });
    this.ddbServer.on(dbg.EVENT_SIGNAL_RECEIVED, (e: dbg.ISignalReceivedEvent) => {
      logger.log('signal_receive:' + e.signalCode);
      let event = new StoppedEvent('signal', e.threadId, e.signalMeaning);
      event.body['text'] = e.signalMeaning;
      event.body['description'] = e.signalMeaning;
      this.sendEvent(event);
    });
    this.ddbServer.on(dbg.EVENT_EXCEPTION_RECEIVED, (e: dbg.IExceptionReceivedEvent) => {
      this.sendEvent(new StoppedEvent('exception', e.threadId, e.exception));
    });
  }

  /**
   * Creates a new debug adapter that is used for one debug session.
   * We configure the default implementation of a debug adapter here.
   */
  public constructor() {
    super(true);
  }

  /**
   * The 'initialize' request is the first request called by the frontend
   * to interrogate the features the debug adapter provides.
   */
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {

    if (args.supportsProgressReporting) {
      this._reportProgress = true;
    }
    if (args.supportsInvalidatedEvent) {
      this._useInvalidatedEvent = true;
    }

    // build and return the capabilities of this debug adapter:
    response.body = response.body || {};

    // the adapter implements the configurationDone request.
    response.body.supportsConfigurationDoneRequest = true;

    // make VS Code use 'evaluate' when hovering over source
    response.body.supportsEvaluateForHovers = true;

    // make VS Code show a 'step back' button
    response.body.supportsStepBack = true;

    // make VS Code support data breakpoints
    response.body.supportsDataBreakpoints = true;

    // make VS Code support completion in REPL
    response.body.supportsCompletionsRequest = true;
    response.body.completionTriggerCharacters = [".", "["];

    // make VS Code send cancel request
    response.body.supportsCancelRequest = true;

    // make VS Code send the breakpointLocations request
    response.body.supportsBreakpointLocationsRequest = true;

    // make VS Code provide "Step in Target" functionality
    response.body.supportsStepInTargetsRequest = true;

    // the adapter defines two exceptions filters, one with support for conditions.
    response.body.supportsExceptionFilterOptions = true;
    response.body.exceptionBreakpointFilters = [
      {
        filter: 'namedException',
        label: "Named Exception",
        description: `Break on named exceptions. Enter the exception's name as the Condition.`,
        default: false,
        supportsCondition: true,
        conditionDescription: `Enter the exception's name`
      },
      {
        filter: 'otherExceptions',
        label: "Other Exceptions",
        description: 'This is a other exception',
        default: true,
        supportsCondition: false
      }
    ];

    // make VS Code send exceptionInfo request
    response.body.supportsExceptionInfoRequest = true;

    // make VS Code send setVariable request
    response.body.supportsSetVariable = true;

    // make VS Code send setExpression request
    response.body.supportsSetExpression = true;

    // make VS Code send disassemble request
    response.body.supportsDisassembleRequest = true;
    response.body.supportsSteppingGranularity = true;
    response.body.supportsInstructionBreakpoints = true;

    // make VS Code able to read and write variable memory
    response.body.supportsReadMemoryRequest = true;
    response.body.supportsWriteMemoryRequest = true;

    response.body.supportSuspendDebuggee = true;
    response.body.supportTerminateDebuggee = true;
    response.body.supportsFunctionBreakpoints = true;
    response.body.supportsDelayedStackTraceLoading = true;

    this.sendResponse(response);

    // since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
    // we request them early by sending an 'initializeRequest' to the frontend.
    // The frontend will end the configuration sequence by calling 'configurationDone' request.
    this.sendEvent(new InitializedEvent());
  }

  /**
   * Called at the end of the configuration sequence.
   * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
   */
  protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
    super.configurationDoneRequest(response, args);

    // notify the launchRequest that configuration has finished
    this._configurationDone.notify();
  }

  protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request) {
    console.log(`disconnectRequest suspend: ${args.suspendDebuggee}, terminate: ${args.terminateDebuggee}`);
    try {
      if (this._isRunning) {
        await this.ddbServer.pause();
      }
      if (this._isAttached) {
        await this.ddbServer.executeCommand('target-detach');
        await this.ddbServer.ddbexit();
      }
      else {
        // force exit
        await this.ddbServer.ddbexit();
      }
    }
    catch (err) {
      await this.ddbServer.kill();
    }
    this.sendResponse(response);

  }

  protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
    console.log("--- Resuming all threads (Resume execution -exec-run) ---", args); // supported
    this.ddbServer.resumeAllThreads();
    this.sendResponse(response);
  }

  protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): void {
    console.log("--- Next (Step Over Function Calls -exec-next -- right arrow) ---"); // supported
    console.log('nextRequest', args);
    this.ddbServer.stepOverLine();
    this.sendResponse(response);
  }

  protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): void {
    console.log("--- StepIn (Step Into Function Calls -exec-step -- down arrow) ---");
    this.ddbServer.stepIntoLine();
    this.sendResponse(response);
  }

  protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): void {
    console.log("--- StepOut (Step Out of Function Calls -exec-finish -- up arrow) ---"); 
    this.ddbServer.stepOut();
    this.sendResponse(response);
  }

  protected stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments, request?: DebugProtocol.Request): void {
    console.log("--- StepBack (Step back in time -exec-next --reverse -- left arrow) ---");
    this.ddbServer.stepOverLine({ reverse: true })
      .catch(e => {
        if (e.name == "CommandFailedError") {
          this.printToDebugConsole(e.message, EMsgType.error);
        }
        else 
          console.error(e);
      });
    this.sendResponse(response);
  }

  protected async attachRequest(response: DebugProtocol.AttachResponse, args: IAttachRequestArguments) {
    return this.launchRequest(response, args);
  }

  protected async launchRequest(response: DebugProtocol.LaunchResponse, _args: DebugProtocol.LaunchRequestArguments) {
    console.log("org args:", _args);
    const args = _args as ILaunchRequestArguments;
    this.initDebugSession();
    // vscode.commands.executeCommand('workbench.panel.repl.view.focus');
    this.defaultStringCharset = args.defaultStringCharset;
    if (args.language) {
      this.language = args.language;
    } else {
      this.language = 'auto';
    }

    // make sure to 'Stop' the buffered logging if 'trace' is not set
    // wait until configuration has finished (and configurationDoneRequest has been called)
    try {
      args.cwd = "";
      await this.ddbServer.startDDB(args);
      console.log("Started DDB");
      await this.waitForConfingureDone();
      console.log("Configuration done");
      //must wait for configure done. It will get error args without this.
      //await this._startDone.wait(2000);
      await this.ddbServer.waitForStart();
      console.log("DDB start confirmed");
    } catch (error) {
      console.log("Caught error while launching debugger:", error);
      this.sendEvent(new TerminatedEvent(false));
      this.sendErrorResponse(response, 500);
    }

    if (args.cwd) {
      await this.ddbServer.environmentCd(args.cwd);
    }
    this.varUpperCase = args.varUpperCase;
    if (args.commandsBeforeExec) {
      for (const cmd of args.commandsBeforeExec) {
        await this.ddbServer.execNativeCommand(cmd)
          .catch((e) => {
            this.printToDebugConsole(e.message, EMsgType.error);
          });
      }
    }

    // // WE DONT SET EXECUTABLE FILE HERE. WE SET IT IN THE CONFIG FILE. THIS IS JUST TO OPEN IT IN THE VS CODE
    // // start the program 
    let ret = await this.ddbServer.setExecutableFile(args.program)
      .catch((e) => {

        vscode.window.showErrorMessage("Failed to start the debugger." + e.message);
        this.sendEvent(new TerminatedEvent(false));
        this.printToDebugConsole(e.message, EMsgType.error);
        return 1;
      }) as number;
    console.log("Done setting executable");

    if (ret > 0) {
      return;
    }
    //set programArgs
    if (args.programArgs) {
      await this.ddbServer.setInferiorArguments(args.programArgs);
    }

    // lang will be cpp or go
    // if (this.language == "auto") {
    //   let checklang = (out: string) => {
    //     if (out.indexOf('language') > 0) {
    //       let m = out.match('currently (.*)?"');
    //       if (m !== null) {
    //         this.language = m[1];
    //       }
    //       this.ddbServer.off(dbg.EVENT_DBG_CONSOLE_OUTPUT, checklang);
    //     }
    //   };
    //   this.ddbServer.on(dbg.EVENT_DBG_CONSOLE_OUTPUT, checklang);
    //   await this.ddbServer.execNativeCommand('show language');


    // }
    console.log("Starting all inferiors");
    await this.ddbServer.startAllInferiors(args.stopAtEntry)
      .catch((e) => {
        this.printToDebugConsole(e.message, EMsgType.error);
        vscode.window.showErrorMessage("Failed to start the debugger." + e.message);
        this.sendEvent(new TerminatedEvent(false));
      });
    this.sendResponse(response);

  }

  protected setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request): void {
    this.sendResponse(response);
  }

  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
    // called by vscode when the user tries to set a breakpoint
    console.log("VSCode requested breakpoints");

    // confirm that the ddb is running
    await this.ddbServer.waitForStart();

    let isPause = false;
    if (this._isRunning) {
      await this.ddbServer.pause();
      isPause = true;
    }

    let srcpath = args.source.path as string;
    srcpath = path.normalize(srcpath);

    if (this._breakPoints.has(srcpath)) {
      // since this works as a toggle, breakpoint is removed if it is already set
      let bps: number[] = [];

      const breakpoints = this._breakPoints.get(srcpath);
      if (breakpoints) {
        breakpoints.forEach(el => {
          if (el && el.id) {
            bps.push(el.id);
          }
        });
      }
      this._breakPoints.set(srcpath, []);
      this.ddbServer.removeBreakpoints(bps);

    }

    const clientLines = args.breakpoints || [];
    const actualBreakpoints = await Promise.all(clientLines.map(async l => {
      console.log("Adding breakpoint----")
      let bk = await this.ddbServer.addBreakpoint(srcpath + ":" + this.convertClientLineToDebugger(l.line), {
        isPending: true,
        condition: l.condition
      });
      //console.log(bk);
      const bp = new Breakpoint(false, this.convertDebuggerLineToClient(l.line)) as DebugProtocol.Breakpoint;
      bp.source = args.source;
      bp.verified = true;
      bp.id = bk.id;
      return bp;
    })).then(res => {
      console.log("All promises resolved");
      return res;
    });
    this._breakPoints.set(srcpath, actualBreakpoints);
    console.log("::::::::isPause:", isPause);
    if (isPause)
      this.ddbServer.resumeAllThreads();
    else {
      // start all inferiors
      console.log("Starting all inferiors after setting all breakpoints");
      await this.ddbServer.startAllInferiors()
        .catch((e) => {
          this.printToDebugConsole(e.message, EMsgType.error);
          vscode.window.showErrorMessage("Failed to start the debugger." + e.message);
          this.sendEvent(new TerminatedEvent(false));
        });
    }

    response.body = {
      breakpoints: actualBreakpoints
    };
    this.sendResponse(response);
  }

  protected breakpointLocationsRequest(response: DebugProtocol.BreakpointLocationsResponse, args: DebugProtocol.BreakpointLocationsArguments, request?: DebugProtocol.Request): void {
    // %IMPLEMENT
    response.body = { breakpoints: [] };
    this.sendResponse(response);
  }

  protected exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments) {
    response.body = {
      exceptionId: 'Exception ID',
      description: 'This is a descriptive description of the exception.',
      breakMode: 'always',
      details: {
        message: 'Message contained in the exception.',
        typeName: 'Short type name of the exception object',
        stackTrace: 'stack frame 1\nstack frame 2',
      }
    };
    this.sendResponse(response);
  }

  protected async threadsRequest(response: DebugProtocol.ThreadsResponse): Promise<void> {
    console.log("Threads requested by vscode");
    let threads: Thread[] = [];
    let threadList = await this.ddbServer.getThreads();
    console.log("Thread list:", threadList);

    this._currentThreadId = threadList.current;
    let idtype = 0;
    if (threadList.current) {
      if (threadList.current.targetId.startsWith('LWP')) {
        idtype = 1;
      } else if (threadList.current.targetId.startsWith('Thread')) {
        idtype = 2;
      }
    }
    threadList.all.forEach((th) => {
      console.log(`current thread: ${th.targetId}`);
      if (idtype == 1) {
        let ids = th.targetId.split(' ');
        let tid = Number.parseInt(ids[1]);
        threads.push(new Thread(th.id, `Thread #${tid}`));
      }
      else if (idtype == 2) {
        let ids = th.targetId.split('.');
        let tid = Number.parseInt(ids[1]);
        threads.push(new Thread(th.id, `Thread #${th.id} ${th.name ? th.name : ''}`));
      }
      else
        threads.push(new Thread(th.id, th.targetId));


    });
    response.body = {
      threads: threads
    };
    this.sendResponse(response);

  }

  protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): Promise<void> {
    console.log("Stack trace requested by vscode", args.startFrame, args.levels);
    const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
    const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
    const endFrame = startFrame + maxLevels;
    const frames = await this.ddbServer.getStackFrames({ lowFrame: startFrame, highFrame: endFrame });

    //remove watchs 
    for (const watch of this._watchs) {
      await this.ddbServer.removeWatch(watch[1].id).catch(() => { });;
    }
    this._watchs.clear();

    response.body = {
      stackFrames: frames.map(f => {
        return new StackFrame(f.level, f.func, f.filename ? new Source(f.filename!, f.fullname) : null, this.convertDebuggerLineToClient(f.line!));
      }),
      totalFrames: frames.length
    };
    this.sendResponse(response);
  }

  protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
    console.log("\n\n\n\t\tScopes requested by vscode::", args.frameId);
    this._currentFrameLevel = args.frameId;
    response.body = {
      scopes: [
        {
          name: "Locals",
          presentationHint: "locals",
          variablesReference: this._variableHandles.create("locals::"),
          expensive: false
        },
      ]
    };
    this.sendResponse(response);
  }

  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request) {
    console.log("--- Variables requested by vscode ---", this._variableHandles);
    const variables: DebugProtocol.Variable[] = [];

    const id = this._variableHandles.get(args.variablesReference);

    console.log("varible request id:", id);
    if (id === 'locals::') {
      for (const w of this._locals.watch) {
        await this.ddbServer.removeWatch(w.id).catch(() => { });
      }
      this._locals.watch = [];

      const vals = await this.ddbServer.getStackFrameVariables(dbg.VariableDetailLevel.Simple, {
        frameLevel: this._currentFrameLevel,
        threadId: this._currentThreadId?.id
      });

      this._locals.vars = vals.args.concat(vals.locals);

      for (const v of this._locals.vars) {

        const c = await this.ddbServer.addWatch(v.name, {
          frameLevel: this._currentFrameLevel,
          threadId: this._currentThreadId?.id
        })
          .catch();

        console.log("Watcher returned:", c);

        if (!c) {
          continue;
        }

        this._locals.watch.push(c);

        let vid = 0;
        if (c.childCount > 0) {
          vid = this._variableHandles.create(c.id);
        }
        variables.push({
          name: v.name,
          type: c.expressionType,
          value: this.decodeString(c.value, c.expressionType),
          variablesReference: vid
        });

      }

    } else {

      if (id.startsWith('**FLIST**')) {  //pascal TStringList
        let vid = id.replace('**FLIST**', '');
        let strs = vid.split(':');
        let cnt = strs[strs.length - 1];

        for (var i = 0; i < Number.parseInt(cnt); i++) {
          let exp = strs[0] + '.FLIST^[' + i + ']';
          let val = await this.ddbServer.evaluateExpression(exp);
          let m = val.match(/'(.*?)'/);
          if (m != null) {
            val = m[1];
          }
          if (i > 100) {
            variables.push({
              name: '[.]',
              type: 'string',
              value: '...',
              variablesReference: 0
            });
            break;
          } else {
            variables.push({
              name: '[' + i + ']',
              type: 'string',
              value: this.decodeString(val, 'ANSISTRING'),
              variablesReference: 0
            });
          }

        }

        //let s=await	this.dbgSession.evaluateExpression(id.replace('**items**',''));
      } else {
        let childs = await this.ddbServer.getWatchChildren(id, { detail: dbg.VariableDetailLevel.All }).catch((e) => {
          return [];
        });
        for (const c of childs) {
          let vid = 0;

          if (c.childCount > 0) {
            vid = this._variableHandles.create(c.id);
          }

          variables.push({
            name: c.expression,
            type: c.expressionType,
            value: this.decodeString(c.value, c.expressionType),
            variablesReference: vid
          });

        }
      }

    }

    response.body = {
      variables: variables
    };
    console.log("Final variables as:", variables);
    this.sendResponse(response);
  }

  private decodeString(value?: string, expressionType?: string): string {

    if (expressionType === undefined) {
      return '';
    }

    console.log("Decoding string with current language as:", this.language, expressionType);
    if (this.defaultStringCharset) {
      if (expressionType.endsWith('char *')) {
        let val = value;

        val = val.replace(/\\(\d+)/g, (s, args) => {
          let num = parseInt(args, 8);
          return String.fromCharCode(num);
        });
        if (val.endsWith("'")) {
          val = val.substring(0, val.length - 1);
        }

        let bf = val.split('').map((e) => { return e.charCodeAt(0); });

        return iconv.decode(Buffer.from(bf), this.defaultStringCharset);
      }
    }
    return value;

  }

  protected dataBreakpointInfoRequest(response: DebugProtocol.DataBreakpointInfoResponse, args: DebugProtocol.DataBreakpointInfoArguments): void {

    response.body = {
      dataId: null,
      description: "cannot break on data access",
      accessTypes: undefined,
      canPersist: false
    };

    if (args.variablesReference && args.name) {
      const v = this._variableHandles.get(args.variablesReference);
      if (v === 'globals') {
        response.body.dataId = args.name;
        response.body.description = args.name;
        response.body.accessTypes = ["write"];
        response.body.canPersist = true;
      } else {
        response.body.dataId = args.name;
        response.body.description = args.name;
        response.body.accessTypes = ["read", "write", "readWrite"];
        response.body.canPersist = true;
      }
    }

    this.sendResponse(response);
  }

  protected completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments): void {

    response.body = {
      targets: [
        {
          label: "item 10",
          sortText: "10"
        },
        {
          label: "item 1",
          sortText: "01",
          detail: "detail 1"
        },
        {
          label: "item 2",
          sortText: "02",
          detail: "detail 2"
        },
        {
          label: "array[]",
          selectionStart: 6,
          sortText: "03"
        },
        {
          label: "func(arg)",
          selectionStart: 5,
          selectionLength: 3,
          sortText: "04"
        }
      ]
    };
    this.sendResponse(response);
  }

  protected cancelRequest(response: DebugProtocol.CancelResponse, args: DebugProtocol.CancelArguments) {
    if (args.requestId) {
      this._cancellationTokens.set(args.requestId, true);
    }
    if (args.progressId) {
      this._cancelledProgressId = args.progressId;
    }
  }

  protected customRequest(command: string, response: DebugProtocol.Response, args: any) {
    if (command === 'toggleFormatting') {
      this._valuesInHex = !this._valuesInHex;
      if (this._useInvalidatedEvent) {
        this.sendEvent(new InvalidatedEvent(['variables']));
      }
      this.sendResponse(response);
    } else {
      super.customRequest(command, response, args);
    }
  }

}

