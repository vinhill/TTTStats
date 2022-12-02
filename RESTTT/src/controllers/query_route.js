/*
Main REST routes for getting TTT statistics
*/
const express = require("express")
const router = express.Router()
const db = require("../utils/database.js")
const logger = require("../utils/logger.js")

const { NODE_ENV } = require("../utils/config.js")

if (NODE_ENV === "dev")
  router.post("/custom", async function(req, res, next) {
    // check request parameters
    let query = req.body.query
    let auth = req.body.password
    if (!query) {
      res.status(400).json("The query/custom route requires the 'query' field in the body.")
    }
    if (!auth) {
      res.status(400).json("The query/custom route requires the 'password' field in the body.")
    }
    if (auth !== "SuperSecretCustomQueryPassword") {
      res.status(403).json("The provided password is incorrect.")
    }

    // give query to next middleware
    req.sqlquery = query
    next()
  })

router.get("/Players", async function(req, res, next) {
  req.sqlquery = "SELECT name FROM player ORDER BY name ASC"
  next()
})

router.get("/PlayerGameCount", async function(req, res, next) {
  req.sqlquery = "SELECT player, COUNT(mid) as rounds FROM participates GROUP BY player ORDER BY rounds DESC"
  next()
})

router.get("/MapCount", async function(req, res, next) {
  req.sqlquery = "SELECT map, COUNT(mid) as count FROM game GROUP BY map ORDER BY count DESC"
  next()
})

router.get("/PlayerRoleCount", async function(req, res, next) {
  req.sqlquery = `
SELECT startrole, COUNT(mid) as count, player
FROM participates
GROUP BY startrole, player
ORDER BY count DESC
  `
  next()
})

router.get("/PlayerKillCount", async function(req, res, next) {
  req.sqlquery = `
SELECT
    causee AS player,
    COUNT(*) AS kills,
    SUM(teamkill) AS wrong
FROM dies
WHERE causee IS NOT NULL
GROUP BY causee
  `
  next()
})

router.get("/PlayerDeathCount", async function(req, res, next) {
  req.sqlquery = "SELECT player, COUNT(*) AS deaths FROM dies GROUP BY player"
  next()
})

router.get("/PlayerSurviveCount", async function(req, res, next) {
  req.sqlquery = `
SELECT participates.player, participates.startrole, COUNT(*) AS count
FROM participates
LEFT JOIN dies
ON dies.mid = participates.mid
AND dies.player = participates.player
WHERE dies.player IS NULL
GROUP BY participates.player, participates.startrole
  `
  next()
})

router.get("/PopularPurchases", async function(req, res, next) {
  req.sqlquery = "SELECT item, count(*) as amount FROM buys GROUP BY item ORDER BY amount DESC LIMIT 10"
  next()
})

router.get("/PopularPurchases/:name", async function(req, res, next) {
  let name = req.params.name
  req.sqlquery = "SELECT item, count(*) as amount FROM buys WHERE player = ? GROUP BY item ORDER BY amount DESC LIMIT 10"
  req.sqlparams = [name]
  next()
})

router.get("/TeamWincount", async function(req, res, next) {
  req.sqlquery = "SELECT team, COUNT(mid) AS count FROM wins GROUP BY team"
  next()
})

router.get("/PlayerRoleWincount", async function(req, res, next) {
  req.sqlquery = `
SELECT player, participates.startrole, COUNT(*) AS wins
FROM participates
JOIN role ON participates.mainrole = role.name
JOIN wins ON wins.mid = participates.mid AND wins.team = role.team
GROUP BY player, participates.startrole
  `
  next()
})

router.get("/WhoKilledWho", async function(req, res, next) {
  req.sqlquery = `
SELECT causee AS killer, player AS victim, COUNT(*) AS count
FROM dies
WHERE causee IS NOT NULL
GROUP BY player, causee
  `
  next()
})

router.get("/WhoTeamedWho", async function(req, res, next) {
  req.sqlquery = `
SELECT pa.player AS player, pb.player AS mate, COUNT(*) AS count
FROM participates pa
JOIN participates pb ON pa.mid = pb.mid AND pa.player != pb.player
JOIN role ra ON pa.mainrole = ra.name
JOIN role rb ON pb.mainrole = rb.name
WHERE ra.team = rb.team
GROUP BY pa.player, pb.player
  `
  next()
})

router.get("/DeathsByWeapon", async function(req, res, next) {
  req.sqlquery = `
SELECT player, weapon, COUNT(*) AS count
FROM dies
WHERE weapon != "null"
GROUP BY player, weapon
  `
  next()
})

router.get("/KillsByWeapon", async function(req, res, next) {
  req.sqlquery = `
SELECT causee, weapon, COUNT(*) AS count
FROM dies
WHERE weapon != "null"
GROUP BY causee, weapon
  `
  next()
})

router.use("/", async function(req, res, next) {
  if(!req.sqlquery) {
    // none of the previous query routes were activated
    // pass on to next middleware
    next()
    return
  }
  if(!req.sqlparams) {
    req.sqlparams = []
  }
  // query database and return result
  try {
    const data = await db.query(req.sqlquery, req.sqlparams)
    res.status(200).json(data)
  } catch (e) {
    res.status(400).json(`Could not query database for ${req.sqlquery} because of an error: ${e}`)
    logger.error("QueryRoute", `Could not query database for ${req.sqlquery} because of an error: ${e}`)
  }
})

router.get("/Roles", async function(req, res) {
  // query database and return result
  try {
    // the result will be too long to be cached
    const data = await db.query("SELECT * FROM role", [], false)
    res.status(200).json(data)
  } catch (e) {
    res.status(400).json(`Could not query database for ${req.sqlquery} because of an error: ${e}`)
    logger.error("QueryRoute", `Could not query database for ${req.sqlquery} because of an error: ${e}`)
  }
})

module.exports = router