/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/*
 * extension.ts (and activateMockDebug.ts) forms the "plugin" that plugs into VS Code and contains the code that
 * connects VS Code with the debug adapter.
 * 
 * extension.ts contains code for launching the debug adapter in three different ways:
 * - as an external program communicating with VS Code via stdin/stdout,
 * - as a server process communicating with VS Code via sockets or named pipes, or
 * - as inlined code running in the extension itself (default).
 * 
 * Since the code in extension.ts uses node.js APIs it cannot run in the browser.
 */

'use strict';
import * as vscode from 'vscode';
import * as util from './util';
import { logger } from '@vscode/debugadapter';
import { LogLevel } from '@vscode/debugadapter/lib/logger';
import { activateDistDebug } from './activateDistDebug';

/*
 * The compile time flag 'runMode' controls how the debug adapter is run.
 * Please note: the test suite only supports 'external' mode.
 */
const runMode: 'inline' = 'inline';
console.log("runMode:::: ", runMode);

export function activate(context: vscode.ExtensionContext) {

  const outputChannel = vscode.window.createOutputChannel('Distributed Debugger');
  logger.init((e) => outputChannel.appendLine(e.body.output), undefined, true);
  logger.setup(LogLevel.Log);
  util.setExtensionContext(context);
  activateDistDebug(context);
}

export function deactivate() {
	// nothing to do
}

