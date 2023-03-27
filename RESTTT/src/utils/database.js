const mysql = require('mysql')
const fs = require('fs')
const { performance } = require('perf_hooks')
const conf = require('./config.js')
const logger = require('./logger.js')

const BoundedCache = require("./structs.js").BoundedCache
const cache = new BoundedCache(conf.CACHE_SIZE)
logger.info("Database", `Cache will use up to ${conf.CACHE_SIZE*conf.MAX_RESULT_SIZE_KB/1000} mb of memory.`)

// automatically pings and, as needed, reconnects when retreiving connections
const _readerPool = mysql.createPool({
  connectionLimit: 5,
  host: conf.VPS_DOMAIN,
  port: 3306,
  database: "ttt_stats",
  user: "reader",
  password: conf.MySQL_READ_PASSWORD,
  timeout: conf.DB_TIMEOUT,
  acquireTimeout: conf.DB_TIMEOUT,
  connectTimeout: conf.DB_TIMEOUT
})
_readerPool.on("connection", () => logger.info("Database", "Connected to reader database."))
const _adminCon = mysql.createPool({
  connectionLimit: 1,
  host: conf.VPS_DOMAIN,
  port: 3306,
  database: "ttt_stats",
  user: "admin",
  password: conf.MySQL_ADMIN_PASSWORD,
  multipleStatements: true,
  timeout: conf.DB_TIMEOUT,
  acquireTimeout: conf.DB_TIMEOUT,
  connectTimeout: conf.DB_TIMEOUT
})
_adminCon.on("connection", () => logger.info("Database", "Connected to admin database."))

let getTestConnection = () => console.warn("No test connection provider set.")
let queryTest = () => console.warn("No test query provider set.")

function stripstr(str) {
  return str.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, " ")
}

function getConnection(name) {
  if (conf.NODE_ENV === "test")
    return getTestConnection(name)

  if (name === "reader")
    return _readerPool
  else if (name === "admin")
    return _adminCon
  else
    throw new Error(`Unknown connection name ${name}`)
}

function readQueryFile(queryFileName) {
  return new Promise(function(res, rej) {
    const path = `src/queries/${queryFileName}`

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        rej(err)
      }else{
        res(data)
      }
    })
  })
}

function query(con, querystr, params=[]) {
  if (conf.NODE_ENV === "test")
    return queryTest(con, querystr, params)

  return new Promise((res, rej) => {
    const startTime = performance.now()

    con.query(
      {
        sql: querystr,
        values: params,
        timeout: conf.DB_QER_TIMEOUT
      },
      (err, result) => {
        const endTime = performance.now()
        if (endTime - startTime > conf.DB_QER_TIMEOUT / 2) {
          logger.warn("Database", `Query ${querystr} took long (${endTime-startTime} ms)`)
        }

        if(err) {
          logger.warn("Database", `Error while querying db for "${querystr}, ${params}": ${err}`)
          rej(err)
        }else {
          res(result)

          logger.debug("Database", `Successfully queried ${stripstr(querystr)} and got ${result.length} results.`)
          logger.debug("Database", `Received ${JSON.stringify(result)}`)
        }
      }
    )
  })
}

function queryCached(con, querystr, params=[]) {
  querystr = format(querystr, params)

  if (!cache.has(querystr)) {
    const future_res = query(con, querystr)

    // add promise to cache in case query is repeated while future_res is being awaited
    const future_ret = new Promise((resolve, reject) => {
      future_res
        .then(res => {
          const size_kb = new TextEncoder().encode(JSON.stringify(res)).length / 1000
          if (size_kb > conf.MAX_RESULT_SIZE_KB) {
            logger.error("Database", `The query '${stripstr(querystr)}' had a result that was too long to be cached: ${size_kb} kb.`)
            resolve("Query result too long")
          } else {
            if (size_kb > conf.MAX_RESULT_SIZE_KB / 2)
              logger.warn("Database", `The query '${stripstr(querystr)}' has a long result: ${size_kb} kb.`)
            resolve(res)
          }
        })
        .catch((err) => {
          cache.delete(querystr)
          reject(err)
        })
    })

    cache.set(querystr, future_ret)
  } else {
    cache.increment(querystr)
  }

  // note: will be the promise future_ret
  return cache.get(querystr)
}

function shutdown() {
  _adminCon.end()
  _readerPool.end()
  logger.info("Database", "Closed all database connections.")
}

function clearCache() {
  cache.clear()
}

function format(query, values) {
  if (!values)
    return query;
  else if (Array.isArray(values))
    return mysql.format(query, values)
  else
    return query.replace(/\:(\w+)/g, (txt, key) => {
      if (values.hasOwnProperty(key)) {
        return mysql.escape(values[key]);
      }
      return txt;
    });
}

async function queryReader(querystr, params=[], cache=true) {
  if (querystr.endsWith(".sql"))
    querystr = await readQueryFile(querystr)
  if (cache)
    return queryCached(getConnection("reader"), querystr, params)
  else
    return query(getConnection("reader"), querystr, params)
}

async function queryAdmin(querystr, params=[]) {
  if (querystr.endsWith(".sql"))
    querystr = await readQueryFile(querystr)
  return query(getConnection("admin"), querystr, params)
}

function setTestFunctions(onQuery, onConnect=() => {}) {
  logger.info("Database", "Enabling test mode for database.js")
  queryTest = onQuery
  getTestConnection = onConnect
}

async function healthcheck() {
  const ping_vps = await new Promise(resolve => {
    require("ping").sys.probe(conf.VPS_DOMAIN, (res, err) => {
      if (err) resolve({err: err})
      else resolve("success")
    })
  })

  const con = mysql.createConnection({
    host: conf.VPS_DOMAIN,
    port: 3306,
    database: "ttt_stats",
    user: "reader",
    password: conf.MySQL_READ_PASSWORD,
    timeout: conf.DB_TIMEOUT,
    acquireTimeout: conf.DB_TIMEOUT,
    connectTimeout: conf.DB_TIMEOUT,
    debug: true
  })
  const ping_reader_con = await new Promise(resolve => {
    con.ping(err => {
      if (err) resolve({err: err})
      else resolve("success")
    })
  })
  const con_select = await new Promise(resolve => {
    con.query("SELECT 1", [], (err, res) => {
      if (err) resolve({err: err})
      else resolve("success")
    })
  })
  await con.end()

  const ping_admin_pool = await new Promise(resolve => {
    getConnection("admin").getConnection((err, con) => {
      if (err) resolve({err: err})
      else {
        con.ping(err => {
          if (err) resolve({err: err})
          else resolve("success")
        })
        con.release()
      }
    })
  })
  const ping_reader_pool = await new Promise(resolve => {
    getConnection("reader").getConnection((err, con) => {
      if (err) resolve({err: err})
      else {
        con.ping(err => {
          if (err) resolve({err: err})
          else resolve("success")
        })
        con.release()
      }
    })
  })
  const pool_select = await new Promise(resolve => {
    getConnection("reader").query("SELECT 1", [], (err, res) => {
      if (err) resolve({err: err})
      else resolve("success")
    })
  })

  delete ping_vps.output
  delete ping_vps.inputHost
  delete ping_vps.host
  delete ping_vps.numeric_host

  return {
    ping_vps,
    ping_admin_pool,
    ping_reader_pool,
    ping_reader_con,
    pool_select,
    con_select
  }
}

module.exports = {
  shutdown,
  clearCache,
  format,
  query: queryReader,
  queryAdmin,
  setTestFunctions,
  _healthcheck: healthcheck,
}