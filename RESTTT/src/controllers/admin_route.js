/*
REST routes for loading game configs
*/
const express = require("express")
const router = express.Router()
const db = require("../utils/database.js")
const logparse = require("../logparse.js")
const logfile = require("../logfile.js")
const { REST_ADMIN_TOKEN } = require("../utils/config.js")

/*
Mutex for making sure a file isn't parsed twice
The parse route first checks if the filename is in the configs table
to keep track of which files have been parsed and then adds it.
As this involves two async db queries, a mutex here might be good.
*/
var _mutex = false

router.post("/unsetmutex", function(req, res) {
  _mutex = false

  res.status(200).end()
})

router.get("/health", async function(req, res) {
  const configs = await db.query("SELECT * FROM configs", [], false)
  const missing_roles = await db.query(`
    SELECT DISTINCT *
    FROM (
      SELECT dest AS role FROM rolechange
      UNION
      SELECT startrole AS role FROM participates
      ) AS sub
    WHERE role NOT IN (SELECT name FROM role)
  `, [], false);
  res.status(200).json({
    "configs": configs,
    "missing_roles": missing_roles
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
  if (req.body.token !== REST_ADMIN_TOKEN) {
    res.status(401).json("fetchlog route requires an authentication token in the body.")
    return
  }

  const date = req.body.date
  if (!date) {
    res.status(400).json("The fetchlog route requires the 'date' field in the body.")
    return
  }
  const re = /^\d\d\d\d-\d\d-\d\d$/
  if(!re.exec(date)) {
    res.status(400).json("Date not in the format YYYY-MM-DD")
  }

  const fpath = await logfile.process_current_log(date)
  res.status(200).json({path: fpath})
})

router.post("/parselog", async function(req, res) {
  // check request parameters
  const fname = req.body.fname
  if (!fname) {
    res.status(400).json("The parselog route requires the 'fname' field in the body.")
    return
  }
  const fname_re = /^....-..-../
  if(!fname_re.exec(fname)) {
    res.status(400).json("Filename not in the format YYYY-MM-DD")
  }
  const date = fname.substring(0, 10)

  // race condition with the check for presence, fetching file and declaring presence
  if (_mutex) {
    res.status(400).json("Too many parse calls in too short time, ignoring request to prevent race conditions.")
    return
  }else {
    _mutex = true
  }

  // check if already present
  const config = await db.query("SELECT * FROM configs WHERE filename = ?", [fname], false)
  if (config.length !== 0) {
    res.status(409).json(`Config with filename '${fname}' was already parsed.`)
    _mutex = false
    return
  }

  // retreive log
  let data = ""
  try {
    data = await logfile.get_log(fname)
  } catch (e) {
    if (e.code === 550)
      res.status(404).json(`Log file '${fname}' not found.`)
    else {
      res.status(500).json(`Error retreiving log file '${fname}'`)
      logger.error("AdminRoute", e)
    }
    _mutex = false
    return
  }

  // before adding anything to the db, add filename to configs table
  await db.queryAdmin("INSERT INTO configs (filename) VALUES (?)", [fname])
  _mutex = false

  // parse
  logparse.load_logfile(data.split("\n"), date)

  res.status(200).end()
})

module.exports = router