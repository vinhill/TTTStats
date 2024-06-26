/*
REST routes only active if is_debug in server.js is set to true.
These routes might be dangerous and allow direct external access to the db as well as to reset the db.
*/
const express = require("express")
const router = express.Router()
const db = require("../utils/database.js")
const logfile = require("../logfile.js")
const load_logfile = require("../logparsing.js")
const { TrackableIterator } = require("../utils/structs.js")

router.get("/active", function(req, res) {
  res.status(200).send("Dev routes active")
})

router.post("/makedb", async function(req, res) {
  await db.queryAdmin("CreateDB.sql")
  res.status(200).end()
})

router.get("/currentlog", async function(req, res) {
  const cleaned = req.query.cleaned === "true"
  let log = await logfile.fetch_current_log(cleaned)
  res.status(200).send(log)
})

router.get("/logs/:fname", async function(req, res) {
  const fname = req.params.fname
  const log = await logfile.get_log(fname)
  res.status(200).send(log)
})

titer_major = new TrackableIterator([])
titer_minor = new TrackableIterator([])

router.post("/parsealllogs", async function(req, res) {
  let logfiles = await logfile.list_logs()
  logfiles = logfiles.map(logfile => logfile.name)
  logfiles = logfiles.filter(logfile => !logfile.endsWith("raw.log"))
  titer_major = new TrackableIterator(logfiles)

  for (let fname of titer_major) {
    const data = await logfile.get_log(fname)
    titer_minor = new TrackableIterator(data.split("\n"))
    const date = fname.substring(0, 10)
    await load_logfile(titer_minor, fname, date)
  }

  res.status(200).json(
    "Started re-parsing all logs. Note: not checking if log was already parsed!"
  )
})

router.get("/parsealllogsprogress", function (req, res) {
  res.status(200).json({
    "major": titer_major.progress(),
    "minor": titer_minor.progress()
  })
})

module.exports = router