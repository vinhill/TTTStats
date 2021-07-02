# TTTStats

TTTStats is an Angular SPA that shows several statistics about our Trouble in
Terrorist Town game rounds.

The backend is implemented in the form of a Node.js REST API hosted at
resttt.glitch.io. It uses a mysql database hosted at vmd76968.contaboserver.net.

## Build & Deploy

- ng build --base-href="https://vinhill.github.io/TTTStats/"
- npx angular-cli-ghpages --dir=dist/TTTStats