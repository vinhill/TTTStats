/*
Module for accessing the database.
Primary methods to query the db are
- getCache (reccommended): queryReader but results are cached for repeated access
- queryAdmin: full access
- queryReader: select-only access
*/
const mysql = require('mysql');
const fs = require('fs');
const { performance } = require('perf_hooks');
const BoundedCache = require("./structs.js").BoundedCache;
const cache = new BoundedCache(100);

let _read_only_con = null;
let _admin_con = null;
const log_queries = false;

function getReadOnlyCon() {
  return new Promise(function(res, rej){
    if (!_read_only_con) {
      _read_only_con = mysql.createConnection({
        host: "vmd76968.contaboserver.net",
        port: 3306,
        user: "reader",
        password: process.env.READERPW,
        database: "ttt_stats"
      });

      _read_only_con.connect(function(err) {
        if (err) {
          console.error(`Error while connecting read-only user: ${err}`);
          rej(err);
        }else {
          console.log("Connected read-only user!");
        }
      });
    }
      
    res(_read_only_con);
  });
}

function getFullCon() {
  return new Promise(function(res, rej){
    if (!_admin_con) {
      _admin_con = mysql.createConnection({
        host: "vmd76968.contaboserver.net",
        port: 3306,
        user: "admin",
        password: process.env.ADMINPW,
        database: "ttt_stats",
        multipleStatements: true
      });

      _admin_con.connect(function(err) {
        if (err) {
          console.error(`Error while connecting to db: ${err}`);
          rej(err);
        }else {
          console.log("Connected admin!");
        }
      });
    }
      
    res(_admin_con);
  });
}

function readQueryFile(queryFileName) {
  return new Promise(function(res,rej){
    const path = `src/queries/${queryFileName}.sql`;

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        rej(err);
      }else{
        res(data);
      }
    })
  });
}

function queryReader(query, params=[]) {
  return new Promise(async function(res, rej){
    let con = await getReadOnlyCon();
    var startTime = performance.now();
    
    con.query(query, params, function(err, result, fields) {
      var endTime = performance.now();
      if (endTime - startTime > 5*1000) {
        console.log(`Query ${query} took long (${endTime-startTime} ms)`);
      }
      
      if(err) {
        console.error(`Error while querying db read-only for "${query}, ${params}": ${err}`);
        rej(err);
      }else {
        res(result);
      
        if (log_queries) {
          console.log(`Queries ${query} and got ${JSON.stringify(result)}`);
        }
      }
    })
  });
}

function queryAdmin(query, params=[]) {
  return new Promise(async function(res, rej){
    let con = await getFullCon();
    var startTime = performance.now();
    
    con.query(query, params, function(err, result, fields) {
      var endTime = performance.now();
      if (endTime - startTime > 5*1000) {
        console.log(`Query ${query} took long (${endTime-startTime} ms)`);
      }
      
      if(err) {
        console.error(`Error while querying db as admin for "${query}, ${params}": ${err}`);
        rej(err);
      }else {
        res(result);
      
        if (log_queries) {
          console.log(`Queries ${query} and got ${JSON.stringify(result)}`);
        }
      }
    })
  });
}

function shutdown() {
  if (_read_only_con) {
    _read_only_con.end();
    _read_only_con = null;
  }
  if (_admin_con) {
    _admin_con.end();
    _admin_con = null;
  }
  console.log("Closed all database connections.");
}

function clearCache() {
  cache.clear();
}

async function getCache(query) {
  if(!cache.has(query)) {
    var futureVal = queryReader(query);
    // add promise to cache in case query is queried again while futureVal hasn't been received
    cache.set(query, futureVal);
    // await futureVal and update cache
    var res = await futureVal;
    cache.update(query, res);
    return res;
  }
  else {
    // increment priority of entry to keep it in cache
    cache.increment(query);
    // could be the query result or a Promise<query result>
    // await will work with both and return the result
    return await cache.get(query);
  }
}

function format(query, params) {
  return mysql.format(query, params);
}

module.exports = {
  getReadOnlyCon,
  getFullCon,
  shutdown,
  readQueryFile,
  queryAdmin,
  queryReader,
  getCache,
  clearCache,
  format
};