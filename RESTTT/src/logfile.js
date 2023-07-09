const fb = require("./utils/filebase.js")
const logger = require("./utils/logger.js")

LOGPATH = "serverfiles/garrysmod/console.log"

// Fetches the current console.log from game server
async function fetch_current_log(cleaned=false) {
    let data = await fb.read(LOGPATH, false, "vps")
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
    'CP map:',
    'CP round state',
    'ServerLog: [0-9.:]+ - ROUND_START',
    'ServerLog: [0-9.:]+ - CP_RC',
    'ServerLog: [0-9.:]+ - CP_TC',
    'ServerLog: [0-9.:]+ - CP_OE',
    'ServerLog: [0-9.:]+ - CP_DMG',
    'ServerLog: [0-9.:]+ - CP_KILL',
    ".* and gets (REWARDED|penalised for) \\d+",
    "ServerLog: \\w+ took \\d+ credits? from the body of",
    'ServerLog: [0-9.:]+ - TTT2Revive:',
    'ServerLog: Result: \\w+ wins?.',
    'ServerLog: Result: No-one wins?.',
    'ServerLog: Result: timelimit reached',
    'ServerLog: [0-9.:]+ - ROUND_END:',
    'ServerLog: [0-9.:]+ - ROUND_ENDED at given time',
    '\\[TTT2 Medium Role\\] Noisified chat'
]

function clean_log(log) {
    const lines = log.split('\n')
    let res = ""
    const start = Date.now()
    logger.info("Logfile", `Cleaning log with ${lines.length} lines.`)
    for (let line of lines) {
        line = line.trim().replace(/\s+/g, ' ').replace(/\t+/g, ' ')
        for (let pattern of keep_loglines) {
            if (line.match(pattern)) {
                res += line + '\n'
                break
            }
        }
    }
    const dur_s = Math.round((Date.now() - start)/1000)
    const dur_ms = Math.round((Date.now() - start)%1000)
    logger.info("Logfile", `Cleaning log with ${lines.length} lines took ${dur_s}.${dur_ms} s.`)
    return res
}

// fetch log from server, store it under the given fname
async function process_current_log(fname) {
    const log = await fetch_current_log()
    const clean = clean_log(log)

    const files = await fb.list()
    let path1 = fname + ".log.zip"
    let path2 = fname + ".raw.log.zip"
    let i = 0
    while (files.includes(path1) || files.includes(path2)) {
        i++
        path1 = fname + `-${i}.log.zip`
        path2 = fname + `-${i}.raw.log.zip`
    }

    await save_log(path2, log)
    await save_log(path1, clean)

    await fb.remove(LOGPATH, "vps")

    return path1
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