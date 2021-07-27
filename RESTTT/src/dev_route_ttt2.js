const express = require("express");
const router = express.Router();
const path = require('path');
const db = require("./database.js");

router.get("/", function(req,res,next) {
  res.sendFile(path.join(__dirname, '/../dev.html'));
})

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
  await db.queryAdmin("CREATE TABLE roles (role VARCHAR(10) PRIMARY KEY, team ENUM('Detective', 'Innocent', 'Traitor', 'Killer', 'Other', 'Side_Role'), colour TEXT)");
  let roles = [
      ["Detective", "Detective", "#1440a4"],
      ["Sheriff", "Detective", "#5978a7"],
      ["Sniffer", "Detective", "#597cd0"],
      ["Vigilante", "Detective", "#4e35db"],
      ["Banker", "Detective", "#86bc65"],
      ["Innocent", "Innocent", "#00a01d"],
      ["Medium", "Innocent", "#70cb25"],
      ["Spy", "Innocent", "#fb7e4e"],
      ["Clairvoyant", "Innocent", "#d5c740"],
      ["Beacon", "Innocent", "#d0d185"],
      ["Priest", "Innocent", "#a6bb60"],
      ["Survivalist", "Innocent", "#55855f"],
      ["Lycanthrope", "Innocent", "#517d2e"],
      ["Trapper", "Innocent", "#5f6b5d"],
      ["Pharaoh", "Innocent", "#a2a925"],
      ["Wrath", "Innocent", "#5e6e41"],
      ["Occultist", "Innocent", "#244e42"],
      ["Spectre", "Innocent", "#57a2a5"],
      ["Shinigami", "Innocent", "#817e79"],
      ["Traitor", "Traitor", "#d22722"],
      ["Executioner", "Traitor", "#5f4230"],
      ["Hitman", "Traitor", "#d96856"],
      ["Glutton", "Traitor", "#b53824"],
      ["Blight", "Traitor", "#ca3c2b"],
      ["Vampire", "Traitor", "#962720"],
      ["Mesmerist", "Traitor", "#c12e4b"],
      ["Accomplice", "Traitor", "#660c16"],
      ["Impostor", "Traitor", "#c50c0c"],
      ["Defective", "Traitor", "#432c94"],
      ["Serialkiller", "Killer", "#406c6d"],
      ["Jackal", "Killer", "#67adb5"], //Can have a Sidekick
      ["Restless", "Killer", "#b1a35c"],
      ["Doppelganger", "Killer", "#852ec0"],
      ["Necromancer", "Killer", "#843454"],
      ["Infected", "Killer", "#763f54"],
      ["Hidden", "Killer", "#171717"],
      ["Amnesiac", "Other", "#7f6fda"], //Changes Role -> wins with that team
      ["Pirate Captain", "Other", "#613721"], //Wins with a team
      ["Pirate", "Other", "#d09542"], //Wins with a team
      ["Bodyguard", "Other", "#dc8f19"], //?
      ["Drunk", "Other", "#d7a018"], //Changes Role -> wins with that team
      ["Jester", "Other", "#d73e90"], //Wins on Kill
      ["Unknown", "Other", "#a7b5b6"], //Dies -> comes back and changes role -> wins with that team
      ["Medic", "Other", "#189f81"], //cant win
      ["Mimic", "Other", "#983fab"],  //Changes Role -> wins with that team
      ["Marker", "Other", "#7d5383"], //wins alone
      ["Cupid", "Other", "#e22e8f"], //cant win
      ["Sidekick", "Side_Role", "#aaa8a9"], //Wins with whoever he is sidekicked to
      ["Deputy", "Side_Role", "#45679d"], //Is an inno/detective (maybe change role to innocent/detective?)
      ["Thrall", "Side_Role", "#ff1919"], //Is a traitor (maybe change role to traitor?)
      ["Ravenous", "Side_Role", "#aa2e0d"], //Wins alone
      ["Graverobber", "Side_Role", "#b65a33"], //Is a traitor (maybe change role to traitor?)
      ["Zombie", "Side_Role", "#3b1223"], //Wins with Necromancer
      ["In Love", "Side_Role", "#e22e8f"] //Wins with Partner (or your team when both in same team)
  ];

  // Note how this is not async, so be careful with assuming this already is executed.
  roles.forEach(function(e) {
    db.queryAdmin("INSERT INTO roles (role, team, colour) VALUES (?, ?, ?)", e);
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