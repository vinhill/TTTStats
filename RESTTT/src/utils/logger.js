/* eslint-disable no-console */
const { DEFAULT_LOGLEVEL } = require("./config")
let log_level = DEFAULT_LOGLEVEL;

function debug(from, msg) {
  if (log_level > 0) return;
  console.log(`${new Date().toISOString()} - debug - [${from}] - ${msg}`)
}

function info(from, msg) {
  if (log_level > 1) return;
  console.log(`${new Date().toISOString()} - info - [${from}] - ${msg}`)
}

function warn(from, msg) {
  if (log_level > 2) return;
  console.error(`${new Date().toISOString()} - WARNING - [${from}] - ${msg}`)
}

function error(from, msg) {
  if (log_level > 3) return;
  console.error(`${new Date().toISOString()} - ERROR - [${from}] - ${msg}`)
  if (log_level == 0)
    console.trace()
}

function setLogLevel(level) {
  log_level = level
}

module.exports = {
  debug,
  info,
  warn,
  error,
  setLogLevel
}

