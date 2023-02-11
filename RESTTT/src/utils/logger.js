/* eslint-disable no-console */
const { NODE_ENV } = require("./config.js")

function debug(from, msg) {
  if (NODE_ENV === "dev" || NODE_ENV === "test")
    console.log(`${new Date().toISOString()} - debug - [${from}] - ${msg}`)
}

function info(from, msg) {
  console.log(`${new Date().toISOString()} - info - [${from}] - ${msg}`)
}

function warn(from, msg) {
  console.error(`${new Date().toISOString()} - WARNING - [${from}] - ${msg}`)
}

function error(from, msg) {
  console.error(`${new Date().toISOString()} - ERROR - [${from}] - ${msg}`)
  if (NODE_ENV === "dev")
    console.trace()
}

module.exports = {
  debug,
  info,
  warn,
  error
}

