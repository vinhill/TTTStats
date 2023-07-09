# TTTStats

Live at [GitHub Pages](https://vinhill.github.io/TTTStats).

TTTStats is an Angular SPA that shows several statistics about our Trouble in
Terrorist Town game rounds.

The backend is implemented in the form of a Node.js REST API hosted at [resttt.fly.io](https://resttt.fly.dev).
It uses a mysql database hosted at [Contabo](https://vmd76968.contaboserver.net).

## Build & Deploy

### Backend

- go to RESTTT and run `npm run deploy` or use the `Dockerfile``

### Frontend

- go to TTTStats and run `npm run deploy`

If some bundle is too large, do
- add "sourceMap": true, "namedChunks": true to the development build in angular.json
- ng build TTTStats --base-href="https://vinhill.github.io/TTTStats/"
- source-map-explorer the_bundle_file.js
- check which parts are too large and do something against it. I.e. lazy-loading

### Custom Output Generator

To generate the statistics you need to add the file sv_custom_console_print.lua to the following folder:

...\steamapps\common\GarrysMod\garrysmod\lua\autorun\server

The folder structure might be a little bit different, depending if you are hosting a local server or using a dedicated provider. However you should at least find ...\lua\autorun\server, so you can just put it there.

The file sv_custom_console_print.lua generates the custom outputs and writes it in the following file: ...\steamapps\common\GarrysMod\garrysmod\console.log. 