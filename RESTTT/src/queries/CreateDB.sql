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
DROP TABLE IF EXISTS configs;
SET FOREIGN_KEY_CHECKS = 1;

-- create role table
CREATE TABLE role (
	name VARCHAR(15) PRIMARY KEY, -- explicit role
  team VARCHAR(20) NOT NULL,  -- team this role wins with
  superteam VARCHAR(10) NOT NULL, -- more general group this role belongs to
	colour VARCHAR(8) NOT NULL,
  descr TEXT NOT NULL
);
INSERT INTO role (name, team, colour, superteam, descr)
VALUES
	("Detective", "Innocent", "#1440a4", "Detective", "Has a DNA scanner to gain information on dead bodies."),
  ("Sheriff", "Innocent", "#5978a7", "Detective", "Can turn someone into a deputy."),
  ("Sniffer", "Innocent", "#597cd0", "Detective", "Has a magnifying glass that can be used to see footsteps and track down people who recently killed."),
  ("Vigilante", "Innocent", "#4e35db", "Detective", "Gain damage through killing traitors. Lose damage through killing innocents."),
  ("Banker", "Innocent", "#86bc65", "Detective", "Gain a credit each time a player spends one."),
  ("Innocent", "Innocent", "#00a01d", "Innocent", "An innocent terrorist."),
  ("Medium", "Innocent", "#70cb25", "Innocent", "Can communicate with the dead by seeing a scrambled version of the Spectator Chat."),
  ("Spy", "Innocent", "#fb7e4e", "Innocent", "Appears as Traitor, but is Innocent. Can do fake buys."),
  ("Clairvoyant", "Innocent", "#d5c740", "Innocent", "Knows which players have TTT2-unique roles. Turns the Jester into a Sidekick by killing him."),
  ("Beacon", "Innocent", "#d0d185", "Innocent", "Gain power as your allies die. But loose all bonuses, if you kill another innocent."),
  ("Priest", "Innocent", "#a6bb60", "Innocent", "Spawns with a holy deagle. Shooting an innocent confirms their innocence, shooting a traitor kills you."),
  ("Survivalist", "Innocent", "#55855f", "Innocent", "Has a shop."),
  ("Lycanthrope", "Innocent", "#517d2e", "Innocent", "Gain a large boost, if you are the last innocent."),
  ("Trapper", "Innocent", "#5f6b5d", "Innocent", "Sees all traitor traps and gets alearted, when they go off."),
  ("Pharaoh", "Innocent", "#a2a925", "Innocent", "Places an ankh that grants you a second life. A traitor will then be turned into a graverobber."),
  ("Wrath", "Innocent", "#5e6e41", "Innocent", "You don''t know you are one. Comes back as traitor, if killed by another innocent."),
  ("Occultist", "Innocent", "#244e42", "Innocent", "Is immune to fire and comes back to life, if HP reaches 25 or less."),
  ("Spectre", "Innocent", "#57a2a5", "Innocent", "Your killer is smoking and you come back to life, if they die."),
  ("Shinigami", "Innocent", "#817e79", "Innocent", "Upon death, come back as a muted, knife wielding ghost."),
  ("Traitor", "Traitor", "#d22722", "Traitor", "A treacherous terrorist."),
  ("Executioner", "Traitor", "#5f4230", "Traitor", "Has a target, on whom he deals double damage. On others, the damage is halved."),
  ("Hitman", "Traitor", "#d96856", "Traitor", "Has a target and gains credits by killing them."),
  ("Glutton", "Traitor", "#b53824", "Traitor", "Eats bodies for HP and becomes ravenous, if hasn''t eaten in a long time."),
  ("Blight", "Traitor", "#ca3c2b", "Traitor", "Infects their killer causing them to lose health over time."),
  ("Vampire", "Traitor", "#962720", "Traitor", "Can turn into a bat and has lifesteal, but loses health over time."),
  ("Mesmerist", "Traitor", "#c12e4b", "Traitor", "Can revive dead bodies into thralls."),
  ("Accomplice", "Traitor", "#660c16", "Traitor", "The accomplice and traitors don''t know about each other."),
  ("Impostor", "Traitor", "#c50c0c", "Traitor", "Has instant kill, can sabotage things and place vents across the map."),
  ("Defective", "Traitor", "#432c94", "Traitor", "Appears as detective, but is a traitor. Can''t harm the detective."),
  ("Serialkiller", "Serialkiller", "#406c6d", "Killer", "Sees all players at all times, starts with armor and has a shop."),
  ("Jackal", "Jackal", "#67adb5", "Killer", "Can convert a player into a sidekick and has a shop."), -- Can have a Sidekick
  ("Restless", "Restless", "#b1a35c", "Killer", "Comes back to life after death multiple times. Role is revealed at the first time."),
  ("Doppelganger", "Doppelganger", "#852ec0", "Killer", "Can copy peoples roles, but still wins as killer."),
  ("Necromancer", "Necromancer", "#843454", "Killer", "Can revive dead bodies into zombies and has a shop."),
  ("Infected", "Infected", "#763f54", "Killer", "Victims become zombies that die with you."),
  ("Hidden", "Hidden", "#171717", "Killer", "Once you press R, you gain permanent invisibility and a knife. Everyone will be alerted."),
  ("Amnesiac", "Other", "#7f6fda", "Other", "Inspect a uninspected, dead body to take their role. Everyone will be alerted."), -- Changes Role -> wins with that team
  ("Pirate_captain", "Pirates", "#613721", "Other", "Has a contract. Giving it to a player puts you and all pirates onto their team."), -- Wins with a team
  ("Pirate", "Pirates", "#d09542", "Other", "Wins with the team that holds the pirate captains contract."), -- Wins with a team
  ("Bodyguard", "Bodyguard", "#dc8f19", "Other", "Has to protect another person, win when they win."), -- ?
  ("Drunk", "Other", "#d7a018", "Other", "Has the change to take the role of a player after they die."), -- Changes Role -> wins with that team
  ("Jester", "Jester", "#d73e90", "Other", "Wins when killed, cannot deal damage."), -- Wins on Kill
  ("Unknown", "Other", "#a7b5b6", "Other", "Come back as your killers role when killed."), -- Dies -> comes back and changes role -> wins with that team
  ("Medic", "Other", "#189f81", "Other", "Cannot win, but has a defibrilator and medigun. Everyone is alerted and your killer would be revealed."), -- cant win
  ("Mimic", "Other", "#983fab", "Other", "Can copy someones role and win the same way they would."),  -- Changes Role -> wins with that team
  ("Marker", "Marker", "#7d5383", "Other", "Has to mark enough players with a paintball gun, cannot deal damage."), -- wins alone
  ("Cupid", "Other", "#e22e8f", "Other", "Can make two peoples fall in love and share a health bar. Might be innocent or same team as the couple."), -- cant win
  ("Sidekick", "Sidekick", "#aaa8a9", "Other", "Works with someone together and wins when they win."), -- Wins with whoever he is sidekicked to
  ("Deputy", "Innocent", "#45679d", "Detective", "Plays like a detective and dies with the Sheriff."), -- Is an inno/detective (maybe change role to innocent/detective?)
  ("Thrall", "Traitor", "#ff1919", "Traitor", "Someone that became traitor through a mesmerist."), -- Is a traitor (maybe change role to traitor?)
  ("Ravenous", "Ravenous", "#aa2e0d", "Killer", "A glutton that hasn''t eaten in some time."), -- Wins alone
  ("Graverobber", "Traitor", "#b65a33", "Traitor", "A traitor with the additional goal to destroy the pharaohs ankh."), -- Is a traitor (maybe change role to traitor?)
  ("Zombie", "Zombie", "#3b1223", "Other", "A zombie that can only punch and is in a team with the necromancer / infected."), -- Wins with Necromancer / Infected
  ("InLove", "InLove", "#e22e8f", "Other", "You are in love with someone. If you weren''t from the same team, kill everyone else."),
  ("Cursed", "Other", "#39283B", "Other", "Cannot win, but pass on the role by swapping with someone."), -- swaps roles, other player becomes cursed then
  ("Liar", "Innocent", "#A2A681", "Innocent", "You don''t know you are one. Your corpse shows up as traitor and has one credit."),
  ("Undecided", "Other", "#AB17AB", "Other", "Has one minute to choose their role."), -- chooses a role
  ("Revolutionary", "Innocent", "#6A4C82", "Detective", "A detective with traitor shop."),
  ("Blocker", "Traitor", "#724E4C", "Traitor", "Prevents dead bodies from being identified as long as this traitor is alive."),
  ("Sleeper", "Traitor", "#5D524A", "Traitor", "A weird sleeper role that has to be tested"), -- TODO
  ("Loot_goblin", "Other", "#594286", "Other", "Just try to stay alive while everyone wants to kill you for cool loot.");

-- Create other tables
CREATE TABLE game (
  mid INT PRIMARY KEY AUTO_INCREMENT,
  map VARCHAR(50) NOT NULL,
  duration FLOAT NOT NULL,
  date DATE NOT NULL
);
CREATE TABLE player (
  name VARCHAR(20) PRIMARY KEY
);
CREATE TABLE buys (
  mid INT NOT NULL,
  player VARCHAR(20) NOT NULL,
  item VARCHAR(40) NOT NULL,
  time FLOAT NOT NULL,
  role VARCHAR(15) NOT NULL
);
CREATE TABLE loves (
  mid INT NOT NULL
  first VARCHAR(20) NOT NULL
  second VARCHAR(20) NOT NULL
);
CREATE TABLE participates (
  mid INT NOT NULL,
  player VARCHAR(20) NOT NULL,
  startrole VARCHAR(15) NOT NULL,  -- initial role
  won BOOLEAN
);
CREATE TABLE rolechange (
  mid INT NOT NULL,
  player VARCHAR(20) NOT NULL,
  -- causee VARCHAR(20),  -- optional
  -- crole VARCHAR(15),  -- optional
  fromrole VARCHAR(15) NOT NULL,
  torole VARCHAR(15) NOT NULL,
  time FLOAT NOT NULL
);
CREATE TABLE damages (
  mid INT NOT NULL,
  player VARCHAR(20) NOT NULL,
  vktrole VARCHAR(15) NOT NULL,
  reason VARCHAR(20) NOT NULL,
  causee VARCHAR(20),  -- optional, if not fight
  atkrole VARCHAR(15),  -- optional, if not fight
  weapon VARCHAR(30),  -- optional, if unknown
  damage INT NOT NULL,
  teamdmg BOOLEAN
);
CREATE TABLE revives (
  mid INT NOT NULL,
  player VARCHAR(20) NOT NULL,
  time FLOAT NOT NULL,
  -- causee VARCHAR(20) NOT NULL,
  -- crole VARCHAR(15) NOT NULL,
  -- reason ENUM('defibrilator', 'rolemechanic', 'zombie', 'necromancer') NOT NULL
);
CREATE TABLE dies (
  mid INT NOT NULL,
  player VARCHAR(20) NOT NULL,
  vktrole VARCHAR(15) NOT NULL,
  causee VARCHAR(20),  -- optional, if not fight
  atkrole VARCHAR(15),  -- optional, if not fight
  weapon VARCHAR(30),  -- optional, if unknown
  time FLOAT NOT NULL,
  teamkill BOOLEAN
);

CREATE TABLE configs (
  filename VARCHAR(30) NOT NULL
);