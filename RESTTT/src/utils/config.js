require('dotenv').config()

let NODE_ENV = process.env.NODE_ENV

module.exports = {
  "PORT": process.env.PORT || 3001,
  "DB_QER_TIMEOUT": 1000 * 6,
  "DB_TIMEOUT": 250,
  NODE_ENV,
  "MySQL_READ_PASSWORD": process.env.READERPW,
  "MySQL_ADMIN_PASSWORD": process.env.ADMINPW,
  "VPS_DOMAIN": "75.119.148.220",
  "FILE_SERVER": "ftpupload.net",
  "CACHE_SIZE": 50,
  "MAX_RESULT_SIZE_KB": 40,
  "TTT_VPS_PW": process.env.TTT_VPS_PW,
  "FTP_PW": process.env.FTPPW,
  "REST_ADMIN_TOKEN": process.env.REST_ADMIN_TOKEN,
  "DEFAULT_LOGLEVEL": NODE_ENV === "dev" || NODE_ENV === "test" ? 0 : 1,
}
