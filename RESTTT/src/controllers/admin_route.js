/*
REST routes for loading game configs
*/
const express = require("express")
const router = express.Router()
const db = require("../utils/database.js")
const load_logfile = require("../logparsing.js")
const logfile = require("../logfile.js")
const logger = require("../utils/logger.js")
const { REST_ADMIN_TOKEN } = require("../utils/config.js")
const { AuthorizationError, ValidationError, ConflictError } = require("../utils/error.js")
const { setLogLevel } = require("../utils/logger.js")
const { TrackableIterator } = require("../utils/structs.js")
const telemetry = require("../utils/telemetry.js")

/*
Mutex for making sure a file isn't parsed twice
The parse route first checks if the filename is in the configs table
to keep track of which files have been parsed and then adds it.
As this involves two async db queries, a mutex here might be good.
*/
let _mutex = false

let titer = new TrackableIterator([])

router.post("/unsetmutex", function(req, res) {
  _mutex = false

  res.status(200).end()
})

router.get("/health", async function(req, res) {
  const dbhealth = await db._healthcheck()

  let configs, missing_roles
  try {
    configs = await db.query("SELECT * FROM configs", [], false)
  } catch(e) {
    configs = e
  }
  try {
    missing_roles = await db.query(`
      SELECT DISTINCT *
      FROM (
        SELECT dest AS role FROM rolechange
        UNION
        SELECT startrole AS role FROM participates
        ) AS sub
      WHERE role NOT IN (SELECT name FROM role)
    `, [], false);
  } catch(e) {
    missing_roles = e
  }
  res.status(200).json({
    "configs": configs,
    "missing_roles": missing_roles,
    ...dbhealth
  })
})

router.get("/listlogs", async function(req, res) {
  const detail = Number(req.query.detail) || 0
  let logs = await logfile.list_logs()
  if (detail === 0)
    logs = logs.map(log => log.name)
  else if (detail === 1)
    logs = logs.map(log => {
      return {name: log.name, size: log.size, modified: log.modifiedAt}
    })
  // detail === 2 noop
  else if (detail > 2)
    res.status(400).json("detail-lvl must be 0, 1, or 2")
  res.status(200).send(logs)
})

router.post("/fetchlog", async function(req, res) {
  if (req.body.token !== REST_ADMIN_TOKEN)
    throw new AuthorizationError("fetchlog route requires 'token' in the body.")

  const date = req.body.date
  if (!date)
    throw new ValidationError("The fetchlog route requires the 'date' field in the body.")

  const re = /^\d\d\d\d-\d\d-\d\d$/
  if(!re.exec(date))
    throw new ValidationError("Date not in the format YYYY-MM-DD")

  const fpath = await logfile.process_current_log(date)
  res.status(200).json({path: fpath})
})

router.post("/loglevel", function(req, res) {
  if (req.body.token !== REST_ADMIN_TOKEN)
    throw new AuthorizationError("loglevel route requires 'token' in the body.")
  if (!/^\d$/.exec(req.body.level))
    throw new ValidationError("loglevel must be an integer between 0 and 3 (inclusive).")
  setLogLevel(Number(req.body.level))
  res.status(200).end()
})

router.post("/parselog", async function(req, res) {
  const fname = req.body.fname
  if (!fname)
    throw new ValidationError("The parselog route requires the 'fname' field in the body.")

  const fname_re = /^....-..-../
  if(!fname_re.exec(fname))
    throw new ValidationError("Filename not in the format YYYY-MM-DD")
  const date = fname.substring(0, 10)

  // possible race condition with the check for presence, fetching file and inserting config
  if (_mutex)
    throw new Error("Mutex locked, possible race condition")
  _mutex = true
  try {
    // check if already present
    logger.debug("AdminRoute", "Checking if config already present")
    const config = await db.query("SELECT * FROM configs WHERE filename = ?", [fname], false)
    if (config.length !== 0)
      throw new ConflictError(`Config with filename '${fname}' was already parsed.`)
  
    logger.debug("AdminRoute", "Getting logfile for parse")
    data = await logfile.get_log(fname)
  
    logger.debug("AdminRoute", "Sending response for parse route")
    res.status(200).json({
      msg: "start parsing logfile",
      log_length: data.length,
    })

    // will insert fname in configs and parse logfile
    logger.debug("AdminRoute", "Start parsing logfile")
    titer = new TrackableIterator(data.split("\n"))
    await load_logfile(titer, fname, date)
  } finally {
    _mutex = false
  }
})

router.get("/parseprogress", async function(req, res) {
  const progress = titer.progress()
  res.status(200).json(progress)
})

router.post("/restart", function(req, res) {
  if (req.body.token !== REST_ADMIN_TOKEN)
    throw new AuthorizationError("restart route requires 'token' in the body.")

  res.status(200).end()

  setTimeout(() => {
    process.exit(0)
  }, 500)
})

router.get("/telemetryreport", async function(req, res) {
  res.status(200).json(telemetry.report())
})

router.post("/cleardbcache", function (req, res) {
  if (req.body.token !== REST_ADMIN_TOKEN)
    throw new AuthorizationError("restart route requires 'token' in the body.")
    
  db.clearCache();
  res.status(200).end();
})

module.exports = router