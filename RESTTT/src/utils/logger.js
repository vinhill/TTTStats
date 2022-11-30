/* eslint-disable no-console */
const { NODE_ENV } = require("./config.js")

function debug(from, msg) {
  if (NODE_ENV === "dev")
    console.log(`${new Date().toISOString()} - ${from} - ${msg}`)
}

function info(from, msg) {
  console.log(`${new Date().toISOString()} - ${from} - ${msg}`)
}

function warn(from, msg) {
  console.log(`${new Date().toISOString()} - ${from} - ${msg}`)
}

function error(from, msg) {
  console.error(`${new Date().toISOString()} - ${from} - ${msg}`)
}

module.exports = {
  debug,
  info,
  warn,
  error
}

