const express = require("express")
const app = express()

const cors = require('cors')
const bodyParser = require('body-parser')

const { NODE_ENV, PORT } = require("./src/utils/config.js")

app.get("/", function(req, res) {
  res.redirect("https://vinhill.github.io/TTT/Frontend/index.html")
})

app.use(bodyParser.urlencoded({ extended: false }))//application/x-www-form-urlencoded
app.use(bodyParser.json())//application/json

if (NODE_ENV === 'dev') {
  app.use(cors())
} else {
  app.use(cors({ origin: "https://vinhill.github.io" }))
}

if (NODE_ENV === 'dev') {
  app.use("/", function(req, res, next) {
    console.log(`Received ${req.method} request to URL '${req.originalUrl}' with body '${JSON.stringify(req.body)}'`)
    next()
  })
}

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
    console.log(err)
    process.exit(1)
  }
  console.log(`RESTTT is listening on ${address}`)
})

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
function shutdown() {
  console.info('Server is shutting down...')
  server.close(function() {
    require("./src/utils/database.js").shutdown()
  })
}