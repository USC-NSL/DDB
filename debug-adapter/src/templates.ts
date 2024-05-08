import { DebugProtocol } from "vscode-debugprotocol/lib/debugProtocol";
import { MINode } from "./miParser";

export interface Breakpoint {
  file: string;
  line: number;
  condition?: string;

}

export class VariableObject {
  name: string;
  exp: string;
  numchild: number;
  type: string;
  value: string;
  threadId: string;
  frozen: boolean;
  dynamic: boolean;
  displayhint: string;
  hasMore: boolean;
  id: number;
  constructor(node: any) {
    this.name = MINode.valueOf(node, "name");
    this.exp = MINode.valueOf(node, "exp");
    this.numchild = parseInt(MINode.valueOf(node, "numchild"));
    this.type = MINode.valueOf(node, "type");
    this.value = MINode.valueOf(node, "value");
    this.threadId = MINode.valueOf(node, "thread-id");
    this.frozen = !!MINode.valueOf(node, "frozen");
    this.dynamic = !!MINode.valueOf(node, "dynamic");
    this.displayhint = MINode.valueOf(node, "displayhint");
    // TODO: use has_more when it's > 0
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
      name: this.exp,
      evaluateName: this.name,
      value: (this.value === void 0) ? "<unknown>" : this.value,
      type: this.type,
      variablesReference: this.id
    };
    return res;
  }
}

export class ExtendedVariable {
	constructor(public name: string, public options: { "arg": any }) {
	}
}