const logger = require('./logger.js')

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = "ValidationError"
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = "NotFoundError"
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message)
    this.name = "AuthorizationError"
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message)
    this.name = "ConflictError"
  }
}

function errorHandler(err, req, res, next) {
  if (err.name === "ValidationError") {
    res.status(400).json(err.message)
  } else if (err.name === "NotFoundError") {
    res.status(404).json(err.message)
  } else if (err.name === "AuthorizationError") {
    res.status(401).json(err.message)
  } else if (err.name === "ConflictError") {
    res.status(409).json(err.message)
  } else if (err.code === "PROTOCOL_SEQUENCE_TIMEOUT") {
    logger.warn("ErrorHandler", `MySQL Timeout: ${err}`)
    res.status(504).json(`MySQL Timeout`)
  } else if (err.name === "FTPError") {
    if (err.status === 550)
      res.status(404).json(`FTP file not found, ${err.message}`)
    else
      res.status(500).json(`FTP Error, ${err.message}`)
  } else {
    logger.error("ErrorHandler", err.message)
    res.status(500).json(err.message)
  }
}

module.exports = {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  errorHandler
}