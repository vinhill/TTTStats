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
const { MySQL_ADMIN_PASSWORD, MySQL_READ_PASSWORD, CACHE_SIZE } = require('./config.js')

const BoundedCache = require("./structs.js").BoundedCache
const cache = new BoundedCache(CACHE_SIZE)

const log_queries = false
let connections = {}

function getConnection(name, args) {
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
          console.error(`Error while connecting ${name}: ${err}`)
          rej(err)
        }else {
          console.log(`Connected ${name}!`)
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
  return new Promise((res, rej) => {
    const startTime = performance.now()

    con.query(querystr, params, (err, result) => {
      const endTime = performance.now()
      if (endTime - startTime > 5*1000) {
        console.log(`Query ${querystr} took long (${endTime-startTime} ms)`)
      }

      if(err) {
        console.error(`Error while querying db for "${querystr}, ${params}": ${err}`)
        rej(err)
      }else {
        res(result)

        if (log_queries) {
          console.log(`Queries ${querystr} and got ${JSON.stringify(result)}`)
        }
      }
    })
  })
}

function queryReader(querystr, params=[]) {
  return query(getReadCon(), querystr, params)
}

function queryAdmin(querystr, params=[]) {
  return query(getAdminCon(), querystr, params)
}

function shutdown() {
  for (let con of connections) {
    con.end()
  }
  connections = {}
  console.log("Closed all database connections.")
}

function clearCache() {
  cache.clear()
}

async function queryCached(querystr) {
  if (!cache.has(query)) {
    const futureVal = query(getReadCon(), querystr)
    // add promise to cache in case query is queried again while futureVal hasn't been received
    cache.set(querystr, futureVal)
    // await futureVal and update cache
    let res = await futureVal
    if (JSON.stringify(res).length > 5000) {
      console.log(`The query '${querystr}' had a result that was too long to be cached.`)
      res = "Query result too long"
    }
    cache.update(querystr, res)
    return res
  }
  else {
    // increment priority of entry to keep it in cache
    cache.increment(querystr)
    // could be the query result or a Promise<query result>
    // await will work with both and return the result
    let res = await cache.get(querystr)
    if (JSON.stringify(res).length > 5000) {
      console.log(`The query '${querystr}' had a result that was too long to be cached.`)
      res = "Query result too long"
    }
    return res
  }
}

function format(querystr, params) {
  return mysql.format(querystr, params)
}

function defaultQuery(querystr, params=[], cache=true) {
  if (querystr.endsWith(".sql"))
    querystr = readQueryFile(querystr)
  if (cache)
    return queryCached(querystr, params)
  else
    return queryReader(querystr, params)
}

module.exports = {
  shutdown,
  clearCache,
  format,
  query: defaultQuery,
  queryAdmin,
  readQueryFile: readQueryFile,
}