import * as assert from 'assert';
import { parseMI, MINode } from '../../backend/mi_parse';









// suite("MI Parse", () => {
// 	test("Very simple out of band record", () => {
// 		const parsed = parseMI(`*stopped`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, undefined);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 1);
// 		assert.strictEqual(parsed.outOfBandRecord[0].isStream, false);
// 		assert.strictEqual(parsed.outOfBandRecord[0].asyncClass, "stopped");
// 		assert.strictEqual(parsed.outOfBandRecord[0].output.length, 0);
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 	});
// 	test("Simple out of band record", () => {
// 		const parsed = parseMI(`4=thread-exited,id="3",group-id="i1"`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, 4);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 1);
// 		assert.strictEqual(parsed.outOfBandRecord[0].isStream, false);
// 		assert.strictEqual(parsed.outOfBandRecord[0].asyncClass, "thread-exited");
// 		assert.strictEqual(parsed.outOfBandRecord[0].output.length, 2);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[0], ["id", "3"]);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[1], ["group-id", "i1"]);
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 	});
// 	test("Console stream output with new line", () => {
// 		const parsed = parseMI(`~"[Thread 0x7fffe993a700 (LWP 11002) exited]\\n"`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, undefined);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 1);
// 		assert.strictEqual(parsed.outOfBandRecord[0].isStream, true);
// 		assert.strictEqual(parsed.outOfBandRecord[0].content, "[Thread 0x7fffe993a700 (LWP 11002) exited]\n");
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 	});
// 	test("Unicode", () => {
// 		let parsed = parseMI(`~"[Depuraci\\303\\263n de hilo usando libthread_db enabled]\\n"`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, undefined);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 1);
// 		assert.strictEqual(parsed.outOfBandRecord[0].isStream, true);
// 		assert.strictEqual(parsed.outOfBandRecord[0].content, "[Depuración de hilo usando libthread_db enabled]\n");
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 		parsed = parseMI(`~"4\\t  std::cout << \\"\\345\\245\\275\\345\\245\\275\\345\\255\\246\\344\\271\\240\\357\\274\\214\\345\\244\\251\\345\\244\\251\\345\\220\\221\\344\\270\\212\\" << std::endl;\\n"`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, undefined);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 1);
// 		assert.strictEqual(parsed.outOfBandRecord[0].isStream, true);
// 		assert.strictEqual(parsed.outOfBandRecord[0].content, `4\t  std::cout << "好好学习，天天向上" << std::endl;\n`);
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 	});
// 	test("Empty line", () => {
// 		const parsed = parseMI(``);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, undefined);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 0);
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 	});
// 	test("'(gdb)' line", () => {
// 		const parsed = parseMI(`(gdb)`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, undefined);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 0);
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 	});
// 	test("Simple result record", () => {
// 		const parsed = parseMI(`1^running`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, 1);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 0);
// 		assert.notStrictEqual(parsed.resultRecords, undefined);
// 		assert.strictEqual(parsed.resultRecords.resultClass, "running");
// 		assert.strictEqual(parsed.resultRecords.results.length, 0);
// 	});
// 	test("Advanced out of band record (Breakpoint hit)", () => {
// 		const parsed = parseMI(`*stopped,reason="breakpoint-hit",disp="keep",bkptno="1",frame={addr="0x00000000004e807f",func="D main",args=[{name="args",value="..."}],file="source/app.d",fullname="/path/to/source/app.d",line="157"},thread-id="1",stopped-threads="all",core="0"`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, undefined);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 1);
// 		assert.strictEqual(parsed.outOfBandRecord[0].isStream, false);
// 		assert.strictEqual(parsed.outOfBandRecord[0].asyncClass, "stopped");
// 		assert.strictEqual(parsed.outOfBandRecord[0].output.length, 7);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[0], ["reason", "breakpoint-hit"]);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[1], ["disp", "keep"]);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[2], ["bkptno", "1"]);
// 		const frame = [
// 			["addr", "0x00000000004e807f"],
// 			["func", "D main"],
// 			["args", [[["name", "args"], ["value", "..."]]]],
// 			["file", "source/app.d"],
// 			["fullname", "/path/to/source/app.d"],
// 			["line", "157"]
// 		];
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[3], ["frame", frame]);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[4], ["thread-id", "1"]);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[5], ["stopped-threads", "all"]);
// 		assert.deepStrictEqual(parsed.outOfBandRecord[0].output[6], ["core", "0"]);
// 		assert.strictEqual(parsed.resultRecords, undefined);
// 	});
// 	test("Advanced result record", () => {
// 		const parsed = parseMI(`2^done,asm_insns=[src_and_asm_line={line="134",file="source/app.d",fullname="/path/to/source/app.d",line_asm_insn=[{address="0x00000000004e7da4",func-name="_Dmain",offset="0",inst="push   %rbp"},{address="0x00000000004e7da5",func-name="_Dmain",offset="1",inst="mov    %rsp,%rbp"}]}]`);
// 		assert.ok(parsed);
// 		assert.strictEqual(parsed.token, 2);
// 		assert.strictEqual(parsed.outOfBandRecord.length, 0);
// 		assert.notStrictEqual(parsed.resultRecords, undefined);
// 		assert.strictEqual(parsed.resultRecords.resultClass, "done");
// 		assert.strictEqual(parsed.resultRecords.results.length, 1);
// 		const asmInsns = [
// 			"asm_insns",
// 			[
// 				[
// 					"src_and_asm_line",
// 					[
// 						["line", "134"],
// 						["file", "source/app.d"],
// 						["fullname", "/path/to/source/app.d"],
// 						[
// 							"line_asm_insn",
// 							[
// 								[
// 									["address", "0x00000000004e7da4"],
// 									["func-name", "_Dmain"],
// 									["offset", "0"],
// 									["inst", "push   %rbp"]
// 								],
// 								[
// 									["address", "0x00000000004e7da5"],
// 									["func-name", "_Dmain"],
// 									["offset", "1"],
// 									["inst", "mov    %rsp,%rbp"]
// 								]
// 							]
// 						]
// 					]
// 				]
// 			]
// 		];
// 		assert.deepStrictEqual(parsed.resultRecords.results[0], asmInsns);
// 		assert.strictEqual(parsed.result("asm_insns.src_and_asm_line.line_asm_insn[1].address"), "0x00000000004e7da5");
// 	});
// 	test("valueof children", () => {
// 		const obj = [
// 			[
// 				"frame",
// 				[
// 					["level", "0"],
// 					["addr", "0x0000000000435f70"],
// 					["func", "D main"],
// 					["file", "source/app.d"],
// 					["fullname", "/path/to/source/app.d"],
// 					["line", "5"]
// 				]
// 			],
// 			[
// 				"frame",
// 				[
// 					["level", "1"],
// 					["addr", "0x00000000004372d3"],
// 					["func", "rt.dmain2._d_run_main()"]
// 				]
// 			],
// 			[
// 				"frame",
// 				[
// 					["level", "2"],
// 					["addr", "0x0000000000437229"],
// 					["func", "rt.dmain2._d_run_main()"]
// 				]
// 			]
// 		];

// 		assert.strictEqual(MINode.valueOf(obj[0], "@frame.level"), "0");
// 		assert.strictEqual(MINode.valueOf(obj[0], "@frame.addr"), "0x0000000000435f70");
// 		assert.strictEqual(MINode.valueOf(obj[0], "@frame.func"), "D main");
// 		assert.strictEqual(MINode.valueOf(obj[0], "@frame.file"), "source/app.d");
// 		assert.strictEqual(MINode.valueOf(obj[0], "@frame.fullname"), "/path/to/source/app.d");
// 		assert.strictEqual(MINode.valueOf(obj[0], "@frame.line"), "5");

// 		assert.strictEqual(MINode.valueOf(obj[1], "@frame.level"), "1");
// 		assert.strictEqual(MINode.valueOf(obj[1], "@frame.addr"), "0x00000000004372d3");
// 		assert.strictEqual(MINode.valueOf(obj[1], "@frame.func"), "rt.dmain2._d_run_main()");
// 		assert.strictEqual(MINode.valueOf(obj[1], "@frame.file"), undefined);
// 		assert.strictEqual(MINode.valueOf(obj[1], "@frame.fullname"), undefined);
// 		assert.strictEqual(MINode.valueOf(obj[1], "@frame.line"), undefined);
// 	});
// 	test("empty string values", () => {
// 		const parsed = parseMI(`15^done,register-names=["r0","pc","","xpsr","","control"]`);
// 		const result = parsed.result('register-names');
// 		assert.deepStrictEqual(result, ["r0", "pc", "", "xpsr", "", "control"]);
// 	});
// 	test("empty string value first and last", () => {
// 		const parsed = parseMI(`15^done,register-names=["","r0","pc","","xpsr","","control",""]`);
// 		const result = parsed.result('register-names');
// 		assert.deepStrictEqual(result, ["", "r0", "pc", "", "xpsr", "", "control", ""]);
// 	});
// 	test("empty array values", () => {
// 		const parsed = parseMI(`15^done,foo={x=[],y="y"}`);
// 		assert.deepStrictEqual(parsed.result('foo.x'), []);
// 		assert.strictEqual(parsed.result('foo.y'), "y");
// 	});
// 	test("empty object values", () => {
// 		// GDB may send {} as empty array
// 		const parsed = parseMI(`15^done,foo={x={},y="y"}`);
// 		assert.deepStrictEqual(parsed.result('foo.x'), []);
// 		assert.strictEqual(parsed.result('foo.y'), "y");
// 	});
// });

test("Stack trace response with multiple frames", () => {
    const parsed = parseMI(`17^done,stack=[{session="1",line="36",thread="1",level="0",arch="i386:x86-64",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/internal/syscall/asm_linux_amd64.s",addr="0x000000000040964e",func="runtime/internal/syscall.Syscall6",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/internal/syscall/asm_linux_amd64.s"},{file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/internal/syscall/syscall_linux.go",level="1",func="syscall.RawSyscall6",session="1",thread="1",arch="i386:x86-64",line="38",addr="0x000000000040962d",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/internal/syscall/syscall_linux.go"},{thread="1",session="1",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/syscall/syscall_linux.go",line="82",arch="i386:x86-64",addr="0x00000000004a25f5",level="2",func="syscall.Syscall",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/syscall/syscall_linux.go"},{level="3",thread="1",func="syscall.read",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/syscall/zsyscall_linux_amd64.go",arch="i386:x86-64",addr="0x000000000049fbe5",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/syscall/zsyscall_linux_amd64.go",line="721",session="1"},{session="1",func="syscall.Read",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/syscall/syscall_unix.go",addr="0x000000000049b806",level="4",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/syscall/syscall_unix.go",arch="i386:x86-64",line="181",thread="1"},{fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/internal/poll/fd_unix.go",arch="i386:x86-64",addr="0x0000000000543aeb",func="internal/poll.ignoringEINTRIO",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/internal/poll/fd_unix.go",line="736",session="1",level="5",thread="1"},{arch="i386:x86-64",session="1",thread="1",level="6",line="160",addr="0x000000000053c4f9",func="internal/poll.(*FD).Read",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/internal/poll/fd_unix.go",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/internal/poll/fd_unix.go"},{line="29",level="7",addr="0x0000000000551338",func="os.(*File).read",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/os/file_posix.go",thread="1",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/os/file_posix.go",arch="i386:x86-64",session="1"},{addr="0x000000000054e84d",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/os/file.go",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/os/file.go",func="os.(*File).Read",arch="i386:x86-64",session="1",thread="1",line="118",level="8"},{line="335",addr="0x000000000052ef48",session="1",thread="1",level="9",arch="i386:x86-64",func="io.ReadAtLeast",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/io/io.go",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/io/io.go"},{level="10",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/io/io.go",line="354",addr="0x000000000052f133",session="1",thread="1",func="io.ReadFull",arch="i386:x86-64",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/io/io.go"},{func="github.com/ServiceWeaver/weaver/runtime/protomsg.Read",file="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/runtime/protomsg/io.go",level="11",arch="i386:x86-64",line="54",fullname="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/runtime/protomsg/io.go",addr="0x0000000000add725",session="1",thread="1"},{fullname="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/internal/envelope/conn/conn.go",level="12",file="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/internal/envelope/conn/conn.go",session="1",arch="i386:x86-64",addr="0x0000000000be7565",line="72",func="github.com/ServiceWeaver/weaver/internal/envelope/conn.(*conn).recv",thread="1"},{func="github.com/ServiceWeaver/weaver/internal/envelope/conn.(*WeaveletConn).Serve",addr="0x0000000000be9219",line="124",thread="1",fullname="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/internal/envelope/conn/weavelet_conn.go",session="1",file="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/internal/envelope/conn/weavelet_conn.go",level="13",arch="i386:x86-64"},{file="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/internal/weaver/remoteweavelet.go",thread="1",line="210",fullname="/home/cc/serverweaver_exp/weavertest/serviceweavertest/weaver-0.22.0/weaver-0.22.0/internal/weaver/remoteweavelet.go",level="14",session="1",addr="0x000000000102478c",arch="i386:x86-64",func="github.com/ServiceWeaver/weaver/internal/weaver.NewRemoteWeavelet.func4"},{fullname="/home/cc/go/pkg/mod/golang.org/x/sync@v0.4.0/errgroup/errgroup.go",func="golang.org/x/sync/errgroup.(*Group).Go.func1",arch="i386:x86-64",level="15",session="1",file="/home/cc/go/pkg/mod/golang.org/x/sync@v0.4.0/errgroup/errgroup.go",line="75",addr="0x0000000000bd634c",thread="1"},{thread="1",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/asm_amd64.s",arch="i386:x86-64",func="runtime.goexit",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/asm_amd64.s",level="16",session="1",line="1650",addr="0x0000000000479941"},{thread="1",arch="i386:x86-64",func="??",level="17",session="1",addr="0x0000000000000000"}]`);

    // Basic structure checks
    assert.ok(parsed);
    assert.strictEqual(parsed.token, 17);
    assert.strictEqual(parsed.outOfBandRecord.length, 0);
    assert.ok(parsed.resultRecords);
    assert.strictEqual(parsed.resultRecords.resultClass, "done");
    
    // Get the stack array
    const stack = parsed.result("stack");
    console.log(stack);
});


test("stopped parse",()=>{
    const parsed=parseMI(`*stopped,frame={args=[],func="runtime.futex",addr="0x000000000047b7a3",fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/sys_linux_amd64.s",line="558",arch="i386:x86-64",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/sys_linux_amd64.s"},stopped-threads=["161","171","165","173","169","167","166","164","168","174","160","163","156","175","162","159","172","158","170","157"],core="5",thread-id="156",session-id="9"`)

    assert.ok(parsed);
    console.log(JSON.stringify(parsed,null,2))
    
})

test("thread-info parse",()=>{
    const parsed=parseMI(`*stopped,frame={func="runtime.futex",args=[],fullname="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/sys_linux_amd64.s",line="558",arch="i386:x86-64",addr="0x000000000047b7a3",file="/home/cc/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.21.6.linux-amd64/src/runtime/sys_linux_amd64.s"},stopped-threads=["12","3","1","10","13","7","4","5","8","6","9","2","11"],core="26",session-id="1",thread-id="1"`)

    assert.ok(parsed);
    console.log(JSON.stringify(parsed,null,2))
})
