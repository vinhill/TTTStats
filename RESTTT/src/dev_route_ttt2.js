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
      ["Detective", "Detective", "#843001"],
      ["Sheriff", "Detective", "#D60004"],
      ["Sniffer", "Detective", "#3D6F00"],
      ["Vigilante", "Detective", "#343434"],
      ["Banker", "Detective", "#FF40FF"],
      ["Innocent", "Innocent", "#01C700"],
      ["Medium", "Innocent", "#01C700"],
      ["Spy", "Innocent", "#01C700"],
      ["Clairvoyant", "Innocent", "#01C700"],
      ["Beacon", "Innocent", "#01C700"],
      ["Priest", "Innocent", "#01C700"],
      ["Survivalist", "Innocent", "#01C700"],
      ["Lycanthrope", "Innocent", "#01C700"],
      ["Trapper", "Innocent", "#01C700"],
      ["Pharaoh", "Innocent", "#01C700"],
      ["Wrath", "Innocent", "#01C700"],
      ["Occultist", "Innocent", "#01C700"],
      ["Spectre", "Innocent", "#01C700"],
      ["Shinigami", "Innocent", "#01C700"],
      ["Traitor", "Traitor", "#01C700"],
      ["Executioner", "Traitor", "#01C700"],
      ["Hitman", "Traitor", "#01C700"],
      ["Glutton", "Traitor", "#01C700"],
      ["Blight", "Traitor", "#01C700"],
      ["Vampire", "Traitor", "#01C700"],
      ["Mesmerist", "Traitor", "#01C700"],
      ["Accomplice", "Traitor", "#01C700"],
      ["Impostor", "Traitor", "#01C700"],
      ["Defective", "Traitor", "#01C700"],
      ["Serialkiller", "Killer", "#37005D"],
      ["Jackal", "Killer", "#37005D"], //Can have a Sidekick
      ["Restless", "Killer", "#37005D"],
      ["Doppelganger", "Killer", "#37005D"],
      ["Necromancer", "Killer", "#37005D"],
      ["Infected", "Killer", "#37005D"],
      ["Hidden", "Killer", "#37005D"],
      ["Amnesiac", "Other", "#BC05FF"], //Changes Role -> wins with that team
      ["Pirate Captain", "Other", "#BC05FF"], //Wins with a team
      ["Pirate", "Other", "#BC05FF"], //Wins with a team
      ["Bodyguard", "Other", "#BC05FF"], //?
      ["Drunk", "Other", "#BC05FF"], //Changes Role -> wins with that team
      ["Jester", "Other", "#BC05FF"], //Wins on Kill
      ["Unknown", "Other", "#BC05FF"], //Dies -> comes back and changes role -> wins with that team
      ["Medic", "Other", "#BC05FF"], //cant win
      ["Mimic", "Other", "#BC05FF"],  //Changes Role -> wins with that team
      ["Marker", "Other", "#BC05FF"], //wins alone
      ["Cupid", "Other", "#BC05FF"], //cant win
      ["Sidekick", "Side_Role", "#7800FF"], //Wins with whoever he is sidekicked to
      ["Deputy", "Side_Role", "#7800FF"], //Is an inno/detective (maybe change role to innocent/detective?)
      ["Thrall", "Side_Role", "#7800FF"], //Is a traitor (maybe change role to traitor?)
      ["Ravenous", "Side_Role", "#7800FF"], //Wins alone
      ["Graverobber", "Side_Role", "#7800FF"], //Is a traitor (maybe change role to traitor?)
      ["Zombie", "Side_Role", "#7800FF"], //Wins with Necromancer
      ["In Love", "Side_Role", "#7800FF"] //Wins with Partner (or your team when both in same team)
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