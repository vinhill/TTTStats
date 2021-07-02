const express = require("express");
const router = express.Router();
const db = require("./database.js");

const join_re = /Client "(?<steam_name>\w*)" spawned in server <(?<steam_id>STEAM_[0-9:]*)> .*/;
const leave_re = /Dropped "(?<steam_name>\w*)" from server<(?<steam_id>STEAM_[0-9:]*)>/;
const fight_re = /ServerLog: (?<time>[0-9:.]*) - (?<type>DMG|KILL):\s+(?<atk_name>\w*) \[(?<atk_role>\w*)\] (damaged|killed) (?<vkt_name>\w*) \[(?<vkt_role>\w*)\]( for (?<dmg>[0-9]*) dmg)?/;
const role_re = /(?<name>\w*) \(STEAM_[0-9:]*\) - (?<role>\w*)/;
const result_re = /ServerLog: Result: (?<group>Innocent|Traitors|Killer|Jester) wins?./;
const map_re = /Map: (?<map>.*)/;
const start_re = /ServerLog: Round proper has begun.../;

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
      await db.queryReader(
        "INSERT OR IGNORE INTO player (name) VALUES (?)",
        [match.groups.steam_name,]
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
      // TODO does this return the inserted row?
      await db.queryReader(
        "INSERT INTO round (map, date) VALUES (?, ?)",
        (map, date)
      );
      // TODO how to get the mid?
      let [res, fields] = await db.queryReader("SELECT mid FROM round ORDER BY mid DESC LIMIT 1");
      let mid = res[0].mid;
      for (let [k, v] of roles.entries()) {
        await db.queryReader(
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
      let atkrole = match.groups.atk_role.capitalize();
      let vktrole = match.groups.vkt_role.capitalize();
      let time = match.groupstime;
      if (match.groups.type == "DMG") {
        await db.queryReader(
          "INSERT INTO damages (mid, attacker, victim, atkrole, vktrole, time, damage) VALUES (?, ?, ?, ?, ?, ?, ?)",
          (mid, attacker, victim, atkrole, vktrole, time, match.groups.dmg)
        );
      } else {
        await db.queryReader(
          "INSERT INTO kills (mid, attacker, victim, atkrole, vktrole, time) VALUES (?, ?, ?, ?, ?, ?)",
          (mid, attacker, victim, atkrole, vktrole, time)
        );
      }
      continue;
    }
    
    // round result
    match = result_re.exec(line);
    if (match) {
      db.queryReader(
        "UPDATE round SET winner_team = ? WHERE mid = ?",
        (match.groups.group, mid)
      );
      continue;
    }
  }
}

router.post("/parse", async function(req,res,next){
  // check request parameters
  let filename = req.body.name;
  if (!filename) {
    res.status(400).json("The config/parse route requires the 'name' field in the body. It will be resolved to the URL 'https://raw.githubusercontent.com/vinhill/TTTStats/master/logs/<name>'");
    return;
  }
  
  // check if already present
  let config = await db.queryReader("SELECT * FROM configs WHERE filename = ?", [filename]);
  if (config.length != 0) {
    res.status(409).json(`Config with filename '${filename}' was already parsed.`);
    return;
  }
  
  // retreive log
  let data = null;
  try{
    let fetched = await fetch(`https://raw.githubusercontent.com/vinhill/TTTStats/master/logs/${filename}`);
    let data = await fetched.text();
  }catch(e){
    res.status(400).json(`Could not get config file because of an error: ${e}`);
    return;
  }
  
  // parse
  update_db_through_log(data.split("\n"));
  db.clearCache();
  res.status(200).end();
});

module.exports = router;