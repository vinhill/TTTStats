/*
Code for parsing a TTT logfile
*/
const db = require("./utils/database.js")
const LogParser = require("./utils/structs.js").LogParser
const logger = require("./utils/logger.js")
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
function translateWinner(group) {
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
  state.clients.add(match.name)
  // add player to player table, if it doesn't exist
  await db.queryAdmin(
    "INSERT IGNORE INTO player (name) VALUES (?)",
    [match.name]
  )
}

function onRoleAssigned(match, state) {
  // captures: time, name, role
  state.roles.set(match.name, capitalizeFirstLetter(match.role))
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
  for (let [k, v] of state.roles.entries()) {
    // init mainrole as startrole, even for e.g. amnesiac in case he doesn't switch
    await db.queryAdmin(
      "INSERT INTO participates (mid, player, startrole, mainrole) VALUES (?, ?, ?, ?)",
      [state.mid, k, v, v]
    )
  }
}

function onRoleChange(match, state) {
  // captures: time, name, oldrole, newrole
  let player = match.name
  let fromrole = capitalizeFirstLetter(match.oldrole)
  let torole = capitalizeFirstLetter(match.newrole)

  // happens for spectators
  // TODO does it happen elsewhere?
  if (torole === "None" || fromrole === "None")
    return

  // TODO the cause for rolechange would be interesting

  db.queryAdmin(
    "INSERT INTO rolechange (mid, player, fromrole, torole, time) VALUES (?, ?, ?, ?, ?)",
    [state.mid, match.name, fromrole, torole, match.time]
  )
  state.roles[player] = torole
}

function onBuy(match, state) {
  // captures: time, name, role, equipment
  // not critical so no await
  let role = capitalizeFirstLetter(match.role)
  db.queryAdmin(
    "INSERT INTO buys (mid, player, item, time, role) VALUES (?, ?, ?, ?, ?)",
    [state.mid, match.name, match.equipment, match.time, role]
  )
}

function onLove(match, state) {
  // captures: firstname, secondname
  // not critical so no await
  db.queryAdmin(
    "INSERT INTO loves (mid, first, second) VALUES (?, ?, ?)",
    [state.mid, match.firstname, match.secondname]
  )
  // TODO not tested, as currently no message is logged
}

function onRespawn(match, state) {
  // captures: time, name
  // not critical so no await
  db.queryAdmin(
    "INSERT INTO revives (mid, player, time) VALUES (?, ?, ?)",
    [state.mid, match.name, match.time]
  )
  // TODO reason i.e. defibrillator would be interesting
}

function onPvPDmg(match, state) {
  // captures: time, type, dmgtype, attacker, atkrole, atkteam, weapon, inflictor, victim, vktrole, vktteam, damage
  let atkrole = capitalizeFirstLetter(match.atkrole)
  let vktrole = capitalizeFirstLetter(match.vktrole)
  let weapon = parseEntity(match.weapon).entity
  let inflictor = parseEntity(match.inflictor)
  let teamdmg = match.atkteam === match.vktteam && match.attacker !== match.victim
  let damage = Math.min(match.damage, 2147483647)

  // TODO check if this always holds
  /*
  If the inflictor isn't the player itself, it might be a projectile or things like a mine.
  That means the weapon in the attackers hand isn't necessarily what caused the kill.
  The same in onPvPKill
  */
  if (inflictor.class !== "Player")
    weapon = inflictor.entity

  state.MatchPvPDmg.push([state.mid, match.victim, vktrole, match.type, match.attacker, atkrole, weapon, teamdmg, damage])
  // TODO track specific rolechanges, like zombie and cursed here?
}

function onPvEDmg(match, state) {
  // captures: time, type, dmgtype, weapon, inflictor, victim, vktrole, vktteam, damage
  let vktrole = capitalizeFirstLetter(match.vktrole)
  let damage = Math.min(match.damage, 2147483647)
  // TODO use the inflictor somehow?

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
  let atkrole = capitalizeFirstLetter(match.atkrole)
  let vktrole = capitalizeFirstLetter(match.vktrole)
  let weapon = parseEntity(match.weapon).entity
  let inflictor = parseEntity(match.inflictor)
  let teamkill = match.atkteam === match.vktteam && match.attacker !== match.victim

  // see onPvPDmg
  if (inflictor.class !== "Player")
    weapon = inflictor.entity

  db.queryAdmin(
    "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [state.mid, match.victim, vktrole, match.time, match.attacker, atkrole, weapon, teamkill]
  )
}

async function onPvEKill(match, state) {
  // captures: time, inflictor, victim, vktrole, vktteam
  let vktrole = capitalizeFirstLetter(match.vktrole)

  db.queryAdmin(
    "INSERT INTO dies (mid, player, vktrole, time) VALUES (?, ?, ?, ?)",
    [state.mid, match.victim, vktrole, match.time]
  )
}

function onGameEnd(match, state) {
  // captures: team or time
  // consists of two regex for result and time
  if (match.team)
    state.winner = translateWinner(match.team)
  if (match.time)
    state.roundtime = match.time
  if (match.timeout)
    state.winner = "Innocent"

  if (state.winner && state.roundtime) {
    db.queryAdmin(
      "UPDATE game SET duration = ? WHERE mid = ?",
      [state.roundtime, state.mid]
    )
    db.queryAdmin(
      "INSERT INTO wins (mid, team) VALUES (?, ?)",
      [state.mid, state.winner]
    )
    // TODO add bodyguard, sidekick etc. as winner, if needed

    state.winner = undefined
    state.roundtime = undefined
    state.roles.clear()
  }
}

function onPlayerLeft(match, state) {
  // captures: name
  state.clients.delete(match.name)
  state.roles.delete(match.name)
}

async function load_logfile(log, date) {
  // TODO inserting is slow, maybe start a transaction or check the primary key increment?

  // initial state
  var lp = new LogParser({
    clients: new Set(),
    roles: new Map(),
    date: date,
    mid: 0,
    map: "",
    MatchPvPDmg: [],
    MatchPvEDmg: []
  })

  // map selection
  lp.attach(
    /Map: (?<map>\w+)/,
    onSelectMap
  )

  // join
  lp.attach(
    /Client "(?<name>\w+)" spawned in server <STEAM_[0-9:]+>/,
    onPlayerJoined
  )

  // role assignment
  lp.attach(
    /ServerLog: (?<time>[0-9:.]*) - ROUND_START: (?<name>\w+) is (?<role>\w+)/,
    onRoleAssigned
  )

  // game start
  lp.attach(
    /\[TTT2\]:\s*The round has begun!/,
    onGameStart
  )

  // role change
  lp.attach(
    /ServerLog: (?<time>[0-9:.]*) - CP_RC: (?<name>\w+) changed Role from (?<oldrole>\w*) to (?<newrole>\w*)/,
    onRoleChange
  )

  // equipment buy
  lp.attach(
    /ServerLog: (?<time>[0-9:.]*) - CP_OE: (?<name>\w+) \[(?<role>\w+)\]\s{2}ordered (?<equipment>\w*)/,
    onBuy
  )

  // cupid love
  lp.attach(
    /(?<firstname>\w+) is now in love with (?<secondname>\w+)/,
    onLove
  )

  // revive
  lp.attach(
    /ServerLog: (?<time>[0-9:.]*) - TTT2Revive: (?<name>\w+) has been respawned/,
    onRespawn
  )

  // damage
  lp.attach(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_DMG \s
      (?<type>FALL|BULLET|EXPL|OTHER\< (?<dmgtype>\d+) \>): \s
      (?<attacker>\w*) \s \[(?<atkrole>\w*), \s (?<atkteam>\w*)\] \s \< (?<weapon> [^\>]* ) \>, \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s damaged \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
      \s for \s
      (?<damage>\d*)
    `,
    onPvPDmg
  )
  lp.attach(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_DMG \s
      (?<type>FALL|BULLET|EXPL|OTHER\< (?<dmgtype>\d+) \>):
      \s nonplayer \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s damaged \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
      \s for \s
      (?<damage>\d*)
    `,
    onPvEDmg
  )
  // catch and ignore vampire world damage
  lp.attach(
    /ServerLog: (?<time>[0-9:.]*) - CP_DMG OTHER<0>: nonplayer \(Entity \[0\]\[worldspawn\]\) damaged \w+ \[vampire, traitors\] for 1/,
    () => false,
    999
  )

  // death
  lp.attach(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_KILL: \s
      (?<attacker>\w*) \s \[(?<atkrole>\w*), \s (?<atkteam>\w*)\] \s \< (?<weapon> [^\>]* ) \>, \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s killed \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
    `,
    onPvPKill
  )
  lp.attach(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_KILL: \s
      nonplayer \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s killed \s
      (?<victim>\w*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
    `,
    onPvEKill
  )

  // game result
  lp.attach(
    /ServerLog: Result: (?<team>\w+) wins?/,
    onGameEnd
  )
  lp.attach(
    /ServerLog: Result: (?<timeout>timelimit) reached, traitors lose./,
    onGameEnd
  )
  lp.attach(
    /ServerLog: (?<time>[0-9:.]*) - ROUND_ENDED at given time/,
    onGameEnd
  )
  lp.attach(
    /ServerLog: [0-9:.]* - ROUND_ENDED at given time/,
    performDmgQuery  
  )

  // leave
  lp.attach(
    /Dropped (?<name>\w*) from server/,
    onPlayerLeft
  )

  // speed up if many inserts come in a short time
  // otherwise, a flush to disk is performed after each modification
  await db.queryAdmin("SET autocommit=0")

  await lp.exec(log)

  await db.queryAdmin("COMMIT")
  await db.queryAdmin("SET autocommit=1")
  db.clearCache()
}

module.exports = {
  load_logfile
}