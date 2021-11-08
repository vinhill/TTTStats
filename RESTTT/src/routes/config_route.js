/*
REST routes for loading game configs
*/
const express = require("express");
const router = express.Router();
const db = require("../database.js");
const fetch = require("cross-fetch");
const logparse = require("../logparse.js");

async function get_all_logs() {
  let res = await fetch("https://api.github.com/repos/vinhill/TTTStats/git/trees/main?recursive=1").json();
  let logfiles = res.tree;
  logfiles.filter( f => f.path.startswith("logs/") );
  logfiles.map(f => f.path.substring(5));
}

/*
Mutex for making sure a file isn't parsed twice
The parse route first checks if the filename is in the configs table
to keep track of which files have been parsed and then adds it.
As this involves two async db queries, a mutex here might be good.
*/
var _mutex = false;

router.post("/parse", async function(req,res,next){
  // check request parameters
  let filename = req.body.name;
  let date = req.body.date;
  if (!filename) {
    res.status(400).json("The config/parse route requires the 'name' field in the body. It will be resolved to the URL 'https://raw.githubusercontent.com/vinhill/TTTStats/master/logs/<name>'");
    return;
  }
  if(!date) {
    res.status(400).json("The config/parse route requires the 'date' field in the body.");
    return;
  }
  let date_re = /^....-..-..$/;
  if(!date_re.exec(date)) {
    res.status(400).json("The config/parse route requires a date in the format YYYY-MM-DD");
  }
  
  // race condition with the check for presence, fetching file and declaring presence
  if (_mutex) {
    res.status(400).json("Too many parse calls in too short time.");
    return
  }else {
    _mutex = true;
  }
  
  // check if already present
  let config = await db.queryReader("SELECT * FROM configs WHERE filename = ?", [filename]);
  if (config.length != 0) {
    res.status(409).json(`Config with filename '${filename}' was already parsed.`);
    return;
  }
  
  // retreive log
  let data = null;
  let status = 500;
  try{
    let fetched = await fetch(`https://raw.githubusercontent.com/vinhill/TTTStats/master/logs/${filename}`);
    data = await fetched.text();
    status = fetched.status;
  }catch(e){
    res.status(400).json(`Could not get config file because of an error: ${e}`);
    return;
  }
  if(status != 200) {
    res.status(status).json(`Could not get config file: ${data}`);
  }
  
  // before adding anything to the db, add filename to configs table
  await db.queryAdmin("INSERT INTO configs (filename) VALUES (?)", [filename]);
  _mutex = false;
  
  // parse
  logparse.load_logfile(data.split("\n"), date);
  db.clearCache();
  
  res.status(200).end();
});

module.exports = router;