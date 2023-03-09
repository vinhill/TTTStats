/*
REST routes only active if is_debug in server.js is set to true.
These routes might be dangerous and allow direct external access to the db as well as to reset the db.
*/
const express = require("express")
const router = express.Router()
const db = require("../utils/database.js")
const logfile = require("../logfile.js")
const logger = require("../utils/logger.js")

router.post("/makedb", async function(req, res) {
  db.queryAdmin(await db.readQueryFile("CreateDB.sql"))
  res.status(200).end()
})

router.get("/currentlog", async function(req, res) {
  const cleaned = req.query.cleaned === "true"
  let log = await logfile.fetch_current_log(cleaned)
  res.status(200).send(log)
})

router.get("/logs/:fname", async function(req, res) {
  const fname = req.params.fname
  try {
    const log = await logfile.get_log(fname)
    res.status(200).send(log)
  } catch (e) {
    if (e.code === 550)
      res.status(404).json(`Log file '${fname}' not found.`)
    else {
      res.status(500).json(`Error retreiving log file '${fname}'`)
      logger.error("AdminRoute", e)
    }
  }
})

module.exports = router