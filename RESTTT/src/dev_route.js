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
  await db.queryAdmin("DROP TABLE IF EXISTS configs");
  await db.queryAdmin("SET FOREIGN_KEY_CHECKS = 1");

  await db.queryAdmin("CREATE TABLE configs (filename VARCHAR(30) PRIMARY KEY)");
  
  // create table linking roles to teams e.g. vampire to traitor
  await db.queryAdmin("CREATE TABLE roles (role VARCHAR(10) PRIMARY KEY, team ENUM('Traitors', 'Killer', 'Jester', 'Innocent', 'None'), colour TEXT)");
  let roles = [
      ["Assassin", "Traitors", "#843001"],
      ["Traitor", "Traitors", "#D60004"],
      ["Zombie", "Traitors", "#3D6F00"],
      ["Vampire", "Traitors", "#343434"],
      ["Hypnotist", "Traitors", "#FF40FF"],
      ["Killer", "Killer", "#37005D"],
      ["Jester", "Jester", "#BC05FF"],
      ["Innocent", "Innocent", "#01C700"],
      ["Glitch", "Innocent", "#FF6300"],
      ["Detective", "Innocent", "#1A22FF"],
      ["Phantom", "Innocent", "#00EAFD"],
      ["Mercenary", "Innocent", "#F3C100"],
      ["Swapper", "None", "#7800FF"]
  ];

  // Note how this is not async, so be careful with assuming this already is executed.
  roles.forEach(function(e) {
    db.queryAdmin("INSERT INTO roles (role, team, colour) VALUES (?, ?, ?)", e);
  });

  // create tables for Entities match and player as well as relationships participates, kills and damages
  await db.queryAdmin("CREATE TABLE round ("
                      + "mid INT PRIMARY KEY AUTO_INCREMENT,"
                      + "map TEXT, winner ENUM('Traitors', 'Killer', 'Jester', 'Innocent', 'None'), date DATE)");
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