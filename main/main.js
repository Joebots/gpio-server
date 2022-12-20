const fs = require('fs')
const os = require('os')
const { execSync, fork } = require('child_process');
const { dirname } = require('path');
const express = require('express')
const cors = require('cors')
const SESSION_TIMEOUT = 1000*60*120 // 120 minutes

const scratchDir = fs.mkdtempSync(`${os.tmpdir()}/gpio-server-workdir`)
const appDir = dirname(require.main.filename);

let app = express()

// app.use(express.json()); //Used to parse JSON bodies
app.use(cors({
    origin: '*'
}))

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true }))
app.use('/apps', express.static('../simmer'))

app.post('/node/run', (req, res)=>{

    console.log(req.body)

    res.setHeader('content-type', 'application/json');
    let response = false;

    try{
        if(!req.body.clientid)
            throw new Error("You must pass a clientid")

        if(!req.body.sourceFile)
            throw "You mast pass code to execute with the 'sourceFile' param"

        let client = sessions[req.body.clientid] || new Client(req.body.clientid)
        sessions[req.body.clientid] = client
        response = client.run(req, res)
    }
    catch(e){
        res.status = 500
        response = e
    }
    finally{
        res.send(JSON.stringify(response))
    }
})

app.post('/node/kill', (req, res)=>{

    res.setHeader('content-type', 'application/json');
    let clientid = req.body.clientid;
    let response = false

    try{
        if(!clientid)
            throw "You must pass a clientid"

        if(!sessions[clientid])
            throw "Invalid clientid:" + clientid

        let client = sessions[clientid]
        response = client.kill(req, res)
        delete sessions[clientid]
    }
    catch(e){
        console.error(e)
        res.status = 500
        response = e
    }
    finally{
        res.send(response)
    }
})

app.listen(8080, function () {
    console.log('CORS-enabled web server listening on port 8080')
})

function render(body){

    if(!body)
        throw "You must provide a script to execute, it's currently null or undefined"

return `
const fs = require('fs')
require('./gpio-normalization')

${body}
`
}

let sessions = {}
let idx = 0
const ClientState = {
    WAITING: idx++,
    EXECUTING: idx++
}

class Client{
    id
    state
    workdir
    touchedOn
    timerId
    executionTime
    child

    constructor(id) {
        console.log("creating new client with id " + id)
        this.id = id
        this.state = ClientState.WAITING
        this.workdir = `${scratchDir}/simmer-client-${this.id}`
        this.touchedOn = Date.now()
        this.timerId = setInterval(this.purge, SESSION_TIMEOUT)
        fs.mkdirSync(this.workdir)
        console.log(`Client ${this.id} workdir ${this.workdir}`)
    }

    run(req, res){

        execSync(`touch ${this.workdir}/lock`)

        try {
            if (this.state == ClientState.EXECUTING) {
                throw `Client ${this.id} already executing spawned ${this.spawned.pid}`
            }
            this.initializeWorkDir(req);
            this.executeWorkDir();
            this.observeWorkDir();

            return this.status(req, res)
        }
        catch(e){
            console.error(e)
            throw e
        }
    }

    observeWorkDir() {
        let now = Date.now()

        this.child.on('exit', (code) => {
            this.state = ClientState.WAITING
            this.executionTime = Date.now() - now
            console.log(`Client ${this.id} completed spawned ${this.child.pid} in ${this.executionTime} millis`)
        })
    }

    executeWorkDir() {
        let command = `node ${this.workdir}/file.js`
        console.log(`executing ${command}`)

        this.executionTime = 0

        // let run = spawn("node", [`${this.workdir}/file.js`])
        this.child = fork(`./file.js`, [this.workdir + "/lock"], {cwd: this.workdir, stdio: ['pipe', 'pipe', 'pipe', 'ipc']})

        this.child.stdout.on("data", (msg) => console.log("child data:", msg.toString()))
        this.child.stdout.on("error", (msg) => console.log("child error:", msg.toString()))

        this.state = ClientState.EXECUTING
    }

    initializeWorkDir(req) {
        console.log(`copying ${appDir}/execution-template/* to ${this.workdir}`)
        execSync(`cp -R ${appDir}/execution-template/* ${this.workdir}`)

        let bytes = render(req.body.sourceFile)
        console.log("source file:", bytes)
        let now = Date.now()

        console.log(`copying execution-template to ${this.workdir}`)

        fs.writeFileSync(this.workdir + "/file.js", bytes)
        console.log(`wrote file ${this.workdir}/file.js`, "\n", bytes)
        return now;
    }

    status(req, res){
            this.touchedOn = Date.now()

        return{
            clientid: this.id,
            pid: this.child.pid,
            workdir: this.workdir,
            state: this.state,
            touchedOn: this.touchedOn,
            executionTime: this.executionTime
        }
    }
        
    kill(req, res){
/*        execSync(`kill -15 \`ps -ef | grep ${this.id} | grep -v grep | grep -v /bin/sh | awk '{print $2}'\``)
        execSync(`rm -fr ${this.workdir}`)*/
        console.log(`killing pid ${this.child.pid}`)
        try{
            execSync(`rm -fr ${this.workdir}`)
            delete sessions[this.id]
        }
        catch(e){
            console.log(e)
            console.error(e);
            return e
        }

        return {done:true}
    }

    purge(){

    }
}


