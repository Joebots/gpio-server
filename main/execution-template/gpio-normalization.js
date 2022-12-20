"use strict";
const fs = require("fs")
let Gpio = require('onoff').Gpio

class NGpio{
    pin
    type
    gpio

    static TYPE_READ  = 'in'
    static TYPE_WRITE = 'out'

    constructor(config) {
        this.pin = config.pin
        this.type = config.type

        if(!this.pin || !this.type || (NGpio.TYPE_READ + NGpio.TYPE_WRITE).indexOf(this.type) == -1){
            throw "Invalid pin configuration.  You must supply a pin number and a type of 'READ' or 'WRITE'"
        }

        console.log("Creating new GPIO reference", this.pin, this.type)
        this.gpio = new Gpio(this.pin, this.type)
    }

    write(value){
        console.log(`NGpio.write(${this.pin}, ${value})`)

        if(this.type != NGpio.TYPE_WRITE)
            throw `Pin ${this.pin} is configured as ${this.type}, not writable`

        this.gpio.writeSync(value)
    }

    read(){
        return this.gpio.readSync()
    }

    observe(func){
        return this.gpio.watch(func)
    }

    unobserve(func){
        return this.gpio.unwatch(func)
    }
}

// Singleton
class PinManager{
    static instance
    pins = {}

    constructor(){
        if(!PinManager.instance){
            console.log("creating new PinManager")
            PinManager.instance = this;
        }

        return PinManager.instance
    }

    getOrCreate(pin, type){
        let result = PinManager.instance.pins[pin] || new NGpio({pin: pin, type: type})
        PinManager.instance.pins[pin] = result
        return result
    }

    write(pin, value){
        let ngpio = PinManager.instance.getOrCreate(pin, NGpio.TYPE_WRITE);
        ngpio.write(value)
    }

    read(pin){
        let ngpio = PinManager.instance.getOrCreate(pin, NGpio.TYPE_READ)
        return ngpio.read()
    }

    observe(pin, func){
        let ngpio = this.pins[pin]

        if(!ngpio)
            throw `GPIO pin ${pin} hasn't been created yet`

        ngpio.gpio.watch(func);
    }

    unobserve(pin, func){
        let ngpio = this.pins[pin]

        if(!ngpio)
            throw `GPIO pin ${pin} hasn't been created yet`

        ngpio.gpio.unwatch(func);
    }

    release(){
        console.log("releasing pins")

        for(let ref in PinManager.pins){
            let pin = PinManager.pins[ref]
            pin.gpio.writeSync(0)
            pin.gpio.unexport();
        }
    }
}

// globals to match generated blockly code
global.gpioWrite = function(pin, value){
    PinManager.instance.write(pin, value)
}

global.gpioRead = function(pin){
    return PinManager.instance.read(pin)
}

global.gpioWatch = function(pin, func){
    return PinManager.instance.observe(pin, func)
}

global.gpioUnwatch = function(pin, func){
    return PinManager.instance.unobserve(pin, func)
}

global.sleep = function(duration){
    let currentTime = new Date().getTime();
    while (currentTime + duration>= new Date().getTime()){
        checkLockFile();
    }
}

function checkLockFile(){
    let file = process.argv[2]

    if(!fs.existsSync(file)){
        console.log("no lock file; bailing out")
        PinManager.release()
        setTimeout(()=>process.exit(0), 500)
    }
}

// instantiate the singleton
new PinManager()
global.PinManager = PinManager

