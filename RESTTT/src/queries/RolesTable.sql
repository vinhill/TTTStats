CREATE TABLE roles (
	role VARCHAR(10) PRIMARY KEY, 
	team ENUM('Innocent', 'Traitor', 'Serialkiller', 'Jackal', 'Restless', 'Doppelganger', 'Necromancer', 'Infected', 'Hidden', 'Pirates', 'Bodyguard', 'Jester', 'Marker', 'Other', 'Sidekick', 'Ravenous', 'Graverobber'), 
	colour TEXT, 
	superteam ENUM('Detective', 'Innocent', 'Traitor', 'Killer', 'Other'))