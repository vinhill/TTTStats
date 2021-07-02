const mysql = require('mysql');
const BoundedCache = require("./structs.js").BoundedCache;
const cache = new BoundedCache(100);

let _read_only_con = null;
let _admin_con = null;

function getReadOnlyCon() {
  return new Promise(function(res, rej){
    if (!_read_only_con) {
      _read_only_con = mysql.createConnection({
        host: "vmd76968.contaboserver.net",
        port: 3306,
        user: "reader",
        password: "JTCRsA82FpS96RLEoJzKJMVUqEx3Jp",
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
        password: "uq29eYLPLhY6LKrPNNByncYg",
        database: "ttt_stats"
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

function queryReader(query) {
  return new Promise(async function(res, rej){
    let con = await getReadOnlyCon();
    con.query(query, function(err, result, fields) {
      if(err) {
        console.error(`Error while querying db read-only for "${query}": ${err}`);
        rej(err);
      }else {
        res(result);
      }
    })
  });
}

function queryAdmin(query, params=[]) {
  return new Promise(async function(res, rej){
    let con = await getFullCon();
    con.query(query, params, function(err, result, fields) {
      if(err) {
        console.error(`Error while querying db as admin for "${query}": ${err}`);
        rej(err);
      }else {
        res(result);
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
    // query and add result to cache
    let res = await queryReader(query);
    if (JSON.stringify(res).length > 5000) {
      console.log(`The query '${query}' had a result that was too long to be cached.`);
    }else {
      cache.set(query, res);
    }
    return res;
  }
  else {
    // increment priority of entry to keep it in cache
    cache.increment(query);
    return cache.get(query);
  }
}

module.exports = {
  "getReadOnlyCon": getReadOnlyCon,
  "getFullCon": getFullCon,
  "shutdown": shutdown,
  "queryAdmin": queryAdmin,
  "queryReader": queryReader,
  "getCache": getCache,
  "clearCache": clearCache
};