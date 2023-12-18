const mysql = require("mysql")
const logger = require("./logger.js")
const telemetry = require("./telemetry.js")
const { startTimer } = require("./timer.js")

function default_cb(err, res) {
  if (err) throw err
}

class PooledConnection {
  constructor(pool) {
    this.pool = pool
    this.con = null
    this.idle_since = 0
  }

  connect(auth, timeout, cb=default_cb) {
    this.con = mysql.createConnection(auth)
    this.con.connect(
      {
        timeout: timeout,
        acquireTimeout: timeout,
        connectTimeout: timeout
      },
      err => {
        this.idle_since = Date.now()
        if (err) cb(err)
        else cb(null, this)
      }
    )
  }

  query(query, cb=default_cb) {
    if (this.con === null)
      cb(new Error("Connection not established"))

    let timer = startTimer()
    this.con.query(query, (err, res) => {
      this.idle_since = Date.now()
      timer.stop()
      telemetry.get("DB_Query_Duration").add(timer.ms())
      cb(err, res)
    })
  }
  
  release() {
    this.pool.release(this)
  }

  destroy() {
    if (this.con)
      this.con.destroy()
  }
}

function promisefy(func, ...args) {
  // Promisefy a function that takes a callback as last argument
  return new Promise((resolve, reject) => {
    func(...args, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

class Pool {
  constructor(config) {
    this.auth = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      multipleStatements: config.multipleStatements || false
    }
    this.ping_after = config.ping_after || 1000  * 60 * 5
    this.connectionLimit = config.connectionLimit || 5
    this.timeout = config.timeout || 200
    this.retry_after = config.retry_after || 1000 * 5
    this.retry_count = config.retry_count || 5

    this.size = 0
    this.connections = []
    this.waiting = []
    this.fatalErr = null
    this.listeners = []
  }

  _checkAlive(con) {
    logger.debug("DBPool", "Pinging connection...")
    let timer = startTimer()
    con.query(
      {
        sql: "SELECT 1",
        timeout: this.timeout
      },
      err => {
        timer.stop()
        telemetry.get("DB_CheckAlive_Duration").add(timer.ms())
        if (err) {
          logger.warn("DBPool", "Connection is dead, destroying...")
          con.destroy()
          this._createConnection()
        } else {
          logger.debug("DBPool", "Connection is alive.")
          this.release(con)
        }
      }
    )
  }

  _fatal(err) {
    this.fatalErr = err
    for (const con of this.connections) {
      con.destroy()
    }
    for (const cb of this.waiting) {
      cb(err)
    }
    logger.error("DBPool", `Fatal error: ${err}`)
  }

  _createConnection(retry=0) {
    logger.debug("DBPool", "Creating new connection...")
    this.size++
    const pcon = new PooledConnection(this)
    pcon.connect(this.auth, this.timeout, (err, con) => {
      if (err) {
        // todo check if fatal, i.e. wrong credentials
        this.size--
        if (retry > this.retry_count && this.retry_count >= 0) {
          this._fatal(err)
        } else {
          logger.debug("DBPool", `Error ${err}`)
          logger.debug("DBPool", `Failed to establish new connection, retrying (${retry+1})...`)
          if (this.retry_after > 0) {
            setTimeout(() => this._createConnection(retry+1), this.retry_after)
          } else {
            this._createConnection(retry++)
          }
        }
      } else {
        this.listeners.filter(l => l.type === "connect").forEach(l => l.cb(con))
        logger.info("DBPool", "Established new connection.")
        this.release(pcon)
      }
    })
  }

  end() {
    for (const con of this.connections) {
      con.destroy()
    }
  }

  listen(type, cb) {
    this.listeners.push({type, cb: cb})
  }

  release(con) {
    logger.debug("DBPool", `Released connection. Size ${this.size}, idle ${this.connections.length+1}, waiting ${this.waiting.length}`)
    if (this.waiting.length > 0) {
      const cb = this.waiting.pop()
      cb(null, con)
    } else {
      this.connections.push(con)
    }
  }

  acquire(cb) {
    if (this.fatalErr) {
      cb(this.fatalErr)
      return
    }

    if (this.connections.length > 0) {
      const con = this.connections.pop()
      if (con.idle_since + this.ping_after < Date.now()) {
        this.waiting.push(cb)
        this._checkAlive(con)
      } else {
        cb(null, con)
      }
      return
    }

    this.waiting.push(cb)
    
    if (this.size < this.connectionLimit)
      this._createConnection()
  }

  query(query, cb=default_cb) {
    this.acquire((err, con) => {
      if (err) {
        cb(err)
        logger.debug("DBPool", "Error while acquiring connection for query.")
        this._checkAlive(con)
      } else {
        logger.debug("DBPool", "Acquired connection for query.")
        con.query(query, (err, res) => {
          if (err) this._checkAlive(con)
          else con.release()
          cb(err, res)
        })
      }
    })
  }
}

module.exports = {
  Pool,
  promisefy
}
