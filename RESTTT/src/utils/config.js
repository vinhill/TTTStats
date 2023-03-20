require('dotenv').config()

let NODE_ENV = process.env.NODE_ENV
// for forcing dev mode in fly.io when using npm run start
if (process.env.FORCE_DEV === 'true')
  NODE_ENV = 'dev'

module.exports = {
  "PORT": process.env.PORT || 3001,
  "DB_TIMEOUT": 1000 * 60,
  NODE_ENV,
  "MySQL_READ_PASSWORD": process.env.READERPW,
  "MySQL_ADMIN_PASSWORD": process.env.ADMINPW,
  "CACHE_SIZE": 50,
  "MAX_RESULT_SIZE_KB": 40,
  "TTT_FTP_PW": process.env.TTTFTPPW,
  "FTP_PW": process.env.FTPPW,
  "REST_ADMIN_TOKEN": process.env.REST_ADMIN_TOKEN,
}