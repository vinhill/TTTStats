/*
REST routes only active if is_debug in server.js is set to true.
These routes might be dangerous and allow direct external access to the db as well as to reset the db.
*/
const express = require("express")
const router = express.Router()
const db = require("../utils/database.js")

router.post("/makedb", async function(req, res) {
  db.queryAdmin(await db.readQueryFile("CreateDB.sql"))
  res.status(200).end()
})

module.exports = router