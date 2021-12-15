const express = require("express");
const app = express();

const cors = require('cors');
const bodyParser = require('body-parser');

const is_debug = true;

//
// Frontend
//

app.get("/", function(req,res,next) {
	res.redirect("https://vinhill.github.io/TTT/Frontend/index.html");
});

//
// Middleware
//

app.use(bodyParser.urlencoded({ extended: false }))//application/x-www-form-urlencoded
app.use(bodyParser.json())//application/json

//cors is necessary for frontend to send requests to backend
if(is_debug) {
  app.use(cors());
}else{
  app.use(cors({origin:"https://vinhill.github.io" }));
}
//
// API V1
//

if(is_debug) {
  app.use("/", function(req, res, next) {
    console.log(`Received ${req.method} request to URL '${req.originalUrl}' with body '${JSON.stringify(req.body)}'`);
    next();
  });
}

app.use("/api/v1/query", require("./src/routes/query_route.js"));
app.use("/api/v1/config", require("./src/routes/config_route.js"));
if(is_debug){
  app.use("/api/v1/dev", require("./src/routes/dev_route.js"));
}

app.use("/", function(req,res,next){
  res.status(404).json(`Unknown REST route ${req.originalUrl}`);
})

//
// Start server
//

const server = app.listen(process.env.PORT, function(err, address) {
	if(err) {
		console.log(err);
		process.exit(1);
	}
	console.log(`RESTTT is listening on ${address}`);
});

//shutdown routine for the server
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
function shutdown() {
  console.info('Server is shutting down...');
  server.close(function(){
		require("./src/database.js").shutdown();
  });
}