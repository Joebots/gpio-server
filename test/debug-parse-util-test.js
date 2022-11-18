const Util = require("../main/debug-parse-util")
const path = require('path');
const assert = require("assert");

const testDir = path.resolve(__dirname);
const file = `${testDir}/resources/file-to-debug.js`;

describe("DebugParseUtil", ()=>{
    it("parses breakpoints at the start of a file", ()=>{
        let logEntry = "Break on start in test/resources/file-to-debug.js:1\n" +
            "> 1 let c = 100\n" +
            "  2 \n" +
            "  3 function a(){\n"

        let breakpoint = Util.parseBreakpointInfo(logEntry);
        assert(breakpoint.file === "test/resources/file-to-debug.js", "file parsing failed")
        assert(breakpoint.lineNbr === 1, "file line number parsing failed")
    })


    it("parses breakpoints set within a file", ()=>{
        let logEntry = "\bBreak on start in test/resources/file-to-debug.js:1\n" +
            "> 1 let c = 100\n" +
            "  2 \n" +
            "  3 function a(){\n"

        let breakpoint = Util.parseBreakpointInfo(logEntry);
        console.log(breakpoint)
    })
})