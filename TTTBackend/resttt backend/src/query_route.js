const express = require("express");
const router = express.Router();
const util = require("util");
const db = require("./database.js");

router.post("/", async function(req, res, next) {
  let query = req.body.query;
  if (!query) {
    res.status(400).json("Missing sql query in post request body.");
  }
  try{
    res.json(await db.getCache(query));
  }catch(e) {
    res.status(400).json(e);
  }
});

module.exports = router;