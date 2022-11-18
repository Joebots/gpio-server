const Debugger = require("../main/node-debugger-wrapper")
const path = require('path');
const assert = require("assert");
//
const testDir = path.resolve(__dirname);
const file = `${testDir}/resources/file-to-debug.js`;

describe("Debugger Wrapper has", ()=> {

    describe("Lifecycle Events", ()=>{
        it('it fires the started event', (done) => {
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                assert(passed, "timed out waiting for breakpoint")
                done()
                test.kill()
            }, 1000)

            test.on("started", (breakpoint)=>{
                console.log("started", breakpoint)
                passed = true
            })

            test.start();
        })

        it('it fires the listening event', (done) => {
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                assert(passed, "timed out waiting for breakpoint")
                done()
                test.kill()
            }, 1000)

            test.on("listening", (url)=>{
                console.log("listening", url)
                passed = true
            })

            test.start();
        })

        it('it parses the listening url', (done) => {
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                assert(passed, "timed out waiting for breakpoint")
                done()
                test.kill()
            }, 1000)

            test.on("listening", (url)=>{
                console.log("listening", url)
                passed = true
            })

            test.start();
        })

        it('it sets the status to connecting', (done) => {
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                assert(passed, "timed out waiting for breakpoint")
                done()
                test.kill()
            }, 1000)

            test.on("connecting", (url)=>{
                console.log("connecting", url)
                passed = true
            })

            test.start();
        })

        it('it sets the status to attached', (done) => {
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                assert(passed, "timed out waiting for breakpoint")
                done()
                test.kill()
            }, 1000)

            test.on("attached", ()=>{
                console.log("attached")
                passed = true
            })

            test.start();
        })
    })

    describe("Step Commands", ()=>{
        it('it runs the "next" step command', (done) => {
            let test = new Debugger(file)
            let passed = false
            let cnt = 0

            setTimeout(()=>{
                test.kill()
                done()
                assert(passed, "timed out waiting for breakpoint")
            }, 1000)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached cnt:", cnt, breakpoint)
                test.step(Debugger.StepCommand.NEXT)

                if(cnt == 1){
                    passed = true
                }

                cnt++
            })

            test.start();
        })

        it('it runs the "continue" step command', (done) => {
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                assert(passed, "timed out waiting for breakpoint")
                done()
                test.kill()
            }, 1000)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached", breakpoint)
                test.step(Debugger.StepCommand.CONTINUE)
                passed = true
            })
            test.start();
        })

        it("it steps into a function", (done)=>{
            let test = new Debugger(file)
            let passed = false
            let cnt = 0
            let include = "test/resources/an-include-file-to-debug.js";

            setTimeout(()=>{
                done()
                test.kill()
                assert(passed, "timed out waiting for breakpoint")
            }, 1900)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached cnt:", cnt, breakpoint)

                if(cnt == 0){
                    test.setBreakpoint(file, 8);
                    test.step(Debugger.StepCommand.CONTINUE)

                }
                if(cnt == 1){
                    test.step(Debugger.StepCommand.STEP)
                }

                if(cnt == 2){
                    passed = breakpoint.file.trim() === include && breakpoint.lineNbr == 2
                }

                cnt++
            })

            test.start();
        })

        it("it steps out of a function", (done)=>{
            let test = new Debugger(file)
            let passed = false
            let cnt = 0
            let include = "test/resources/an-include-file-to-debug.js";

            let eval = (file, lineNbr, breakpoint, passed)=>{
                let lpassed = passed === undefined?true:passed
                return lpassed && breakpoint.file == file && breakpoint.lineNbr == lineNbr
            }

            setTimeout(()=>{
                done()
                test.kill()
                assert(passed, "timed out waiting for breakpoint")
            }, 1900)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached cnt:", cnt, breakpoint)

                // assumes break on start of debugger
                if(cnt == 0){
                    test.step(Debugger.StepCommand.CONTINUE)
                    passed = true
                }

                if(cnt == 1){
                    test.step(Debugger.StepCommand.STEP)
                    passed = eval(file, 2, breakpoint, passed)
                }

                if(cnt == 2){
                    passed = eval(include, 2, breakpoint, passed)
                    test.step(Debugger.StepCommand.OUT)
                }

                if(cnt == 3){
                    passed = eval(file, 10, breakpoint, passed)
                }

                console.log(passed)
                cnt++
            })

            test.start();
            test.setBreakpoint(file, 8);
        })

        it("it pauses execution", ()=>{
            assert(false, "unimplemented")
        })
    })

    describe("Execution Commands", ()=>{
        it("it sets a forward breakpoint in the file being debugged", (done)=>{
            let test = new Debugger(file)
            let passed = false
            let cnt = 0

            setTimeout(()=>{
                done()
                test.kill()
                assert(passed, "timed out waiting for breakpoint")
            }, 1800)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached cnt:", cnt, breakpoint)

                if(cnt == 0){
                    test.setBreakpoint("test/resources/file-to-debug.js", 5);
                    test.step(Debugger.StepCommand.CONTINUE)
                }

                if(cnt == 1){
                    passed = breakpoint.lineNbr == 5
                    test.step(Debugger.StepCommand.CONTINUE)
                }

                if(cnt == 2){
                    passed = passed && breakpoint.lineNbr == 2
                }

                cnt++
            })
            test.start();
        })

        it("it sets a forward breakpoint in an imported file being debugged", (done)=>{
                let test = new Debugger(file)
                let passed = false
                let cnt = 0

                setTimeout(()=>{
                    done()
                    test.kill()
                    assert(passed, "timed out waiting for breakpoint")
                }, 1900)

                test.on("breakpoint-reached", (breakpoint)=>{
                    console.log("breakpoint reached cnt:", cnt, breakpoint)

                    if(cnt == 0){
                        test.setBreakpoint("test/resources/an-include-file-to-debug.js", 9);
                        test.step(Debugger.StepCommand.CONTINUE)
                    }

                    if(cnt == 1){
                        passed = breakpoint.lineNbr == 9
                    }

                    cnt++
                })
                test.start();
        })

        it("it clears a breakpoint", (done)=>{
            let test = new Debugger(file)
            let passed = false
            let cnt = 0
            let include = "test/resources/an-include-file-to-debug.js";

            setTimeout(()=>{
                done()
                test.kill()
                assert(passed, "timed out waiting for breakpoint")
            }, 1900)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached cnt:", cnt, breakpoint)

                if(cnt == 0){
                    test.setBreakpoint(include, 9);
                    test.setBreakpoint(include, 10);
                    test.setBreakpoint(include, 11);
                }

                if(cnt == 2){
                    console.log("clearing breakpoint on line 11")
                    test.clearBreakpoint(include, 11)
                    passed = true
                }

                if(cnt == 3){
                    console.log("failing test, breakpoint was not cleared")
                    passed = false
                }

                // this means all the Input to the debugger should be throttled if it's ever used in
                // automation.   But that's not an issue for our use case, so let's not worry about it!
                // setTimeout(()=>{
                    test.step(Debugger.StepCommand.CONTINUE)
                // }, 10)

                cnt++
            })

            test.start();
        })
    })

    describe("Information Commands", ()=>{
        // backtrace, bt: Print backtrace of current execution frame
        it("it prints a backtrace", (done)=>{
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                done()
                test.kill()
                assert(passed, "timed out waiting for breakpoint")
            }, 1900)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached cnt:", breakpoint)
                test.execute(new Debugger.Command(Debugger.Command.Information.BACKTRACE))
            })

            test.on("backtrace", ()=>{
                console.log("backtrace reached\n", file, "\n", test.lastLine())
                passed = test.lastLine().trim().startsWith("#0 (anonymous) ")
            })

            test.start()
        })

        // list(5): List scripts source code with 5 line context (5 lines before and after)
        it("it lists scripts source code (5 lines before and after)", (done)=>{
            let test = new Debugger(file)
            let passed = false

            setTimeout(()=>{
                done()
                test.kill()
                assert(passed, "timed out waiting for breakpoint")
            }, 1900)

            test.on("breakpoint-reached", (breakpoint)=>{
                console.log("breakpoint reached cnt:", breakpoint)
                test.execute(new Debugger.Command(Debugger.Command.Information.LIST, [5]))
            })

            test.on("list", (list)=>{
                console.log("list reached\n", file, "\n", list)
                passed = true
            })

            test.start()
        })

        // watch(expr): Add expression to watch list
        it("it adds an expression to the watch list", (done)=>{

        })

        // unwatch(expr): Remove expression from watch list
        it("it removes an expression from the watch list", (done)=>{})

        // watchers: List all watchers and their values (automatically listed on each breakpoint)
        it("it lists all watchers and their values", (done)=>{})

        // repl: Open debugger's repl for evaluation in debugging script's context
        it("it launches a repl session with the debugger", (done) => {})

        // exec expr, p expr: Execute an expression in debugging script's context and print its value
        it( "it executes an expression in the debugging scripts context", (done) => {});
    })
})