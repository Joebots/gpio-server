`use strict`
const fs = require('fs')
const spawn = require('child_process').spawn
const EventEmitter = require('events')
const Util = require("./debug-parse-util")

class DebuggerClosure{
    fork
    cmd
    args

    constructor(fork, cmd, cmdType, args) {
        this.fork = fork
        this.cmd = cmd
        this.cmdType = cmdType
        this.args = args
    }

    execute(){
        let cmd = this.args && this.args.length?this.cmd.replace("$$", this.args):this.cmd;
        this.fork.stdin.write(`${cmd}\n`)
    }

    response(line){

    }
}

class Command{

    static Execution = {
        RUN: "run",
        RESTART: "restart",
        KILL: "kill"
    }

    static Step = {
        CONTINUE: "cont",
        NEXT: "next",
        STEP: "step", // step in
        OUT: "out",
        PAUSE: "pause"
    }

    static Breakpoints = {
        SET: "setBreakpoint('$1', $2)",
        CLEAR:"clearBreakpoint('$1', $2)"
    }

    static Information = {
        // backtrace, bt: Print backtrace of current execution frame
        BACKTRACE : "backtrace",

        // list(5): List scripts source code with 5 line context (5 lines before and after)
        LIST : "list($1)",

        // watch(expr): Add expression to watch list
        WATCH : "watch($1)",

        // unwatch(expr): Remove expression from watch list
        UNWATCH : "unwatch($1)",

        // watchers: List all watchers and their values (automatically listed on each breakpoint)
        WATCHERS: "watchers",

        // repl: Open debugger's repl for evaluation in debugging script's context
        REPL : "repl",

        // exec expr, p expr: Execute an expression in debugging script's context and print its value
        EXEC : "exec $1"
    }

    cmd
    params

    constructor(cmd, params){
        this.cmd = cmd
        this.params = params
    }

    render(){
        let paramCnt = this.cmd.split("$").length-1

        if(this.params && this.params.length !== paramCnt)
            throw `command requires ${paramCnt} params but you supplied ${this.params.length}`

        let result = this.cmd
        for(let i=1; i<paramCnt+1; i++){

            if(this.params)
                result = result.replace("$" + i, this.params[i-1])
        }

        return result
    }

    // execute(){throw "unimplemented abstract method, should return the formatted command to execute"}
    response(line){
        // throw "unimplemented abstract method, should parse the response generated from executing the command"
    }
}

class NodeDebuggerWrapper extends EventEmitter {

    fork
    file
    log

    activeBreakpoint
    activeCommand

    static StepCommand = {
        CONTINUE: "cont",
        NEXT: "next",
        STEP: "step", // step in
        OUT: "out",
        PAUSE: "pause"
    }

    static ExecutionCommand = {
        RUN: "run",
        RESTART: "restart",
        KILL: "kill"
    }

    static Breakpoints = {
        SET: "setBreakpoint('$1', $2)",
        CLEAR:"clearBreakpoint('$1', $2)"
    }

    static STATUS = {
        STARTING: "STARTING",
        STARTED: "STARTED",
        LISTENING: "LISTENING",
        CONNECTING: "CONNECTING"
    }

    static Information = {
        // backtrace, bt: Print backtrace of current execution frame
        BACKTRACE : "backtrace",

        // list(5): List scripts source code with 5 line context (5 lines before and after)
        LIST : "list($1)",

        // watch(expr): Add expression to watch list
        WATCH : "watch($1)",

        // unwatch(expr): Remove expression from watch list
        UNWATCH : "unwatch($1)",

        // watchers: List all watchers and their values (automatically listed on each breakpoint)
        WATCHERS: "watchers",

        // repl: Open debugger's repl for evaluation in debugging script's context
        REPL : "repl",

        // exec expr, p expr: Execute an expression in debugging script's context and print its value
        EXEC : "exec $1"
    }

    constructor(file) {
        super();

        if (!fs.existsSync(file)) {
            throw `LocalForkedDebuggerClient::init : File '${this.file}' not found`
        }

        //console.log("initializing with file", file)
        this.file = file;
        this.log = []
    }

    onData(buffer){
        let entry = buffer.toString();
        this.log.push(entry)
        this.notifyStateChanged(entry);
    }

    notifyStateChanged(entry) {

        // console.log("---------------------------->\n", entry.trim(), "\n<----------------------------")
        console.log(entry)

        if(Util.isBreakpointToken(entry)){
            let breakpoint = Object.assign({}, Util.parseBreakpointInfo(entry));
            this.activeBreakpoint = breakpoint
        }

        if (this.activeBreakpoint && this.isPaused()) {
            this.emit("breakpoint-reached", Object.assign({}, this.activeBreakpoint))
            this.activeBreakpoint = undefined
        }

        if (Util.isListeningToken(entry)) {
            this.emit("listening", Util.parseDebuggerUrl(Util.extractDebuggerUrl(entry)))
        }

        if (Util.isConnectingToken(entry)) {
            this.emit("connecting", Util.extractConnectionUrl(entry))
        }

        if (Util.isAttachedToken(entry)) {
            this.emit("attached")
        }

        if (Util.isBacktrace(entry)){
            this.emit("backtrace")
        }

        if (Util.isWatchers(entry)){
            this.emit("watchers", Util.parseWatchList(entry))
        }

        if (Util.isList(entry)){
            this.emit("list", Util.parseList(entry))
        }

        // //console.log("==================================================\n")
    }

    start() {
        this.fork = spawn('node', ['inspect', this.file])
        this.fork.stdout.on("data", (buffer)=>this.onData(buffer));
        // this.fork.stderr.on("data", (buffer) => this.emit("stderr", buffer));
        console.log("started interactive debug session")
        this.emit("started")
    }

    kill() {
        if (this.fork) {
            this.fork.kill("SIGTERM")
        }
    }

    write(){
        let closure = new DebuggerClosure(this.fork, cmd)

    }

    step(stepCmd) {
        try {
            console.log(`=========== ${stepCmd} ===========`)
            new DebuggerClosure(this.fork, stepCmd).execute()
        }
        catch(e){
            //console.log(e)
        }
    }

    information(infoCmd) {
        try {
            // //console.log(`=========== ${infoCmd} ===========`)
            new DebuggerClosure(this.fork, infoCmd).execute()
        }
        catch(e){
            //console.log(e)
        }
    }

    execute(command){
        try {
            console.log(`=========== ${command.render()} ===========`)
            new DebuggerClosure(this.fork, command.render()).execute()
        }
        catch(e){
            console.log(e)
        }
    }

    setBreakpoint(file, line){

        if(file == undefined || line == undefined){
            throw `setBreakpoint(file:${file}, line:${line}) failed`
        }

        let command = new Command(NodeDebuggerWrapper.Breakpoints.SET, [file, line])
        this.execute(command)
    }

    clearBreakpoint(file, line){

        if(file == undefined || line == undefined){
            throw `clearBreakpoint(file:${file}, line:${line}) failed`
        }

        let command = new Command(NodeDebuggerWrapper.Breakpoints.CLEAR, [file, line])
        this.execute(command)

    }

    lastOutputLine(){

        if(this.log.length > 0)
            return this.log.slice(-2)[0]

        return ""
    }

    lastLine(){

        if(this.log.length > 0)
            return this.log.slice(-1)[0]

        return ""

    }

    isPaused() {
        return Util.isDebugPausedToken(this.lastLine().trim())
    }
}

NodeDebuggerWrapper.Command = Command

module.exports = NodeDebuggerWrapper
