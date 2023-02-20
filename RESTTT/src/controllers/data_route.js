/*
Main REST routes for getting TTT statistics
*/
const express = require("express")
const { NODE_ENV } = require("../utils/config.js")
const router = express.Router()
const db = require("../utils/database.js")
const logger = require("../utils/logger.js")

function konjugateWhere(...conditions) {
  conditions = conditions.filter(c => c && c.length > 0)
  if (conditions.length === 0) return ""
  return "WHERE " + conditions.join(" AND ")
}

let _firstMidLastDate = -1
async function firstMidLastDate() {
  if (_firstMidLastDate == -1) {
    const recent = await db.query(
      "SELECT mid FROM game ORDER BY date DESC, mid ASC LIMIT 1")
    _firstMidLastDate = recent[0].mid
  }
  return _firstMidLastDate
}

router.use(function(req, res, next) {
  req.sqlparams = req.query
  next()
})

router.get("/Players", function (req, res, next) {
  req.sqlquery = "SELECT name FROM player ORDER BY name ASC"
  next()
})

router.get("/Maps", function(req, res, next) {
  req.sqlquery = `
    SELECT map as name, COUNT(mid) as count
    FROM game
    ${req.query.since ? 'WHERE mid >= :since' : ''}
    GROUP BY map ORDER BY count DESC`
  next()
})

router.get("/Roles", function(req, res, next) {
  const since = req.query.since
  const player = req.query.player
  req.sqlquery = `
    SELECT startrole AS name, team, category, color,
      COUNT(mid) AS participated, SUM(won) AS won, SUM(survived) AS survived
    FROM participates
    JOIN role ON participates.startrole = role.name
    ${konjugateWhere(since ? 'mid >= :since' : '', player ? 'player = :player' : '')}
    GROUP BY startrole ORDER BY participated DESC`
  next()
})

router.get("/Teams", function(req, res, next) {
  const since = req.query.since
  const player = req.query.player
  req.sqlquery = `
    SELECT team as name, category,
      COUNT(mid) AS participated, SUM(won) AS won, SUM(survived) AS survived
    FROM participates
    ${konjugateWhere(since ? 'mid >= :since' : '', player ? 'player = :player' : '')}
    JOIN role ON participates.startrole = role.name
    GROUP BY team, category ORDER BY participates DESC`
    next()
})

router.get("/KDStat", function(req, res, next) {
  const since = req.query.since
  req.sqlquery = `
    SELECT s1.player, kills, deaths, teamkills
    FROM (
      SELECT causee AS player, COUNT(*) AS kills, SUM(teamkill) AS teamkills
      FROM dies
      WHERE causee IS NOT NULL
      ${since ? 'AND mid >= :since' : ''}
      GROUP BY causee
    ) AS s1
    JOIN (
      SELECT player, COUNT(*) AS deaths
      FROM dies
      ${since ? 'WHERE mid >= :since' : ''}
      GROUP BY player
    ) AS s2
    ON s1.player = s2.player`
    next()
})

router.get("/Weapons", function(req, res, next) {
  const since = req.query.since
  const player = req.query.player
  req.sqlquery = `
    SELECT weapon, COUNT(*) as kills
    FROM dies
    ${konjugateWhere(
      'weapon IS NOT NULL',
      since ? 'mid >= :since' : '',
      player ? 'causee = :player' : ''
    )}
    GROUP BY weapon ORDER BY kills DESC`
  next()
})

router.get("/Items", function(req, res, next) {
  const since = req.query.since
  const player = req.query.player
  req.sqlquery = `
    SELECT item, COUNT(*) as count
    FROM buys
    ${konjugateWhere(since ? 'mid >= :since' : '', player ? 'player = :player' : '')}
    GROUP BY item ORDER BY count DESC`
  next()
})

router.get("/ParticipateStats", function(req, res, next) {
  const since = req.query.since
  const player = req.query.player
  req.sqlquery = `
    SELECT player, COUNT(*) as games, SUM(survived) as survived, SUM(won) as won
    FROM participates
    ${konjugateWhere(since ? 'mid >= :since' : '', player ? 'player = :player' : '')}
    GROUP BY player ORDER BY games DESC`
  next()
})

router.get("/Games", function(req, res, next) {
  req.sqlquery = `
    SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date,
    COUNT(DISTINCT game.mid) AS rounds, COUNT(DISTINCT player) AS participants
    FROM game
    JOIN participates ON game.mid = participates.mid
    GROUP BY game.date ORDER BY game.date DESC`
  next()
})

router.get("/MediumTexts/:since", function(req, res, next) {
  req.sqlquery = `
    SELECT msg
    FROM mediumchat
    WHERE mid >= :since`
  req.sqlparams = {since: req.params.since}
  next()
})

router.get("/WhoKilledWho", function(req, res, next) {
  req.sqlquery = `
    SELECT causee AS killer, player AS victim, COUNT(*) AS count
    FROM dies
    WHERE causee IS NOT NULL
    GROUP BY player, causee
  `
  next()
})

router.get("/JesterKills", function(req, res, next) {
  req.sqlquery = `SELECT causee AS name, COUNT(*) AS count
    FROM dies
    WHERE causee IS NOT NULL AND vktrole = 'jester'
    GROUP BY causee ORDER BY count DESC`
  next()
})

router.get("/MIDs/:date", function(req, res, next) {
  req.sqlquery = "SELECT mid FROM game WHERE date = :date"
  req.sqlparams = {date: req.params.date}
  next()
})

router.get("/Teamup", function(req, res, next) {
  const since = req.query.since
  const player = req.query.player
  if (!since && !player)
    return res.status(400).json("You need to specify either player or a recent, minimum mid (since)")

  req.sqlquery = `
    SELECT first, second, reason, COUNT(mid) as count FROM teamup
    ${konjugateWhere(
      since ? 'mid >= :since' : '',
      player ? 'first = :player OR second = :player' : ''
    )}
    GROUP BY first, second, reason ORDER BY count DESC`
  next()
})

router.get("/KarmaTS", function(req, res, next) {
  const since = req.query.since
  const player = req.query.player
  if (!since && !player)
    return res.status(400).json("You need to specify either player or a recent, minimum mid (since)")

  req.sqlquery = `
    SELECT mid, player, karma, time
    FROM karma
    ${konjugateWhere(since ? 'mid >= :since' : '', player ? 'player = :player' : '')}`
  next()
})

router.get("/Karma", function(req, res, next) {
  const since = req.query.since
  req.sqlquery = `
    SELECT player, DATE_FORMAT(s1.date, '%Y-%m-%d') AS date, MIN(karma) AS min
    FROM karma
    JOIN game ON karma.mid = game.mid
    GROUP BY player, date
    ${since ? 'WHERE mid >= :since' : ''}`
  next()
})

router.get("/KDTS/:player", function(req, res, next) {
  req.sqlquery = `
    SELECT DATE_FORMAT(s1.date, '%Y-%m-%d') AS date, kills, deaths
    FROM (
      SELECT date, COUNT(*) AS kills
      FROM dies
      JOIN game ON dies.mid = game.mid
      WHERE causee = :player
      GROUP BY date
    ) AS s1
    JOIN (
      SELECT date, COUNT(*) AS deaths
      FROM dies
      JOIN game ON dies.mid = game.mid
      WHERE player = :player
      GROUP BY date
    ) AS s2`
  req.sqlparams = {player: req.params.player}
  next()
})

router.get("/ParticipateTS/:player", function(req, res, next) {
  req.sqlquery = `
    SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date,
      SUM(won) AS won, COUNT(*) AS participated, SUM(survived) AS survived
    FROM participates
    JOIN game
    ON game.mid = participates.mid
    WHERE player = :player
    GROUP BY date`
  req.sqlparams = {player: req.params.player}
  next()
})

router.get("/DeathsByWeapon/:player", function(req, res, next) {
  req.sqlquery = `
    SELECT weapon, COUNT(*) AS count
    FROM dies
    WHERE weapon IS NOT NULL AND player = :player
    GROUP BY weapon ORDER BY count DESC`
  req.sqlparams = {player: req.params.player}
  next()
})

router.use("/", async function(req, res, next) {
  if(!req.sqlquery)
    return next()

  if (NODE_ENV === "prod") {
    // currently, frontend only used firstMidLastDate for since
    // so block everything else to prevent abuse
    const since = req.sqlparams.since
    if (since && since != await firstMidLastDate())
      return res.status(400).json("The MID (since) has to be " + await firstMidLastDate())
  }

  try {
    const data = await db.query(req.sqlquery, req.sqlparams)
    res.status(200).json(data)
  } catch (e) {
    res.status(400).json(`Could not query database for ${req.sqlquery} because of an error: ${e}`)
    logger.error("QueryRoute", `Could not query database for ${req.sqlquery} because of an error: ${e}`)
  }
})

router.get("/RoleDescriptions", async function(req, res) {
  try {
    const data = await db.query("SELECT name, team, category, color, descr FROM role", [], false /*result too long for cache*/)
    res.status(200).json(data)
  } catch (e) {
    res.status(400).json(`Could not query database for ${req.sqlquery} because of an error: ${e}`)
    logger.error("QueryRoute", `Could not query database for ${req.sqlquery} because of an error: ${e}`)
  }
})

module.exports = router