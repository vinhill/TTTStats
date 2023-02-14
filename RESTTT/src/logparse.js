/*
Code for parsing a TTT logfile
*/
const db = require("./utils/database.js")
const LogParser = require("./utils/structs.js").LogParser
const groupBy = require("./group_by.js").groupBy

const regex = (function() {
  //build regexes without worrying about
  // - double-backslashing
  // - adding whitespace for readability
  // - adding in comments
  let clean = (piece) => (piece
    .replace(/((^|\n)(?:[^/\\]|\/[^*/]|\\.)*?)\s*\/\*(?:[^*]|\*[^/])*(\*\/|)/g, '$1')
    .replace(/((^|\n)(?:[^/\\]|\/[^/]|\\.)*?)\s*\/\/[^\n]*/g, '$1')
    .replace(/\n/g, '')
    .replace(/\s+/g, '')
  )
  return ({ raw }, ...interpolations) => (
    new RegExp(interpolations.reduce(
      (regex, insert, index) => (regex + insert + clean(raw[index + 1])),
      clean(raw[0])
    ))
  )
})()

let defaultTeams = new Map();

function timeToSeconds(duration) {
  //04:02.01 to 242.01
  let [minutes, seconds] = duration.split(":")
  return parseInt(minutes) * 60 + parseFloat(seconds)
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function makeSingular(string) {
  // trim away any trailing s
  if (string.at(-1) === "s")
    return string.substr(0, string.length-1)
  else
    return string
}

// maps from what is logged to the team names
function unifyTeamname(group) {
  if (group === "Innos")
    return "Innocent"
  if (group === "Traitors")
    return "Traitor"
  // s at the end, so special plural
  if (group === "ravenous")
    return "Ravenous"
  if (group === "restless")
    return "Restless"
  // else no s at the end, just capitalize and trim trailing s
  return capitalizeFirstLetter(makeSingular(group))
}

function parseEntity(entitystr) {
  // captures class, entity
  // parses things like "Weapon [541][weapon_ttt_m590]""
  if (entitystr === "[NULL Entity]")
    return { class: "Null", entity: "null" }
  else
    return /(?<class>\w*) \[\d*\]\[(?<entity>\w*)\]/.exec(entitystr).groups
}

function onSelectMap(match, state) {
  // captures: map
  state.map = match.map
}

async function onPlayerJoined(match, state) {
  // captures: name
  state.clients.set(match.name, new Client(match.name))
  // add player to player table, if it doesn't exist
  await db.queryAdmin(
    "INSERT IGNORE INTO player (name) VALUES (?)",
    [match.name]
  )
}

async function onRoleAssigned(match, state) {
  // captures: time, name, role
  const role = capitalizeFirstLetter(match.role)
  state.clients.get(match.name).role = role
  // initialize team per role, bodyguard will directly emit CP_RC
  state.clients.get(match.name).team = defaultTeams.get(role)
}

async function onGameStart(match, state) {
  // captures: nothing
  await db.queryAdmin(
    "INSERT INTO game (map, date, duration) VALUES (?, ?, ?)",
    [state.map, state.date, "ongoing"]
  )
  // get the mid of the just inserted round
  let res = await db.query("SELECT mid FROM game ORDER BY mid DESC LIMIT 1", [], false)
  state.mid = res[0].mid
  for (let [name, client] of state.clients) {
    await db.queryAdmin(
      "INSERT INTO participates (mid, player, startrole) VALUES (?, ?, ?)",
      [state.mid, name, client.role]
    )
  }
}

function onRoleChange(match, state) {
  // captures: time, name, oldrole, newrole
  const player = match.name
  const fromrole = capitalizeFirstLetter(match.oldrole)
  const torole = capitalizeFirstLetter(match.newrole)
  const time = timeToSeconds(match.time)

  // happens for spectators
  if (torole === "None" || fromrole === "None")
    return

  // TODO the cause for rolechange would be interesting

  db.queryAdmin(
    "INSERT INTO rolechange (mid, player, fromrole, torole, time) VALUES (?, ?, ?, ?, ?)",
    [state.mid, match.name, fromrole, torole, time]
  )
  state.clients.get(player).role = torole
}

function onTeamChange(match, state) {
  state.clients.get(match.name).team = unifyTeamname(match.newteam)
}

function onBuy(match, state) {
  // captures: time, name, role, equipment
  // not critical so no await
  const role = capitalizeFirstLetter(match.role)
  const time = timeToSeconds(match.time)
  db.queryAdmin(
    "INSERT INTO buys (mid, player, item, time, role) VALUES (?, ?, ?, ?, ?)",
    [state.mid, match.name, match.equipment, time, role]
  )
}

function onLove(match, state) {
  // captures: firstname, secondname
  // not critical so no await
  db.queryAdmin(
    "INSERT INTO loves (mid, first, second) VALUES (?, ?, ?)",
    [state.mid, match.firstname, match.secondname]
  )
}

function onPvPDmg(match, state) {
  // captures: time, type, dmgtype, attacker, atkrole, atkteam, weapon, inflictor, victim, vktrole, vktteam, damage
  const atkrole = capitalizeFirstLetter(match.atkrole)
  const vktrole = capitalizeFirstLetter(match.vktrole)
  let weapon = parseEntity(match.weapon).entity
  const inflictor = parseEntity(match.inflictor)
  const teamdmg = match.atkteam === match.vktteam && match.attacker !== match.victim
  const damage = Math.min(match.damage, 2147483647)

  /*
  If the inflictor isn't the player itself, it might be a projectile or things like a mine.
  That means the weapon in the attackers hand isn't necessarily what caused the kill.
  The same in onPvPKill
  */
  if (inflictor.class !== "Player")
    weapon = inflictor.entity

  state.MatchPvPDmg.push([state.mid, match.victim, vktrole, match.type, match.attacker, atkrole, weapon, teamdmg, damage])
}

function onPvEDmg(match, state) {
  // captures: time, type, dmgtype, weapon, inflictor, victim, vktrole, vktteam, damage
  let vktrole = capitalizeFirstLetter(match.vktrole)
  let damage = Math.min(match.damage, 2147483647)

  state.MatchPvEDmg.push([state.mid, match.victim, vktrole, match.type, damage])
}

function performDmgQuery(match, state) {
  const sum = (vals) => vals.reduce((prev, v) => prev + Number(v), 0)

  const PvPDmgArgs = groupBy(state.MatchPvPDmg, [0, 1, 2, 3, 4, 5, 6, 7], sum)
  for (let args of PvPDmgArgs) {
    db.queryAdmin(
      "INSERT INTO damages (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args
    )
  }
  state.MatchPvPDmg = []

  const PvEDmgArgs = groupBy(state.MatchPvEDmg, [0, 1, 2, 3], sum)
  for (let args of PvEDmgArgs) {
    db.queryAdmin(
      "INSERT INTO damages (mid, player, vktrole, reason, damage) VALUES (?, ?, ?, ?, ?)",
      args
    )
  }
  state.MatchPvEDmg = []
}

async function onPvPKill(match, state) {
  // captures: time, attacker, atkrole, atkteam, weapon, inflictor, victim, vktrole, vktteam
  const atkrole = capitalizeFirstLetter(match.atkrole)
  const vktrole = capitalizeFirstLetter(match.vktrole)
  let weapon = parseEntity(match.weapon).entity
  const inflictor = parseEntity(match.inflictor)
  const time = timeToSeconds(match.time)
  const teamkill = match.atkteam === match.vktteam && match.attacker !== match.victim

  // see onPvPDmg
  if (inflictor.class !== "Player")
    weapon = inflictor.entity

  db.queryAdmin(
    "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [state.mid, match.victim, vktrole, time, match.attacker, atkrole, weapon, teamkill]
  )
}

async function onPvEKill(match, state) {
  // captures: time, inflictor, victim, vktrole, vktteam
  const vktrole = capitalizeFirstLetter(match.vktrole)
  const time = timeToSeconds(match.time)

  db.queryAdmin(
    "INSERT INTO dies (mid, player, vktrole, time) VALUES (?, ?, ?, ?)",
    [state.mid, match.victim, vktrole, time]
  )
}

function onGameEnd(match, state) {
  // captures: team or time
  // consists of two regex for result and time
  if (match.team)
    state.winner = unifyTeamname(match.team)
  if (match.time)
    state.roundtime = timeToSeconds(match.time)
  if (match.timeout)
    state.winner = "Innocent"

  if (state.winner && state.roundtime) {
    db.queryAdmin(
      "UPDATE game SET duration = ? WHERE mid = ?",
      [state.roundtime, state.mid]
    )
    for (let [name, client] of state.clients) {
      const won = state.winner === client.team
      db.queryAdmin(
        "UPDATE participates SET won = ? WHERE mid = ? AND player = ?",
        [won, state.mid, name]
      )
    }

    state.winner = undefined
    state.roundtime = undefined
    for (let [_, client] of state.clients) {
      client.role = undefined
      client.team = undefined
    }
  }
}

function onPlayerLeft(match, state) {
  // captures: name
  state.clients.delete(match.name)
}

function onMediumMsg(match, state) {
  // captures: msg
  db.queryAdmin("INSERT INTO mediumchat (mid, msg) VALUES (?, ?)", [state.mid, match.msg])
}

function onKarmaChange(match, state) {
  // captures: name, karma
  const client = state.clients.get(match.name)
  if (client.karma < 1000 || match.karma < 1000) {
    client.karma = Number(match.karma)
    db.queryAdmin(
      "INSERT INTO karma (mid, player, karma, time) VALUES (?, ?, ?, ?)",
      [state.mid, match.name, client.karma, state.lastdmgtime]
    )
  }
}

class Client {
  constructor(name) {
    this.name = name
    this.role = undefined
    this.team = undefined
    this.karma = 1000
  }
}

async function load_logfile(log, date) {
  const res = await db.query("SELECT name, team FROM roles")
  for (let { name, team } of res)
    defaultTeams.set(name, team)
  
  // initial state
  var lp = new LogParser({
    clients: new Map(),
    date: date,
    mid: 0,
    map: "",
    MatchPvPDmg: [],
    MatchPvEDmg: [],
    lastdmgtime: 0
  })

  lp.register(
    /Map: (?<map>\w+)/,
    "mapname"
  )
  lp.listen("mapname", onSelectMap)

  lp.register(
    /Client "(?<name>\w+)" spawned in server <STEAM_[0-9:]+>/,
    "client_joined"
  )
  lp.listen("client_joined", onPlayerJoined)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - ROUND_START: (?<name>\w+) is (?<role>\w+)/,
    "initial_role"
  )
  lp.listen("initial_role", onRoleAssigned)

  lp.register(
    /Round state: 3/,
    "game_start"
  )
  lp.listen("game_start", onGameStart)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - CP_RC: (?<name>\w+) changed Role from (?<oldrole>\w*) to (?<newrole>\w*)/,
    "role_change"
  )
  lp.listen("role_change", onRoleChange)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - CP_TC: (?<name>\w+) \[(?<role>\w+)\] changed Team from (?<oldteam>\w*) to (?<newteam>\w*)/,
    "team_change"
  )
  lp.listen("team_change", onTeamChange)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - CP_OE: (?<name>\w+) \[(?<role>\w+)\]\s{2}ordered (?<equipment>\w*)/,
    "buy"
  )
  lp.listen("buy", onBuy)

  lp.register(
    /(?<firstname>\w+) is now in love with (?<secondname>\w+)/,
    "love"
  )
  lp.listen("love", onLove)

  lp.register(
    /\[TTT2 Medium Role\] Noisified chat: (?<msg>.*)/,
    "medium_msg"
  )
  lp.listen("medium_msg", onMediumMsg)

  lp.register(
    /(?<name>\w*) \((?<karma>[0-9.]*)\) hurt \w* \([0-9.]*\) and gets (?<type>REWARDED|penalised) for [0-9.]*/,
    "karma"
  )
  lp.listen("karma", onKarmaChange)

  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_DMG \s
      (?<type>FALL|BULLET|EXPL|OTHER\< (?<dmgtype>\d+) \>): \s
      (?<attacker>\w*) \s \[(?<atkrole>\w*), \s (?<atkteam>\w*)\] \s \< (?<weapon> [^\>]* ) \>, \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s damaged \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
      \s for \s
      (?<damage>\d*)
    `,
    "pvp_dmg"
  )
  lp.listen("pvp_dmg", onPvPDmg)
  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_DMG \s
      (?<type>FALL|BULLET|EXPL|OTHER\< (?<dmgtype>\d+) \>):
      \s nonplayer \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s damaged \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
      \s for \s
      (?<damage>\d*)
    `,
    "pve_dmg"
  )
  lp.listen("pve_dmg", onPvEDmg)
  lp.listen("pve_dmg", (match, state) => {
    // catch and ignore vampire world damage
    if (match.dmgtype == 0 && match.damage == 1 && match.vktrole == "vampire" && parseEntity(match.inflictor).name == "worldspawn")
      return false
    return true
  }, 999)
  lp.listen("pvp_dmg", (match, state) => state.lastdmgtime = timeToSeconds(match.time))

  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_KILL: \s
      (?<attacker>\w*) \s \[(?<atkrole>\w*), \s (?<atkteam>\w*)\] \s \< (?<weapon> [^\>]* ) \>, \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s killed \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
    `,
    "pvp_kill"
  )
  lp.listen("pvp_kill", onPvPKill)
  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_KILL: \s
      nonplayer \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s killed \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
    `,
    "pve_kill"
  )
  lp.listen("pve_kill", onPvEKill)

  lp.register(
    /ServerLog: Result: (?<team>\w+) wins?/,
    "result"
  )
  lp.listen("result", onGameEnd)
  lp.register(
    /ServerLog: Result: (?<timeout>timelimit) reached, traitors lose./,
    "timeout"
  )
  lp.listen("timeout", onGameEnd)
  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - ROUND_ENDED at given time/,
    "game_end"
  )
  lp.listen("game_end", onGameEnd)
  lp.listen("game_end", performDmgQuery)

  lp.register(
    /Dropped (?<name>\w*) from server/,
    "leave"
  )
  lp.listen("leave", onPlayerLeft)

  // speed up if many inserts come in a short time
  // otherwise, a flush to disk is performed after each modification
  await db.queryAdmin("SET autocommit=0")

  await lp.read(log)

  await db.queryAdmin("COMMIT")
  await db.queryAdmin("SET autocommit=1")
  db.clearCache()
}

module.exports = {
  load_logfile
}