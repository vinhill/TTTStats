/*
REST routes only active if is_debug in server.js is set to true.
These routes might be dangerous and allow direct external access to the db as well as to reset the db.
*/
const express = require("express");
const router = express.Router();
const path = require('path');
const db = require("../database.js");

router.get("/", function(req,res,next) {
  res.sendFile(path.join(__dirname, '/../dev.html'));
})

router.get("/makedb", async function(req,res,next){
  db.queryAdmin(await db.readQueryFile("CreateDB"));
  res.status(200).end();
});

module.exports = router;