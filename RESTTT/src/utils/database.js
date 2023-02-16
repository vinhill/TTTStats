/*
Module for accessing the database.
Primary methods to query the db are
- getCache (reccommended): queryReader but results are cached for repeated access
- queryAdmin: full access
- queryReader: select-only access
*/
const mysql = require('mysql')
const fs = require('fs')
const { performance } = require('perf_hooks')
const { MySQL_ADMIN_PASSWORD, MySQL_READ_PASSWORD, CACHE_SIZE, MAX_RESULT_SIZE_KB, NODE_ENV } = require('./config.js')
const logger = require('./logger.js')

const BoundedCache = require("./structs.js").BoundedCache
const cache = new BoundedCache(CACHE_SIZE)

logger.info("Database", `Cache will use up to ${CACHE_SIZE*MAX_RESULT_SIZE_KB/1000} mb of memory.`)

let connections = {}

let getTestConnection = () => console.warn("No test connection provider set.")
let queryTest = () => console.warn("No test query provider set.")

function stripstr(str) {
  return str.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, " ")
}

function getConnection(name, args) {
  if (NODE_ENV === "test")
    return getTestConnection(name, args)

  return new Promise((res, rej) => {
    if (!connections[name]) {
      const con = mysql.createConnection({
        host: "vmd76968.contaboserver.net",
        port: 3306,
        database: "ttt_stats",
        ...args
      })

      con.connect((err) => {
        if (err) {
          logger.error("Database", `Error while connecting ${name}: ${err}`)
          rej(err)
        }else {
          logger.info("Database", `Connected ${name}!`)
        }
      })

      connections[name] = con
    }

    res(connections[name])
  })
}

function getReadCon() {
  return getConnection("read-only", {
    user: "reader",
    password: MySQL_READ_PASSWORD
  })
}

function getAdminCon() {
  return getConnection("admin", {
    user: "admin",
    password: MySQL_ADMIN_PASSWORD,
    multipleStatements: true
  })
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
  if (NODE_ENV === "test")
    return queryTest(con, querystr, params)

  return new Promise((res, rej) => {
    const startTime = performance.now()

    con.query(querystr, params, (err, result) => {
      const endTime = performance.now()
      if (endTime - startTime > 5*1000) {
        logger.warn("Database", `Query ${querystr} took long (${endTime-startTime} ms)`)
      }

      if(err) {
        logger.error("Database", `Error while querying db for "${querystr}, ${params}": ${err}`)
        rej(err)
      }else {
        res(result)

        logger.debug("Database", `Successfully queried ${stripstr(querystr)} and got ${result.length} results.`)
        logger.debug("Database", `Received ${JSON.stringify(result)}`)
      }
    })
  })
}

function queryCached(con, querystr, params=[]) {
  querystr = format(querystr, params)

  if (!cache.has(querystr)) {
    const future_res = query(con, querystr)

    // add promise to cache in case query is repeated while future_res is being awaited
    const future_ret = new Promise(resolve => {
      future_res.then(res => {
        const size_kb = new TextEncoder().encode(JSON.stringify(res)).length / 1000
        if (size_kb > MAX_RESULT_SIZE_KB) {
          logger.error("Database", `The query '${stripstr(querystr)}' had a result that was too long to be cached: ${size_kb} kb.`)
          resolve("Query result too long")
        } else {
          if (size_kb > MAX_RESULT_SIZE_KB / 2)
            logger.warn("Database", `The query '${stripstr(querystr)}' has a long result: ${size_kb} kb.`)
          resolve(res)
        }
      })
    })
    cache.set(querystr, future_ret)

    future_ret.then(ret => {
      cache.update(querystr, ret)
    })
  } else {
    cache.increment(querystr)
  }

  // note: might be a promise future_ret
  return cache.get(querystr)
}

async function queryReader(querystr, params=[]) {
  return query(await getReadCon(), querystr, params)
}

async function queryAdmin(querystr, params=[]) {
  return query(await getAdminCon(), querystr, params)
}

function shutdown() {
  for (let con of connections) {
    con.end()
  }
  connections = {}
  logger.info("Database", "Closed all database connections.")
}

function clearCache() {
  cache.clear()
}

function format(querystr, params) {
  return mysql.format(querystr, params)
}

async function defaultQuery(querystr, params=[], cache=true) {
  if (querystr.endsWith(".sql"))
    querystr = await readQueryFile(querystr)
  if (cache)
    return queryCached(await getReadCon(), querystr, params)
  else
    return queryReader(querystr, params)
}

function setTestFunctions(onQuery, onConnect=() => {}) {
  logger.info("Database", "Enabling test mode for database.js")
  queryTest = onQuery
  getTestConnection = onConnect
}

module.exports = {
  shutdown,
  clearCache,
  format,
  query: defaultQuery,
  queryAdmin,
  readQueryFile: readQueryFile,
  setTestFunctions
}