const narf = require("./an-include-file-to-debug").narf
let c = 100

function a(){
    let a = 0
    let b = 1

    narf()

    a = a + "" + 1

    return `a=${a} b=${b} c=${c}`
}

function b(){
    console.log(a())
}

b()