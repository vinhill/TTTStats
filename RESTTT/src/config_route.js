/*
REST routes for loading game configs
*/
const express = require("express");
const router = express.Router();
const db = require("./database.js");
const fetch = require("node-fetch");

const join_re = /Client "(?<steam_name>\w*)" spawned in server <(?<steam_id>STEAM_[0-9:]*)> .*/;
const leave_re = /Dropped "(?<steam_name>\w*)" from server<(?<steam_id>STEAM_[0-9:]*)>/;
const fight_re = /ServerLog: (?<time>[0-9:.]*) - (?<type>DMG|KILL):\s+(?<atk_name>\w*) \[(?<atk_role>\w*)\] (damaged|killed) (?<vkt_name>\w*) \[(?<vkt_role>\w*)\]( for (?<dmg>[0-9]*) dmg)?/;
const role_re = /(?<name>\w*) \(STEAM_[0-9:]*\) - (?<role>\w*)/;
const result_re = /ServerLog: Result: (?<group>Innocent|Traitors|Killer|Jester) wins?./;
const map_re = /Map: (?<map>.*)/;
const start_re = /ServerLog: Round proper has begun.../;

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function update_db_through_log(log, date) {
  let clients = new Set();
  let roles = new Map();
  let mid = null;
  let map = null;

  for (let line of log) {
    // join
    let match = join_re.exec(line);
    if (match) {
     clients.add(match.groups.steam_name);
      // add player to player table, if it doesn't exist
      await db.queryAdmin(
        "INSERT IGNORE INTO player (name) VALUES (?)",
        [match.groups.steam_name]
      );
      continue;
    }
    
    // leave
    match = leave_re.exec(line);
    if(match) {
      clients.remove(match.groups.steam_name);
      roles.pop(match.groups.steam_name);
      continue;
    }
    
    // map
    match = map_re.exec(line);
    if (match) {
      map = match.groups.map;
      continue;
    }
    
    // role assignment
    match = role_re.exec(line);
    if (match) {
      roles.set(match.groups.name, match.groups.role);
      continue;
    }
    
    // round started
    match = start_re.exec(line);
    if (match) {
      await db.queryAdmin(
        "INSERT INTO round (map, date) VALUES (?, ?)",
        [map, date]
      );
      // get the mid of the just inserted round
      let res = await db.queryReader("SELECT mid FROM round ORDER BY mid DESC LIMIT 1");
      let mid = res[0].mid;
      for (let [k, v] of roles.entries()) {
        await db.queryAdmin(
          "INSERT INTO participates (mid, player, role) VALUES (?, ?, ?)",
          [mid, k, v]
        );
      }
      continue;
    }
    
    // DMG or KILL
    match = fight_re.exec(line);
    if (match) {
      let attacker = match.groups.atk_name;
      let victim = match.groups.vkt_name;
      // for some reason, this log entry isn't capitalized
      let atkrole = capitalizeFirstLetter(match.groups.atk_role);
      let vktrole = capitalizeFirstLetter(match.groups.vkt_role);
      let time = match.groups.time;
      if (match.groups.type == "DMG") {
        await db.queryAdmin(
          "INSERT INTO damages (mid, attacker, victim, atkrole, vktrole, time, damage) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [mid, attacker, victim, atkrole, vktrole, time, match.groups.dmg]
        );
      } else {
        await db.queryAdmin(
          "INSERT INTO kills (mid, attacker, victim, atkrole, vktrole, time) VALUES (?, ?, ?, ?, ?, ?)",
          [mid, attacker, victim, atkrole, vktrole, time]
        );
      }
      continue;
    }
    
    // round result
    match = result_re.exec(line);
    if (match) {
      db.queryAdmin(
        "UPDATE round SET winner = ? WHERE mid = ?",
        [match.groups.group, mid]
      );
      continue;
    }
  }
}

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
  
  // parse
  update_db_through_log(data.split("\n"), date);
  db.clearCache();
  res.status(200).end();
  
  // if everything worked, add filename to configs table
  await db.queryAdmin("INSERT INTO configs (filename) VALUES (?)", [filename]);
});

module.exports = router;