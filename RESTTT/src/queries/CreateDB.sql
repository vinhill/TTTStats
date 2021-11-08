-- clear tables
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS game;
DROP TABLE IF EXISTS player;
DROP TABLE IF EXISTS wins;
DROP TABLE IF EXISTS buys;
DROP TABLE IF EXISTS loves;
DROP TABLE IF EXISTS participates;
DROP TABLE IF EXISTS rolechange;
DROP TABLE IF EXISTS damages;
DROP TABLE IF EXISTS revives;
DROP TABLE IF EXISTS dies;
SET FOREIGN_KEY_CHECKS = 1;

-- create role table
CREATE TABLE role (
	name VARCHAR(15) PRIMARY KEY, -- explicit role
  team VARCHAR(20) NOT NULL,  -- team this role wins with
  superteam VARCHAR(10) NOT NULL, -- more general group this role belongs to
	colour TEXT NOT NULL
);
INSERT INTO role (name, team, colour, superteam)
VALUES
	("Detective", "Innocent", "#1440a4", "Detective"),
  ("Sheriff", "Innocent", "#5978a7", "Detective"),
  ("Sniffer", "Innocent", "#597cd0", "Detective"),
  ("Vigilante", "Innocent", "#4e35db", "Detective"),
  ("Banker", "Innocent", "#86bc65", "Detective"),
  ("Innocent", "Innocent", "#00a01d", "Innocent"),
  ("Medium", "Innocent", "#70cb25", "Innocent"),
  ("Spy", "Innocent", "#fb7e4e", "Innocent"),
  ("Clairvoyant", "Innocent", "#d5c740", "Innocent"),
  ("Beacon", "Innocent", "#d0d185", "Innocent"),
  ("Priest", "Innocent", "#a6bb60", "Innocent"),
  ("Survivalist", "Innocent", "#55855f", "Innocent"),
  ("Lycanthrope", "Innocent", "#517d2e", "Innocent"),
  ("Trapper", "Innocent", "#5f6b5d", "Innocent"),
  ("Pharaoh", "Innocent", "#a2a925", "Innocent"),
  ("Wrath", "Innocent", "#5e6e41", "Innocent"),
  ("Occultist", "Innocent", "#244e42", "Innocent"),
  ("Spectre", "Innocent", "#57a2a5", "Innocent"),
  ("Shinigami", "Innocent", "#817e79", "Innocent"),
  ("Traitor", "Traitor", "#d22722", "Traitor"),
  ("Executioner", "Traitor", "#5f4230", "Traitor"),
  ("Hitman", "Traitor", "#d96856", "Traitor"),
  ("Glutton", "Traitor", "#b53824", "Traitor"),
  ("Blight", "Traitor", "#ca3c2b", "Traitor"),
  ("Vampire", "Traitor", "#962720", "Traitor"),
  ("Mesmerist", "Traitor", "#c12e4b", "Traitor"),
  ("Accomplice", "Traitor", "#660c16", "Traitor"),
  ("Impostor", "Traitor", "#c50c0c", "Traitor"),
  ("Defective", "Traitor", "#432c94", "Traitor"),
  ("Serialkiller", "Serialkiller", "#406c6d", "Killer"),
  ("Jackal", "Jackal", "#67adb5", "Killer"), -- Can have a Sidekick
  ("Restless", "Restless", "#b1a35c", "Killer"),
  ("Doppelganger", "Doppelganger", "#852ec0", "Killer"),
  ("Necromancer", "Necromancer", "#843454", "Killer"),
  ("Infected", "Infected", "#763f54", "Killer"),
  ("Hidden", "Hidden", "#171717", "Killer"),
  ("Amnesiac", "Other", "#7f6fda", "Other"), -- Changes Role -> wins with that team
  ("Pirate Captain", "Pirates", "#613721", "Other"), -- Wins with a team
  ("Pirate", "Pirates", "#d09542", "Other"), -- Wins with a team
  ("Bodyguard", "Bodyguard", "#dc8f19", "Other"), -- ?
  ("Drunk", "Other", "#d7a018", "Other"), -- Changes Role -> wins with that team
  ("Jester", "Jester", "#d73e90", "Other"), -- Wins on Kill
  ("Unknown", "Other", "#a7b5b6", "Other"), -- Dies -> comes back and changes role -> wins with that team
  ("Medic", "Other", "#189f81", "Other"), -- cant win
  ("Mimic", "Other", "#983fab", "Other"),  -- Changes Role -> wins with that team
  ("Marker", "Marker", "#7d5383", "Other"), -- wins alone
  ("Cupid", "Other", "#e22e8f", "Other"), -- cant win
  ("Sidekick", "Sidekick", "#aaa8a9", "Other"), -- Wins with whoever he is sidekicked to
  ("Deputy", "Innocent", "#45679d", "Detective"), -- Is an inno/detective (maybe change role to innocent/detective?)
  ("Thrall", "Traitor", "#ff1919", "Traitor"), -- Is a traitor (maybe change role to traitor?)
  ("Ravenous", "Ravenous", "#aa2e0d", "Killer"), -- Wins alone
  ("Graverobber", "Traitor", "#b65a33", "Traitor"), -- Is a traitor (maybe change role to traitor?)
  ("Zombie", "Zombie", "#3b1223", "Other"), -- Wins with Necromancer
  ("InLove", "InLove", "#000000", "Other");

-- Create other tables
CREATE TABLE game (
  mid INT PRIMARY KEY AUTO_INCREMENT,
  map VARCHAR(50) NOT NULL,
  date DATE NOT NULL
);
CREATE TABLE player (
  name VARCHAR(20) PRIMARY KEY
);
CREATE TABLE wins (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  team VARCHAR(20) NOT NULL
);
CREATE TABLE buys (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  player VARCHAR(20) NOT NULL, FOREIGN KEY(player) REFERENCES player(name),
  item VARCHAR(40) NOT NULL,
  time TIME NOT NULL
);
CREATE TABLE loves (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  first VARCHAR(20) NOT NULL, FOREIGN KEY(first) REFERENCES player(name),
  second VARCHAR(20) NOT NULL, FOREIGN KEY(second) REFERENCES player(name)
);
CREATE TABLE participates (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  player VARCHAR(20) NOT NULL, FOREIGN KEY(player) REFERENCES player(name),
  startrole VARCHAR(15) NOT NULL, FOREIGN KEY(startrole) REFERENCES role(name),  -- initial role
  mainrole VARCHAR(15) NOT NULL, FOREIGN KEY(mainrole) REFERENCES role(name)  -- the role determining this players task for winning
);
CREATE TABLE rolechange (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  player VARCHAR(20) NOT NULL, FOREIGN KEY(player) REFERENCES player(name),
  causee VARCHAR(20), FOREIGN KEY(causee) REFERENCES player(name),  -- optional
  crole VARCHAR(15), FOREIGN KEY(crole) REFERENCES role(name),  -- optional
  fromrole VARCHAR(15) NOT NULL, FOREIGN KEY(fromrole) REFERENCES role(name),
  torole VARCHAR(15) NOT NULL, FOREIGN KEY(torole) REFERENCES role(name),
  time TIME NOT NULL
);
CREATE TABLE damages (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  player VARCHAR(20) NOT NULL, FOREIGN KEY(player) REFERENCES player(name),
  vktrole VARCHAR(15) NOT NULL, FOREIGN KEY(vktrole) REFERENCES role(name),
  reason ENUM('fight', 'fall', 'fire', 'explosion', 'world') NOT NULL,
  causee VARCHAR(20), FOREIGN KEY(causee) REFERENCES player(name),  -- optional, if not fight
  atkrole VARCHAR(15), FOREIGN KEY(atkrole) REFERENCES role(name),  -- optional, if not fight
  weapon VARCHAR(30),  -- optional, if unknown
  time TIME NOT NULL,
  damage INT NOT NULL
);
CREATE TABLE revives (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  player VARCHAR(20) NOT NULL, FOREIGN KEY(player) REFERENCES player(name),
  causee VARCHAR(20) NOT NULL, FOREIGN KEY(causee) REFERENCES player(name),
  crole VARCHAR(15) NOT NULL, FOREIGN KEY(crole) REFERENCES role(name),
  reason ENUM('defibrilator', 'rolemechanic', 'zombie', 'necromancer') NOT NULL
);
CREATE TABLE dies (
  mid INT NOT NULL, FOREIGN KEY(mid) REFERENCES game(mid),
  player VARCHAR(20) NOT NULL, FOREIGN KEY(player) REFERENCES player(name),
  vktrole VARCHAR(15) NOT NULL, FOREIGN KEY(vktrole) REFERENCES role(name),
  reason ENUM('fight', 'fall', 'fire', 'explosion', 'world') NOT NULL,
  causee VARCHAR(20), FOREIGN KEY(causee) REFERENCES player(name),  -- optional, if not fight
  atkrole VARCHAR(15), FOREIGN KEY(atkrole) REFERENCES role(name),  -- optional, if not fight
  weapon VARCHAR(30),  -- optional, if unknown
  time TIME NOT NULL
);