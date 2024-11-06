const fs = require('fs')

const express = require("express")
require('express-async-errors')
const app = express()

const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
const logger = require("./src/utils/logger.js")
const { NotFoundError, errorHandler } = require("./src/utils/error.js")

const { NODE_ENV, PORT } = require("./src/utils/config.js")

app.use(bodyParser.urlencoded({ extended: false }))//application/x-www-form-urlencoded
app.use(bodyParser.json())//application/json

if (NODE_ENV === 'dev') {
  app.use(cors())
} else {
  app.use(cors({ origin: "https://vinhill.github.io" }))
}

app.use("/", function(req, res, next) {
  if (NODE_ENV === 'dev')
    logger.debug("Server", `Received ${req.method} request to URL '${req.originalUrl}' with body '${JSON.stringify(req.body)}'`)
  else
    logger.info("Server", `Received ${req.method} request to URL '${req.originalUrl}'`)
  next()
})

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, './index.html'))
})
app.get("/index.html", function(req, res) {
  res.sendFile(path.join(__dirname, './index.html'))
})
app.get("/index.css", function(req, res) {
  res.sendFile(path.join(__dirname, './index.css'))
})
app.get("/index.js", function(req, res) {
  res.sendFile(path.join(__dirname, './index.js'))
})

app.use("/api/v1/data", require("./src/controllers/data_route.js"))
app.use("/api/v1/admin", require("./src/controllers/admin_route.js"))
if (NODE_ENV === 'dev') {
  app.use("/api/v1/dev", require("./src/controllers/dev_route.js"))
}

app.use("/", function(req, res) {
  throw new NotFoundError(`Unknown REST route ${req.originalUrl}`)
})

app.use(errorHandler)

/*
const https_opt = {
  key: fs.readFileSync("./certs/privkey.pem", "utf8"),
  cert: fs.readFileSync("./certs/fullchain.pem", "utf8"),
  ca: fs.readFileSync("./certs/chain.pem", "utf8")
}
server = https.createServer(https_opt, app)
*/
app.listen(PORT, function(err, address) {
  if(err) {
    logger.error("Server", err)
    process.exit(1)
  }
  logger.info("Server", `RESTTT is listening on ${address}:${PORT}`)
})

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
function shutdown() {
  logger.info("Server", 'Server is shutting down...')
  app.close(function() {
    require("./src/utils/database.js").shutdown()
    require("./src/utils/filebase.js").shutdown()
    process.exit(0)
  })
}
