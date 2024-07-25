# RESTTT - TTTStats REST Backend

Use npm start, npm run dev or npm run deploy to manage this part of the app.

Server listens on http port 3001, docker compose proxies this to 3000. The nginx config should be linked to /etc/nginx/sites-[available|enabled]/<servername>. Nginx then proxies https 3001 to http 3000. This way, when the certificate updates, the server does not have to restart.
