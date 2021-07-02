const express = require("express");
const app = express();

const cors = require('cors');
const bodyParser = require('body-parser');

app.use("/", function(req, res, next) {
  console.log("Received request.");
  next();
});

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
app.use(cors({credentials:true, origin:'https://vinhill.github.io/TTT/'}));

//
// API V1
//

app.use("/api/v1/query", require("./src/query_route.js"));
app.use("/api/v1/config", require("./src/config_route.js"));
app.use("/api/v1/dev", require("./src/dev_route.js"));

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