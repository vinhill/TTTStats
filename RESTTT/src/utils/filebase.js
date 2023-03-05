const { Readable, Writable } = require("stream")
const { FTP_PW, TTT_FTP_PW, NODE_ENV } = require("./config.js")
const ftp = require("basic-ftp")
const AdmZip  = require("adm-zip")
const logger = require("./logger.js")

let connections = {}

function getConnection(con) {
    return new Promise((res, rej) => {
        if (!connections[con]) {
            const client = new ftp.Client()
            if (NODE_ENV === "dev")
                client.ftp.verbose = true

            options = {}
            if (con == "infinity")
                // infinity free hosting
                options = {
                    host: "ftpupload.net",
                    user: "epiz_33726584",
                    password: FTP_PW,
                    secure: false
                }
            else if (con == "nitrado")
                options = {
                    host: "ms2730.gamedata.io",
                    user: "ni851794_1",
                    password: TTT_FTP_PW,
                    secure: true
                }
            else
                rej(`Invalid ftp connection ${con}.`)

            client.access(options)
                .then(() => {
                    logger.info("Filebase", `Connected '${con}' to FTP server.`)
                    res(client)
                })
                .catch(err => {
                    logger.error("Filebase", err)
                    rej(err)
                })

            connections[con] = client
        }else {
            res(connections[con])
        }
    })
}

function shutdown() {
    for (let name in connections) {
        connections[name].close()
        logger.info("Filebase", "Disconnected from FTP server.")
    }
}

async function list(path, con="infinity") {
    const client = await getConnection(con)
    return client.list(path)
}

async function remove(path, con="infinity") {
    const client = await getConnection(con)
    await client.remove(path)
}

// write Buffer to path
async function write(path, data, compress=true, con="infinity") {
    if (compress) {
        const zip = new AdmZip()
        zip.addFile("data", data)
        data = zip.toBuffer()
    }
    const stream = new Readable()
    stream.push(data)
    stream.push(null)

    const client = await getConnection(con)
    await client.uploadFrom(stream, path)
}

// read Buffer from path
async function read(path, decompress=true, con="infinity") {
    const client = await getConnection(con)

    const stream = new Writable()
    let data = Buffer.alloc(0)
    stream._write = (chunk, encoding, done) => {
        data = Buffer.concat([data, chunk])
        done()
    }
    await client.downloadTo(stream, path)
    
    if (decompress) {
        const zip = new AdmZip(data)
        return zip.getEntry("data").getData()
    } else {
        return data
    }
}

async function ensureDir(path, con="infinity") {
    const client = await getConnection(con)
    await client.ensureDir(path)
}

module.exports = {
    list,
    ensureDir,
    write,
    read,
    remove,
    shutdown
}