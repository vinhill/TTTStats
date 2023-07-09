const { Readable, Writable } = require("stream")
const { FTP_PW, TTT_VPS_PW, NODE_ENV } = require("./config.js")
const ftp = require("basic-ftp")
let Client = require('ssh2-sftp-client');
const AdmZip  = require("adm-zip")
const logger = require("./logger.js")

let connections = {}

class SFTPToFTP {
    constructor() {
        this._sftp = new Client()
    }
    access(options) {
        return this._sftp.connect(options)
    }
    close() {
        return this._sftp.end()
    }
    list(path) {
        return this._sftp.list(path)
    }
    remove(path) {
        return this._sftp.delete(path)
    }
    ensureDir(path) {
        return this._sftp.mkdir(path, true)
    }
    uploadFrom(readable, path) {
        return this._sftp.put(readable, path)
    }
    downloadTo(writable, path) {
        return this._sftp.get(path, writable)
    }
}

function getConnection(con) {
    return new Promise((res, rej) => {
        if (!connections[con] || connections[con].closed) {

            let options = {}
            let client = null
            if (con == "infinity") {
                options = {
                    host: "ftpupload.net",
                    user: "epiz_33726584",
                    password: FTP_PW,
                    secure: false
                }
                client = new ftp.Client()
                if (NODE_ENV === "dev")
                    client.ftp.verbose = true
            }else if (con == "vps") {
                options = {
                    host: "vmd76968.contaboserver.net",
                    port: 22,
                    username: "gmodserver",
                    password: TTT_VPS_PW,
                }
                if (NODE_ENV === "dev")
                    options.debug = (msg) => logger.debug("SFTP", msg)
                client = new SFTPToFTP()
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
                    connections[con] = null
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