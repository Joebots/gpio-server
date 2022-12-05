let tokens = {
    LISTENING: "< Debugger listening on ",
    CONNECTING: "connecting to",
    ATTATCHED: "< Debugger attached.",

    START_BREAKPOINT_REACHED: "\bBreak on",
    DYNAMIC_BREAKPOINT_REACHED: "\bbreak in",

    WATCHERS : "Watchers:"
}

function contains(str, token){
    return str.indexOf(token) != -1
}

let listEntryRegex = /[> ][ ][0-9]+ /


module.exports = {

    isDebugPausedToken: (str) => str.trim().endsWith("debug>"),

    isBreakpointToken: (str)=> contains(str, "break in") || contains(str, "Break on start"),

    isWatchers : (str)=> contains(str, tokens.WATCHERS),

    isBacktrace : (str)=> str.trim().startsWith("#"), // yes, this should be a regex.

    isList : (str) => {
        let lines = str.split("\n")
        let test = listEntryRegex

        let cnt = 0

        for(let idx in lines){

            let line = lines[idx]

            if(module.exports.isDebugPausedToken(line))
                continue;

            // let passed = test.test(line.trim())
            // result = result === undefined?passed:result && passed
            cnt += test.test(line)?1:0
        }

        return cnt > 0
    },

    arrayEquals : (a, b)=>{
        return Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index]);
    },

    extractDebuggerUrl : (entry)=>{
        return entry.substring(entry.indexOf("ws"), entry.indexOf("\n"))
    },

    parseDebuggerUrl: (urlString)=>{
        let url = new URL(urlString)

        let result = {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            uuid: url.pathname.substring(1)
        }

        return result;
    },

    parseBreakpointInfo: (line)=>{
        let lineNbr = parseInt(line.substring(line.indexOf(":")+1))
        line = line.replaceAll("\b", "")

        if(line.indexOf("Break on start in ") != -1){
            line = line.replaceAll("Break on start in ", "")
        }
        else{
            line = line.replaceAll("break in", "")
        }

        let file = line.substring(0, line.indexOf(":"))

        return {
            file: file.trim(),
            lineNbr: lineNbr
        }
    },

    parseList: (entry)=>{
        let lines  = entry.split("\n")
        let result = []

        for(let i in lines){
            let line = lines[i]

            if(listEntryRegex.test(line)){
                result.push(line)
            }
        }

        return result
    },

    parseWatchList: (entry)=>{
        let lines  = entry.split("\n")
        let isWatchers = false
        let result = []
        let emptyLineCnt = 0

        for(let i in lines){
            let line = lines[i]

            if(line.trim().length == 0)
                emptyLineCnt++
            else
                emptyLineCnt = 0

            if(line.trim() == "Watchers:"){
                isWatchers = true
            }

            if(emptyLineCnt == 1)
                isWatchers = false

            if(isWatchers){
                result.push(line)
            }
        }

        return result
    },

    isListeningToken(entry){
        return entry.indexOf(tokens.LISTENING) != -1
    },

    isConnectingToken(entry){
        return entry.indexOf(tokens.CONNECTING)
    },

    extractConnectionUrl(entry){
        return entry.substring(entry.indexOf(tokens.CONNECTING) + tokens.CONNECTING.length, entry.indexOf("...")).trim()
    },

    isAttachedToken(entry){
        return entry.indexOf(tokens.ATTATCHED) != -1
    },

    tokens: tokens
}
