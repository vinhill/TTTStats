const express = require("express");
const router = express.Router();
const path = require('path');
const db = require("./database.js");

router.get("/", function(req,res,next) {
  res.sendFile(path.join(__dirname, '/../dev.html'));
})

function loadQuery(queryFileName) {
  return new Promise(function(res,rej){
    const path = `src/queries/${queryFileName}.sql`;

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        rej(err);
      }else{
        res(data);
      }
    })
  });
}

router.get("/makedb", async function(req,res,next){
  await db.queryAdmin("SET FOREIGN_KEY_CHECKS = 0");
  await db.queryAdmin("DROP TABLE IF EXISTS round");
  await db.queryAdmin("DROP TABLE IF EXISTS player");
  await db.queryAdmin("DROP TABLE IF EXISTS participates");
  await db.queryAdmin("DROP TABLE IF EXISTS kills");
  await db.queryAdmin("DROP TABLE IF EXISTS damages");
  await db.queryAdmin("DROP TABLE IF EXISTS roles");
  await db.queryAdmin("SET FOREIGN_KEY_CHECKS = 1");

  // create table linking roles to teams e.g. vampire to traitor
  await db.queryAdmin(loadQuery("RolesTable"));
  let roles = [
      ["Detective", "Innocent", "#1440a4", "Detective"],
      ["Sheriff", "Innocent", "#5978a7", "Detective"],
      ["Sniffer", "Innocent", "#597cd0", "Detective"],
      ["Vigilante", "Innocent", "#4e35db", "Detective"],
      ["Banker", "Innocent", "#86bc65", "Detective"],
      ["Innocent", "Innocent", "#00a01d", "Innocent"],
      ["Medium", "Innocent", "#70cb25", "Innocent"],
      ["Spy", "Innocent", "#fb7e4e", "Innocent"],
      ["Clairvoyant", "Innocent", "#d5c740", "Innocent"],
      ["Beacon", "Innocent", "#d0d185", "Innocent"],
      ["Priest", "Innocent", "#a6bb60", "Innocent"],
      ["Survivalist", "Innocent", "#55855f", "Innocent"],
      ["Lycanthrope", "Innocent", "#517d2e", "Innocent"],
      ["Trapper", "Innocent", "#5f6b5d", "Innocent"],
      ["Pharaoh", "Innocent", "#a2a925", "Innocent"],
      ["Wrath", "Innocent", "#5e6e41", "Innocent"],
      ["Occultist", "Innocent", "#244e42", "Innocent"],
      ["Spectre", "Innocent", "#57a2a5", "Innocent"],
      ["Shinigami", "Innocent", "#817e79", "Innocent"],
      ["Traitor", "Traitor", "#d22722", "Traitor"],
      ["Executioner", "Traitor", "#5f4230", "Traitor"],
      ["Hitman", "Traitor", "#d96856", "Traitor"],
      ["Glutton", "Traitor", "#b53824", "Traitor"],
      ["Blight", "Traitor", "#ca3c2b", "Traitor"],
      ["Vampire", "Traitor", "#962720", "Traitor"],
      ["Mesmerist", "Traitor", "#c12e4b", "Traitor"],
      ["Accomplice", "Traitor", "#660c16", "Traitor"],
      ["Impostor", "Traitor", "#c50c0c", "Traitor"],
      ["Defective", "Traitor", "#432c94", "Traitor"],
      ["Serialkiller", "Serialkiller", "#406c6d", "Killer"],
      ["Jackal", "Jackal", "#67adb5", "Killer"], //Can have a Sidekick
      ["Restless", "Restless", "#b1a35c", "Killer"],
      ["Doppelganger", "Doppelganger", "#852ec0", "Killer"],
      ["Necromancer", "Necromancer", "#843454", "Killer"],
      ["Infected", "Infected", "#763f54", "Killer"],
      ["Hidden", "Hidden", "#171717", "Killer"],
      ["Amnesiac", "Other", "#7f6fda", "Other"], //Changes Role -> wins with that team
      ["Pirate Captain", "Pirates", "#613721", "Other"], //Wins with a team
      ["Pirate", "Pirates", "#d09542", "Other"], //Wins with a team
      ["Bodyguard", "Bodyguard", "#dc8f19", "Other"], //?
      ["Drunk", "Other", "#d7a018", "Other"], //Changes Role -> wins with that team
      ["Jester", "Jester", "#d73e90", "Other"], //Wins on Kill
      ["Unknown", "Other", "#a7b5b6", "Other"], //Dies -> comes back and changes role -> wins with that team
      ["Medic", "Other", "#189f81", "Other"], //cant win
      ["Mimic", "Other", "#983fab", "Other"],  //Changes Role -> wins with that team
      ["Marker", "Marker", "#7d5383", "Other"], //wins alone
      ["Cupid", "Other", "#e22e8f", "Other"], //cant win
      ["Sidekick", "Sidekick", "#aaa8a9", "Other"], //Wins with whoever he is sidekicked to
      ["Deputy", "Innocent", "#45679d", "Detective"], //Is an inno/detective (maybe change role to innocent/detective?)
      ["Thrall", "Traitor", "#ff1919", "Traitor"], //Is a traitor (maybe change role to traitor?)
      ["Ravenous", "Ravenous", "#aa2e0d", "Killer"], //Wins alone
      ["Graverobber", "Traitor", "#b65a33", "Traitor"], //Is a traitor (maybe change role to traitor?)
      ["Zombie", "Zombie", "#3b1223", "Other"] //Wins with Necromancer
  ];

  // Note how this is not async, so be careful with assuming this already is executed.
  roles.forEach(function(e) {
    db.queryAdmin("INSERT INTO roles (role, team, colour, superteam) VALUES (?, ?, ?, ?)", e);
  });

  // create tables for Entities match and player as well as relationships participates, kills and damages
  await db.queryAdmin("CREATE TABLE round ("
                      + "mid INT PRIMARY KEY AUTO_INCREMENT,"
                      + "map TEXT, winner ENUM('Detective', 'Innocent', 'Traitor', 'Killer', 'Other', 'Side_Role'), date DATE)"); //has to be modified...
  await db.queryAdmin("CREATE TABLE player (name VARCHAR(30) PRIMARY KEY)");
  await db.queryAdmin("CREATE TABLE participates ("
                      + "mid INT, player VARCHAR(30), role VARCHAR(10),"
                      + "FOREIGN KEY(mid) REFERENCES round(mid),"
                      + "FOREIGN KEY(player) REFERENCES player(name),"
                      + "FOREIGN KEY(role) REFERENCES roles(role))");
  await db.queryAdmin("CREATE TABLE kills ("
                      + "mid INT, attacker VARCHAR(30), victim VARCHAR(30), atkrole VARCHAR(10), vktrole VARCHAR(10), time TIME,"
                      + "FOREIGN KEY(mid) REFERENCES round(mid),"
                      + "FOREIGN KEY(attacker) REFERENCES player(name),"
                      + "FOREIGN KEY(victim) REFERENCES player(name),"
                      + "FOREIGN KEY(atkrole) REFERENCES roles(role),"
                      + "FOREIGN KEY(vktrole) REFERENCES roles(role))");
  await db.queryAdmin("CREATE TABLE damages ("
                      + "mid INT, attacker VARCHAR(30), victim VARCHAR(30), atkrole VARCHAR(10), vktrole VARCHAR(10), time TIME, damage INT,"
                      + "FOREIGN KEY(mid) REFERENCES round(mid),"
                      + "FOREIGN KEY(attacker) REFERENCES player(name),"
                      + "FOREIGN KEY(victim) REFERENCES player(name),"
                      + "FOREIGN KEY(atkrole) REFERENCES roles(role),"
                      + "FOREIGN KEY(vktrole) REFERENCES roles(role))");

  res.status(200).end();
});

module.exports = router;