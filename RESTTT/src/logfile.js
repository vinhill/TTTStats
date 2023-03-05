const fb = require("./utils/filebase.js")
const logger = require("./utils/logger.js")

// Fetches the current console.log from game server
async function fetch_current_log(cleaned=false) {
    let data = await fb.read("garrysmod/garrysmod/console.log", false, "nitrado")
    data = data.toString()
    if (cleaned)
        data = clean_log(data)
    return data
}

async function get_log(name) {
    const buffer = await fb.read("/logs/"+name)
    return buffer.toString()
}

async function save_log(name, log) {
    const buffer = Buffer.from(log)
    await fb.ensureDir("/logs")
    await fb.write("/logs/"+name, buffer)
}

const keep_loglines = [
    'Map: \w+',
    'Client "\w+" spawned in server <.*> \(took \d+ seconds?\).',
    '\w+ is now in love with \w+.',
    "Dropped \w+ from server",
    "\[TTT2\]:\s*The \w* has won!",
    ".* and gets (REWARDED|penalised for) \d+",
    'ServerLog: [0-9.:]+ - TTT2Revive:',
    'ServerLog: Result: \w+ wins?.',
    'ServerLog: Result: timelimit reached',
    'ServerLog: [0-9.:]+ - CP_RC',
    'ServerLog: [0-9.:]+ - CP_TC',
    'ServerLog: [0-9.:]+ - CP_OE',
    'ServerLog: [0-9.:]+ - CP_DMG',
    'ServerLog: [0-9.:]+ - CP_KILL',
    'ServerLog: [0-9.:]+ - ROUND_END:',
    'ServerLog: [0-9.:]+ - ROUND_START',
    'ServerLog: [0-9.:]+ - ROUND_ENDED at given time',
    'Round state',
    "ServerLog: \w+ took \d+ credits? from the body of",
    "\w+ confirmed the death of \w+",
    '\[TTT2 Medium Role\] Noisified chat'
]

function clean_log(log) {
    const lines = log.split('\n')
    let res = ""
    logger.info("Logfile", "Cleaning log with " + lines.length + " lines.")
    for (let line of lines) {
        for (let pattern of keep_loglines) {
            if (line.match(pattern)) {
                res += line + '\n'
                break
            }
        }
    }
    return res
}

async function process_current_log(fname) {
    const log = await fetch_current_log()
    const clean = clean_log(log)

    const files = await fb.list()
    let path = fname + ".log"
    let i = 0
    while (files.includes(path)) {
        i++
        path = fname + "_" + i + ".log"
    }

    await save_log(path, clean)

    await fb.remove("garrysmod/garrysmod/console.log", "nitrado")
}

async function list_logs() {
    return fb.list("/logs")
}

module.exports = {
    fetch_current_log,
    process_current_log,
    get_log,
    list_logs
}