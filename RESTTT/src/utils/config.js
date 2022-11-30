require('dotenv').config()

let NODE_ENV = process.env.NODE_ENV
if (process.env.FORCE_DEV === 'true')
  NODE_ENV = 'dev'

module.exports = {
  "PORT": process.env.PORT || 3001,
  NODE_ENV,
  "MySQL_READ_PASSWORD": process.env.READERPW,
  "MySQL_ADMIN_PASSWORD": process.env.ADMINPW,
  "CACHE_SIZE": 100
}