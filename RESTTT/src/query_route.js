const express = require("express");
const router = express.Router();
const util = require("util");
const db = require("./database.js");
const fs = require('fs');

function loadQuery(queryFileName) {
  return new Promise(function(res,rej){
    const path = `src/queries/${queryFileName}.sql`;

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        rej(err);
      }else{
        res(data);
      }
    })
  });
}

router.post("/custom", async function(req, res, next) {  
  // check request parameters
  let query = req.body.query;
  let auth = req.body.password;
  if (!query) {
    res.status(400).json("The query/custom route requires the 'query' field in the body.");
  }
  if (!auth) {
    res.status(400).json("The query/custom route requires the 'password' field in the body.");
  }
  if (auth != "SuperSecretCustomQueryPassword") {
    res.status(403).json("The provided password is incorrect.");
  }
  
  // give query to next middleware
  req.query = query;
  next();
});

router.get("/Players", async function(req,res,next){
  req.query = "SELECT name FROM player ORDER BY name ASC";
  next();
});

router.get("/PlayerGameCount", async function(req,res,next){
  req.query = "SELECT player, COUNT(mid) as rounds FROM participates GROUP BY player ORDER BY rounds DESC";
  next();
});

router.get("/MapCount", async function(req,res,next){
  req.query = "SELECT map, COUNT(mid) as count FROM round GROUP BY map ORDER BY count DESC";
  next();
});

router.get("/RoleCount", async function(req,res,next){
  req.query = "SELECT roles.role, COUNT(mid) as count, colour "
            + "FROM participates JOIN roles ON roles.role = participates.role "
            + "GROUP BY roles.role "
            + "ORDER BY count DESC";
  next();
});

router.get("/PlayerKillCount", async function(req,res,next){
  req.query = await loadQuery("PlayerKillCount");
  next();
});

router.get("/PlayerRoles/:name", async function(req,res,next){
  let name = req.params.name;
  req.query = "SELECT roles.role, COUNT(mid) as count, colour "
            + "FROM participates JOIN roles ON roles.role = participates.role "
            + "WHERE player = ? "
            + "GROUP BY roles.role "
            + "ORDER BY count DESC";
  req.sqlparams = [name];
  next();
});

router.use("/", async function(req,res,next){
  if(!req.query) {
    // none of the previous query routes were activated
    // pass on to next middleware
    next();
  }
  if(!req.sqlparams) {
    req.sqlparams = [];
  }
  
  // query database and return result
  try{
    let data = null;
    let query = db.format(req.query, req.sqlparams);
    data = await db.getCache(query);
    res.status(200).json(data);
  }catch(e) {
    res.status(400).json(`Could not query database for ${req.query} because of an error: ${e}`);
  }
});

module.exports = router;