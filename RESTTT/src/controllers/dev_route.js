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
  db.queryAdmin("CreateDB.sql")
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

module.exports = router