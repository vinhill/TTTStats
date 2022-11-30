const express = require("express")
const app = express()

const cors = require('cors')
const bodyParser = require('body-parser')
const logger = require("./src/utils/logger.js")

const { NODE_ENV, PORT } = require("./src/utils/config.js")

app.use(bodyParser.urlencoded({ extended: false }))//application/x-www-form-urlencoded
app.use(bodyParser.json())//application/json

if (NODE_ENV === 'dev') {
  app.use(cors())
} else {
  app.use(cors({ origin: "https://vinhill.github.io" }))
}

app.use("/", function(req, res, next) {
  logger.debug("Server", `Received ${req.method} request to URL '${req.originalUrl}' with body '${JSON.stringify(req.body)}'`)
  next()
})

app.use("/api/v1/query", require("./src/controllers/query_route.js"))
app.use("/api/v1/config", require("./src/controllers/config_route.js"))
if (NODE_ENV === 'dev') {
  app.use("/api/v1/dev", require("./src/controllers/dev_route.js"))
}

app.use("/", function(req, res) {
  res.status(404).json(`Unknown REST route ${req.originalUrl}`)
})

const server = app.listen(PORT, function(err, address) {
  if(err) {
    logger.error("Server", err)
    process.exit(1)
  }
  logger.info("Server", `RESTTT is listening on ${address}`)
})

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
function shutdown() {
  logger.info("Server", 'Server is shutting down...')
  server.close(function() {
    require("./src/utils/database.js").shutdown()
  })
}