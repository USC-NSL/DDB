import { MINode } from "./mi_parse";
import { DebugProtocol } from "vscode-debugprotocol/lib/debugProtocol";

export type ValuesFormattingMode = "disabled" | "parseText" | "prettyPrinters";

export interface Breakpoint {
	id?:number;
	file?: string;
	line?: number;
	raw?: string;
	condition: string;
	countCondition?: string;
	logMessage?: string;
	sessionIds?: string[];
	allSessions?: boolean;
	hitCondition?: string;
	verified?: boolean;
}
export interface SingleBreakpoint {
	id?:number;
	file?: string;
	line?: number;
	raw?: string;
	condition: string;
	countCondition?: string;
	logMessage?: string;
	hitCondition?: string;
	verified?: boolean;
	sessionId?: string;
}
export interface Thread {
	id: number;
	targetId: string;
	name?: string;
}

export interface Stack {
	level: number;
	address: string;
	function: string;
	fileName: string;
	file: string;
	line: number;
	session:number
	thread:number
}

export interface Variable {
	name: string;
	valueStr: string;
	type: string;
	raw?: any;
}

export interface RegisterValue {
	index: number;
	value: string;
}

export interface SSHArguments {
	forwardX11: boolean;
	host: string;
	keyfile: string;
	password: string;
	useAgent: boolean;
	cwd: string;
	port: number;
	user: string;
	remotex11screen: number;
	x11port: number;
	x11host: string;
	bootstrap: string;
	sourceFileMap: { [index: string]: string };
}

export interface IBackend {
	load(cwd: string, target: string, procArgs: string, separateConsole: string, autorun: string[]): Thenable<any>;
	ssh(args: SSHArguments, cwd: string, target: string, procArgs: string, separateConsole: string, attach: boolean, autorun: string[]): Thenable<any>;
	attach(cwd: string, executable: string, target: string, autorun: string[]): Thenable<any>;
	connect(cwd: string, executable: string, target: string, autorun: string[]): Thenable<any>;
	start(runToStart: boolean): Thenable<boolean>;
	stop(): void;
	detach(): void;
	interrupt(): Thenable<boolean>;
	continue(): Thenable<boolean>;
	next(thread: number): Thenable<boolean>;
	step(thread: number): Thenable<boolean>;
	stepOut(thread: number): Thenable<boolean>;
	loadBreakPoints(breakpoints: Breakpoint[]): Thenable<[boolean, Breakpoint][]>;
	addBreakPoint(breakpoint: Breakpoint): Thenable<Breakpoint>;
	removeBreakPoint(breakpoint: Breakpoint): Thenable<boolean>;
	clearBreakPoints(source?: string): Thenable<any>;
	getThreads(): Thenable<Thread[]>;
	getStack(startFrame: number, maxLevels: number, thread: number): Thenable<Stack[]>;
	getStackVariables(thread: number, frame: number): Thenable<Variable[]>;
	evalExpression(name: string, thread: number, frame: number): Thenable<any>;
	isReady(): boolean;
	changeVariable(name: string, rawValue: string): Thenable<any>;
	examineMemory(from: number, to: number): Thenable<any>;
}

export class VariableObject {
	name: string;
	nameToDisplay: string;
	exp: string;
	numchild: number;
	type: string;
	value: string;
	threadId: number;
	frozen: boolean;
	dynamic: boolean;
	displayhint: string;
	hasMore: boolean;
	id: number;

	constructor(node: any, threadId?: number, parent?: VariableObject) {
		this.name = MINode.valueOf(node, "name");
		this.nameToDisplay = MINode.valueOf(node, "exp"); 
		const self_exp = MINode.valueOf(node, "exp");
		if (parent) {
			if (parent.type.endsWith("**") || parent.type.endsWith("[]") || parent.displayhint === "array") {
				this.exp = `${parent.exp}[0]`;	// for arrays, we default to [0] to avoid invalid index in the expression
				// Extract the index from self_exp, which should be in the format of a number if it's an array element
				const indexMatch = self_exp.match(/^\[?(\d+)\]?$/);
				if (indexMatch) {
					// If self_exp is an index, use that index in the parent's expression
					this.exp = `${parent.exp}[${indexMatch[1]}]`;
				} 
			} else if (parent.type.endsWith("*")) {
				// for pointers, use the parent->exp
	 			this.exp = `${parent.exp}->${self_exp}`
			}
			else if (parent.displayhint === "map") {
				// for maps, use the parent.exp as the base for the key
				this.exp = `${parent.exp}[${self_exp}]`;
			}
			else {
				// otherwise, just append the name to the parent's exp
				this.exp = `${parent.exp}.${self_exp}`;
			}
		} else {
			// for top level variables, just use the exp as is
			this.exp = self_exp;
		}
		this.numchild = parseInt(MINode.valueOf(node, "numchild"));
		this.type = MINode.valueOf(node, "type");
		this.value = MINode.valueOf(node, "value");
		this.threadId = threadId ? threadId : parseInt(MINode.valueOf(node, "thread-id"));
		this.frozen = !!MINode.valueOf(node, "frozen");
		this.dynamic = !!MINode.valueOf(node, "dynamic");
		this.displayhint = MINode.valueOf(node, "displayhint");
		this.hasMore = !!MINode.valueOf(node, "has_more");
	  }

	public applyChanges(node: MINode) {
		this.value = MINode.valueOf(node, "value");
		if (MINode.valueOf(node, "type_changed")) {
			this.type = MINode.valueOf(node, "new_type");
		}
		this.dynamic = !!MINode.valueOf(node, "dynamic");
		this.displayhint = MINode.valueOf(node, "displayhint");
		this.hasMore = !!MINode.valueOf(node, "has_more");
	}

	public isCompound(): boolean {
		return this.numchild > 0 ||
			this.value === "{...}" ||
			(this.dynamic && (this.displayhint === "array" || this.displayhint === "map"));
	}

	public toProtocolVariable(): DebugProtocol.Variable {
		const res: DebugProtocol.Variable = {
			name: this.nameToDisplay,
			evaluateName: this.exp,
			value: (this.value === void 0) ? "<unknown>" : this.value,
			type: this.type,
			variablesReference: this.id
		};
		return res;
	}
}

// from https://gist.github.com/justmoon/15511f92e5216fa2624b#gistcomment-1928632
export interface MIError extends Error {
	readonly name: string;
	readonly message: string;
	readonly source: string;
}
export interface MIErrorConstructor {
	new(message: string, source: string): MIError;
	readonly prototype: MIError;
}

export const MIError: MIErrorConstructor = class MIError {
	private readonly _message: string;
	private readonly _source: string;
	public constructor(message: string, source: string) {
		this._message = message;
		this._source = source;
		Error.captureStackTrace(this, this.constructor);
	}

	get name() { return this.constructor.name; }
	get message() { return this._message; }
	get source() { return this._source; }

	public toString() {
		return `${this.message} (from ${this._source})`;
	}
};
Object.setPrototypeOf(MIError as any, Object.create(Error.prototype));
MIError.prototype.constructor = MIError;
