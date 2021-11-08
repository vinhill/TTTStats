/*
Code for parsing a TTT logfile
*/
const db = require("./database.js");
const fetch = require("cross-fetch");
const LogParser = require("./structs.js").LogParser;

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function player_joined(match, state) {
  state.clients.add(match.groups.steam_name);
    // add player to player table, if it doesn't exist
  await db.queryAdmin(
    "INSERT IGNORE INTO player (name) VALUES (?)",
    [match.groups.steam_name]
  );
}

async function player_left(match, state) {
  state.clients.remove(match.groups.steam_name);
  state.roles.pop(match.groups.steam_name);
}

async function player_fight(match, state) {
  let attacker = match.groups.atk_name;
  let victim = match.groups.vkt_name;
  // for some reason, this log entry isn't capitalized
  let atkrole = capitalizeFirstLetter(match.groups.atk_role);
  let vktrole = capitalizeFirstLetter(match.groups.vkt_role);
  let time = match.groups.time;
  if (match.groups.type == "DMG") {
    await db.queryAdmin(
      "INSERT INTO damages (mid, attacker, victim, atkrole, vktrole, time, damage) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [state.mid, attacker, victim, atkrole, vktrole, time, match.groups.dmg]
    );
  } else {
    await db.queryAdmin(
      "INSERT INTO kills (mid, attacker, victim, atkrole, vktrole, time) VALUES (?, ?, ?, ?, ?, ?)",
      [state.mid, attacker, victim, atkrole, vktrole, time]
    );
  }
}

async function game_end(match, state) {
  db.queryAdmin(
    "UPDATE round SET winner = ? WHERE mid = ?",
    [match.groups.group, state.mid]
  );
}

async function game_start(match, state) {
  await db.queryAdmin(
    "INSERT INTO round (map, date) VALUES (?, ?)",
    [state.map, state.date]
  );
  // get the mid of the just inserted round
  let res = await db.queryReader("SELECT mid FROM round ORDER BY mid DESC LIMIT 1");
  let mid = res[0].mid;
  for (let [k, v] of state.roles.entries()) {
    await db.queryAdmin(
      "INSERT INTO participates (mid, player, role) VALUES (?, ?, ?)",
      [mid, k, v]
    );
  }
}

async function load_logfile(log, date) {
  // initial state
  var lp = new LogParser({
    clients: new Set(),
    roles: new Map(),
    date: date,
    mid: 0,
    map: ""
  });
  
  // join
  const join_re = /Client "(?<steam_name>\w*)" spawned in server <(?<steam_id>STEAM_[0-9:]*)> .*/;
  lp.attach(join_re, player_joined);
  
  // leave
  const leave_re = /Dropped "(?<steam_name>\w*)" from server<(?<steam_id>STEAM_[0-9:]*)>/;
  lp.attach(leave_re, player_left);
  
  // role assignment
  const role_re = /(?<name>\w*) \(STEAM_[0-9:]*\) - (?<role>\w*)/;
  lp.attach(role_re, function(match, state) {
      state.roles.set(match.groups.name, match.groups.role);
  });
  
  // map selection
  const map_re = /Map: (?<map>.*)/;
  lp.attach(map_re, function(match, state) {
    state.map = match.groups.map;
  });
  
  // kill or damage
  const fight_re = /ServerLog: (?<time>[0-9:.]*) - (?<type>DMG|KILL):\s+(?<atk_name>\w*) \[(?<atk_role>\w*)\] (damaged|killed) (?<vkt_name>\w*) \[(?<vkt_role>\w*)\]( for (?<dmg>[0-9]*) dmg)?/;
  lp.attach(fight_re, player_fight);
  
  // game result
  const result_re = /ServerLog: Result: (?<group>Innocent|Traitors|Killer|Jester) wins?./;
  lp.attach(result_re, game_end);
  
  // game start
  const start_re = /ServerLog: Round proper has begun.../;
  lp.attach(start_re, game_start);
  
  await lp.exec(log);
}

module.exports = {
  load_logfile
};