const db = require("./utils/database.js")
const groupBy = require("./group_by.js").groupBy
const logger = require("./utils/logger.js")
const { LogParser, DuplicateFilter } = require("./logparser.js")
const { promisefy } = require("./utils/dbpool.js")
const { DB_QER_TIMEOUT } = require("./utils/config.js")

let con;

function query(querystr, params=[]) {
  if (con === undefined)
    throw new Error("Database connection not established")
  return promisefy(con.query.bind(con), {
    sql: querystr,
    values: params,
    timeout: DB_QER_TIMEOUT
  },).catch(err => { 
    logger.error("Logparser", `Query '${querystr}' failed: ${err}`)
    throw err
  })
}

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
    return /(?<class>\w*) \[\d*\]\[(?<entity>(\w|\s)*)\]/.exec(entitystr).groups
}

function onSelectMap(match, state) {
  // captures: map
  state.map = match.map
}

async function onRoleAssigned(match, state) {
  // captures: time, name, role, team
  const client = new Client(match.name)
  client.role = capitalizeFirstLetter(match.role)
  client.team = unifyTeamname(match.team)
  state.clients.set(match.name, client)

  await query(
    "INSERT IGNORE INTO player (name) VALUES (?)",
    [match.name]
  )
}

async function onGameStart(match, state) {
  // captures: nothing
  await query(
    "INSERT INTO game (map, date, duration) VALUES (?, ?, ?)",
    [state.map, state.date, 0]
  )

  // get the mid of the just inserted round
  let res = await query("SELECT mid FROM game ORDER BY mid DESC LIMIT 1", [], false)
  state.mid = res[0].mid
  for (let [name, client] of state.clients) {
    await query(
      "INSERT INTO participates (mid, player, startrole) VALUES (?, ?, ?)",
      [state.mid, name, client.role]
    )
  }
}

function onRoleChange(match, state) {
  if (state.stage !== "active") return
  // captures: time, name, oldrole, newrole
  const player = match.name
  const fromrole = capitalizeFirstLetter(match.oldrole)
  const torole = capitalizeFirstLetter(match.newrole)
  const time = timeToSeconds(match.time)

  // happens for spectators
  if (torole === "None" || fromrole === "None")
    return

  // TODO the cause for rolechange would be interesting

  query(
    "INSERT INTO rolechange (mid, player, orig, dest, time) VALUES (?, ?, ?, ?, ?)",
    [state.mid, match.name, fromrole, torole, time]
  )
  state.clients.get(player).role = torole
}

function onTeamChange(match, state) {
  if (state.stage !== "active") return
  state.clients.get(match.name).team = unifyTeamname(match.newteam)
}

function onBuy(match, state) {
  // captures: time, name, role, equipment
  // not critical so no await
  const role = capitalizeFirstLetter(match.role)
  const time = timeToSeconds(match.time)
  query(
    "INSERT INTO buys (mid, player, item, time, role) VALUES (?, ?, ?, ?, ?)",
    [state.mid, match.name, match.equipment, time, role]
  )
}

// note that depending on role settings, cupid and two lovers join together
const LoveHandle = {
  init() {
    this.time = "00:00.00"
    this.lovers = []
  },
  onTC(match, state) {
    if (match.newteam != "lovers")
      return

    if (match.time == this.time) {
      this._pushdb(match.name, state.mid)
      this.lovers.push(match.name)
    } else {
      this.time = match.time
      this.lovers = [match.name]
    }
  },
  _pushdb(newlover, mid) {
    for (const lover of this.lovers) {
      query(
        "INSERT INTO teamup (mid, first, second, reason) VALUES (?, ?, ?, 'love')",
        [mid, ...([lover, newlover]).sort()]
      )
    }
  }
}

function jackalTeamup(match, state) {
  let weapon = parseEntity(match.weapon).entity
  if (weapon !== "weapon_ttt2_sidekickdeagle")
    return

  query(
    "INSERT INTO teamup (mid, first, second, reason) VALUES (?, ?, ?, 'jackal')",
    [state.mid, match.attacker, match.victim]
  )
}

function sheriffTeamup(match, state) {
  let weapon = parseEntity(match.weapon).entity
  if (weapon !== "weapon_ttt2_deputydeagle")
    return

  query(
    "INSERT INTO teamup (mid, first, second, reason) VALUES (?, ?, ?, 'sheriff')",
    [state.mid, match.attacker, match.victim]
  )
}

const DamageHandler = {
  init() {
    this.pvp_dmg = []
    this.pve_dmg = []
  },
  pvp(match, state) {
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

    this.pvp_dmg.push([state.mid, match.victim, vktrole, match.type, match.attacker, atkrole, weapon, teamdmg, damage])
  },
  pve(match, state) {
    // captures: time, type, dmgtype, weapon, inflictor, victim, vktrole, vktteam, damage
    let vktrole = capitalizeFirstLetter(match.vktrole)
    let damage = Math.min(match.damage, 2147483647)

    this.pve_dmg.push([state.mid, match.victim, vktrole, match.type, damage])
  },
  insert() {
    const sum = (vals) => vals.reduce((prev, v) => prev + Number(v), 0)

    const PvPDmgArgs = groupBy(this.pvp_dmg, [0, 1, 2, 3, 4, 5, 6, 7], sum)
    for (let args of PvPDmgArgs) {
      args[8] = Math.min(args[8], 2147483647) // clamp to max int32
      query(
        "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args
      )
    }

    const PvEDmgArgs = groupBy(this.pve_dmg, [0, 1, 2, 3], sum)
    for (let args of PvEDmgArgs) {
      args[4] = Math.min(args[4], 2147483647) // clamp to max int32
      query(
        "INSERT INTO damage (mid, player, vktrole, reason, damage) VALUES (?, ?, ?, ?, ?)",
        args
      )
    }
  }
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

  query(
    "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [state.mid, match.victim, vktrole, time, match.attacker, atkrole, weapon, teamkill]
  )
}

async function onPvEKill(match, state) {
  // captures: time, inflictor, victim, vktrole, vktteam
  const vktrole = capitalizeFirstLetter(match.vktrole)
  const time = timeToSeconds(match.time)

  query(
    "INSERT INTO dies (mid, player, vktrole, time) VALUES (?, ?, ?, ?)",
    [state.mid, match.victim, vktrole, time]
  )
}

const gameEndListener = {
  init() {
    this.winner = undefined
    this.duration = undefined
  },
  onResult(match, state) {
    this.winner = unifyTeamname(match.team)
    this.trySubmit(state)
  },
  onTie(match, state) {
    this.winner = "No-one"
    this.trySubmit(state)
  },
  onTimeout(match, state) {
    this.winner = "Innocent"
    this.trySubmit(state)
  },
  onGameDuration(match, state) {
    this.duration = timeToSeconds(match.time)
    this.trySubmit(state)
  },
  trySubmit(state) {
    if (this.winner === undefined || this.duration === undefined)
      return
    
    query(
      "UPDATE game SET duration = ? WHERE mid = ?",
      [this.duration, state.mid]
    )

    for (let [name, client] of state.clients) {
      let won = this.winner === client.team
      if (client.role === "Lootgoblin")
        won = client.alive
      query(
        "UPDATE participates SET won = ? WHERE mid = ? AND player = ?",
        [won, state.mid, name]
      )
    }
  }
}

function resetState(match, state) {
  state.clients.clear()
}

function onMediumMsg(match, state) {
  // captures: msg
  query("INSERT INTO mediumchat (mid, msg) VALUES (?, ?)", [state.mid, match.msg])
}

const karmaTracker = {
  // TODO maybe aggregate many small karma changed from damage?
  init() {
    this.last_dmg_time = 0
  },
  onInitKarma(match, state) {
    query(
      "INSERT INTO karma (mid, player, karma, time) VALUES (?, ?, ?, ?)",
      [state.mid, match.name, Number(match.karma), 0]
    )
  },
  onPvPDmg(match, state) {
    // to track the time of the next karma change
    this.last_dmg_time = timeToSeconds(match.time)
  },
  onKarma(match, state) {
    // captures: name, karma
    const client = state.clients.get(match.name)
    if (client.karma < 10000 || match.karma < 10000) {
      client.karma = Number(match.karma)
      query(
        "INSERT INTO karma (mid, player, karma, time) VALUES (?, ?, ?, ?)",
        [state.mid, match.name, client.karma, this.last_dmg_time]
      )
    }
  }
}

function captureVampireDmg(match, state) {
  // catch and ignore vampire world damage
  if (match.dmgtype == 0
      && match.damage == 1
      && match.vktrole == "vampire"
      && parseEntity(match.inflictor).entity == "worldspawn")
    return false
  return true
}

function captureCursed(match, state) {
  if (match.vktrole == "cursed") return false;
  return true;
}

const surviveTracker = {
  death(match, state) {
    state.clients.get(match.victim).alive = false
  },
  revive(match, state) {
    state.clients.get(match.name).alive = true
  },
  gameEnd(match, state) {
    for (const [name, client] of state.clients)
      query(
        "UPDATE participates SET survived = ? WHERE mid = ? AND player = ?",
        [client.alive, state.mid, name]
    )
  }
}

class Client {
  constructor(name) {
    this.name = name
    this.role = undefined
    this.team = undefined
    this.karma = 10000
    this.alive = true
  }
}

function createParser(date) {
  // initial state
  const lp = new LogParser({
    clients: new Map(),
    date: date,
    mid: 0,
    map: "",
    stage: null
  })

  lp.register(
    /CP map: (?<map>\w+)/,
    "mapname"
  )
  lp.listen("mapname", onSelectMap)

  lp.register(
    /CP round state: (?<stage>\w+)/,
    "round_state"
  )
  lp.listen("round_state", (match, state) => state.stage = match.stage)

  lp.register(
    /CP round state: prep/,
    "init_round"
  )
  lp.subscribe("init_round", karmaTracker, "init")
  lp.subscribe("init_round", gameEndListener, "init")
  lp.subscribe("init_round", DamageHandler, "init")
  lp.subscribe("init_round", LoveHandle, "init")
  lp.listen("init_round", resetState)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - ROUND_START: (?<name>(\w|\s)+) \[(?<role>\w+), (?<team>\w+)\]/,
    "initial_role"
  )
  lp.listen("initial_role", onRoleAssigned)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - INIT_KARMA: (?<name>(\w|\s)+) \[\w+, \w+\] karma (?<karma>[0-9.]*)/,
    "init_karma"
  )
  lp.subscribe("init_karma", karmaTracker, "onInitKarma")

  lp.register(
    /CP round state: active/,
    "game_start"
  )
  lp.listen("game_start", onGameStart)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - CP_RC: (?<name>(\w|\s)+) \[\w+, \w+\] changed Role from \[(?<oldrole>\w*)\] to \[(?<newrole>\w*)\]/,
    "role_change"
  )
  lp.listen("role_change", onRoleChange)

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - CP_TC: (?<name>(\w|\s)+) \[\w+, \w+\] changed Team from \[(?<oldteam>\w*)\] to \[(?<newteam>\w*)\]/,
    "team_change"
  )
  lp.listen("team_change", onTeamChange)
  lp.subscribe("team_change", LoveHandle, "onTC")

  lp.register(
   /ServerLog: (?<time>[0-9:.]*) - TTT2Revive: (?<name>(\w|\s)+) has been respawned./,
   "revive" 
  )
  lp.subscribe("revive", surviveTracker, "revive")

  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - CP_OE: (?<name>(\w|\s)+) \[(?<role>\w+), (?<team>\w+)\] ordered (?<equipment>\w*)/,
    "buy"
  )
  lp.listen("buy", onBuy)

  lp.register(
    /\[TTT2 Medium Role\] Noisified chat: (?<msg>.*)/,
    "medium_msg"
  )
  lp.listen("medium_msg", onMediumMsg)

  lp.register(
    /(?<name>(\w|\s)+) \((?<karma>[0-9.]*)\) hurt (\w|\s)+ \([0-9.]*\) and gets (?<type>REWARDED|penalised for) [0-9.]*/,
    "karma"
  )
  lp.subscribe("karma", karmaTracker, "onKarma")

  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_DMG \s
      (?<type>FALL|BULLET|EXPL|OTHER\< (?<dmgtype>\d+) \>): \s
      (?<attacker>(\w|\s)*) \s \[(?<atkrole>\w*), \s (?<atkteam>\w*)\] \s \< (?<weapon> [^\>]* ) \>, \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s damaged \s
      (?<victim>(\w|\s)*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
      \s for \s
      (?<damage>\d*)
    `,
    "pvp_dmg"
  )
  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_DMG \s
      (?<type>FALL|BULLET|EXPL|OTHER\< (?<dmgtype>\d+) \>):
      \s nonplayer \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s damaged \s
      (?<victim>(\w|\s)*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
      \s for \s
      (?<damage>\d*)
    `,
    "pve_dmg"
  )
  lp.listen("pve_dmg", captureVampireDmg, 999)
  lp.subscribe("pvp_dmg", DamageHandler, "pvp")
  lp.subscribe("pve_dmg", DamageHandler, "pve")
  lp.subscribe("pvp_dmg", karmaTracker, "onPvPDmg")
  lp.listen("pvp_dmg", jackalTeamup)
  lp.listen("pvp_dmg", sheriffTeamup)
  // sidekick, deputy deagle for some reason fire twice
  lp.subscribe("pvp_dmg", new DuplicateFilter((match) => {
    const weapon = parseEntity(match.weapon).entity  
    return weapon === "weapon_ttt2_sidekickdeagle" || weapon === "weapon_ttt2_deputydeagle"
  }), 'filter', 999)

  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_KILL: \s
      (?<attacker>(\w|\s)*) \s \[(?<atkrole>\w*), \s (?<atkteam>\w*)\] \s \< (?<weapon> [^\>]* ) \>, \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s killed \s
      (?<victim>(\w|\s)*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
    `,
    "pvp_kill"
  )
  lp.listen("pvp_kill", captureCursed, 999)
  lp.listen("pvp_kill", onPvPKill)
  lp.subscribe("pvp_kill", surviveTracker, "death")
  lp.register(
    regex`
      ServerLog: \s (?<time>[0-9:.]*) \s-\s CP_KILL: \s
      nonplayer \s \( (?<inflictor> [^\)]*(, \s \w*)? ) \)
      \s killed \s
      (?<victim>(\w|\s)*) \s \[(?<vktrole>\w*), \s (?<vktteam>\w*)\]
    `,
    "pve_kill"
  )
  lp.listen("pve_kill", captureCursed, 999)
  lp.listen("pve_kill", onPvEKill)
  lp.subscribe("pve_kill", surviveTracker, "death")

  lp.register(
    /ServerLog: Result: (?<team>\w+) wins?/,
    "result_win"
  )
  lp.subscribe("result_win", gameEndListener, "onResult")
  lp.register(
    /ServerLog: Result: No-one wins?/,
    "result_tie"
  )
  lp.subscribe("result_tie", gameEndListener, "onTie")
  lp.register(
    /ServerLog: Result: (?<timeout>timelimit) reached, traitors lose./,
    "timeout"
  )
  lp.subscribe("timeout", gameEndListener, "onTimeout")
  lp.register(
    /ServerLog: (?<time>[0-9:.]*) - ROUND_ENDED at given time/,
    "game_duration"
  )
  lp.subscribe("game_duration", gameEndListener, "onGameDuration")
  lp.register(
    /CP round state: post/,
    "game_end"
  )
  lp.subscribe("game_end", DamageHandler, "insert")
  lp.subscribe("game_end", surviveTracker, "gameEnd")

  return lp
}

// log can be a TrackableIterator
async function load_logfile(log, fname, date) {
  const lp = createParser(date)

  const pool = db.getPool("admin")
  // acquire a single connection for the whole file for the transaction to work
  con = await promisefy(pool.acquire.bind(pool))

  try {
    await query("START TRANSACTION")
  
    await query("INSERT INTO configs (filename) VALUES (?)", [fname])
  
    await lp.read(log)
  
    await query("COMMIT")
  } catch(e) {
    await query("ROLLBACK")
    logger.error("Logparser", "Crashed while parsing log, rolling back. Re-throwing...")
    throw e
  } finally {
    con.release()
  }
  
  db.clearCache()

  if (Object.keys(lp.state).length != 5) {
    // this can happen if listener object has lambda functions
    // prefer function definitions with usage of lp.subscribe for binding this
    logger.error("Logparser", "listener modified logparse state: " + Object.keys(lp.state))
  }
}

module.exports = load_logfile