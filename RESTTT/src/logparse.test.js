const db = require('../src/utils/database.js');
const logparse = require('../src/logparse.js');
const logger = require('../src/utils/logger.js');
const { describe } = require('node:test');

describe('logparse', () => {
    var queries = [];
    var results = [];

    beforeEach(() => {
        queries = [];
        results = {};
        db.setTestFunctions((con, query, params) => {
            queries.push(db.format(query, params));
            logger.debug("LogParseTest", "Queried " + queries[queries.length - 1])
            return results[queries[queries.length - 1]];
        });
    });

    test('uses a transaction', async() => {
        await logparse.load_logfile('', '2021-01-01');

        expect(queries.shift()).toBe('SET autocommit=0');
        expect(queries.shift()).toBe('COMMIT');
        expect(queries.shift()).toBe("SET autocommit=1");
        expect(queries.length).toBe(0);
    });

    describe('for one game', () => {
        test('creates a game, stores duration and winner.', async () => {
            results = {
                "SELECT mid FROM game ORDER BY mid DESC LIMIT 1": [{mid: 1}]
            }
    
            await logparse.load_logfile([
                "Map: ttt_rooftops_2016_v1",
                "[TTT2]:	The round has begun!",
                "ServerLog: Result: innocents wins.",
                "ServerLog: 04:02.01 - ROUND_ENDED at given time"
            ], '2021-01-01');
    
            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe("INSERT INTO game (map, date, duration) VALUES ('ttt_rooftops_2016_v1', '2021-01-01', 'ongoing')");
            expect(queries.shift()).toBe('SELECT mid FROM game ORDER BY mid DESC LIMIT 1');
            expect(queries.shift()).toBe("UPDATE game SET duration = '04:02.01' WHERE mid = 1");
            expect(queries.shift()).toBe("INSERT INTO wins (mid, team) VALUES (1, 'Innocent')");
        });

        test('stores a players role', async () => {
            results = {
                "SELECT mid FROM game ORDER BY mid DESC LIMIT 1": [{mid: 1}]
            }

            await logparse.load_logfile([
                'Client "GhastM4n" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                'ServerLog: 00:00.00 - ROUND_START: GhastM4n is necromancer',
                "[TTT2]:	The round has begun!",
            ], '');

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe("INSERT IGNORE INTO player (name) VALUES ('GhastM4n')")
            expect(queries.shift()).toBe("INSERT INTO game (map, date, duration) VALUES ('', '', 'ongoing')");
            expect(queries.shift()).toBe('SELECT mid FROM game ORDER BY mid DESC LIMIT 1');
            expect(queries.shift()).toBe("INSERT INTO participates (mid, player, startrole, mainrole) VALUES (1, 'GhastM4n', 'Necromancer', 'Necromancer')");
        });

        test('handles timelimit reached', async () => {
            await logparse.load_logfile([
                "ServerLog: Result: timelimit reached, traitors lose.",
                "ServerLog: 04:02.01 - ROUND_ENDED at given time"
            ], '2021-01-01');

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe("UPDATE game SET duration = '04:02.01' WHERE mid = 0");
            expect(queries.shift()).toBe("INSERT INTO wins (mid, team) VALUES (0, 'Innocent')");
        });
    });

    test('adds joining player to player table', async () => {
        await logparse.load_logfile([
            'Client "GhastM4n" spawned in server <STEAM_0:0:152172591> (took 50 seconds).'
        ], "");

        expect(queries.shift()).toBe('SET autocommit=0');
        expect(queries.shift()).toBe("INSERT IGNORE INTO player (name) VALUES ('GhastM4n')")
    });

    test('captures bought items', async () => {
        await logparse.load_logfile([
            'ServerLog: 01:05.55 - CP_OE: Zumoari [survivalist]  ordered weapon_ttt_sandwich'
        ], "");

        expect(queries.shift()).toBe('SET autocommit=0');
        expect(queries.shift()).toBe("INSERT INTO buys (mid, player, item, time, role) VALUES (0, 'Zumoari', 'weapon_ttt_sandwich', '01:05.55', 'Survivalist')");
    });

    test('captures loved ones', async () => {
        await logparse.load_logfile([
            'P1 is now in love with P2'
        ], "");

        expect(queries.shift()).toBe('SET autocommit=0');
        expect(queries.shift()).toBe("INSERT INTO loves (mid, first, second) VALUES (0, 'P1', 'P2')");
    });

    describe('handles role special cases', () => {
        test('ignore vampire world damage', async () => {
            await logparse.load_logfile([
                "ServerLog: 01:00.02 - CP_DMG OTHER<0>: nonplayer (Entity [0][worldspawn]) damaged GhastM4n [vampire, traitors] for 1"
            ]);

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe("COMMIT");
        })
    });

    describe('handles kills', () => {
        test("for PvE", async () => {
            await logparse.load_logfile([
                "ServerLog: 02:57.17 - CP_KILL: nonplayer (Entity [0][worldspawn]) killed Schnitzelboy [traitor, traitors]",
            ], "");

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe("INSERT INTO dies (mid, player, vktrole, time) VALUES (0, 'Schnitzelboy', 'Traitor', '02:57.17')");
        });

        test("for PvP", async () => {
            await logparse.load_logfile([
                "ServerLog: 02:58.71 - CP_KILL: GhastM4n [glutton, traitors] <Weapon [1126][w1]>, (Player [4][GhastM4n], GhastM4n) killed Poci [amnesiac, nones]"
            ], "");

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Amnesiac', '02:58.71', 'GhastM4n', 'Glutton', 'w1', false)");
        });

        test("for non-weapon kill", async () => {
            await logparse.load_logfile([
                "ServerLog: 04:28.22 - CP_KILL: vinno [traitor, traitors] <[NULL Entity]>, (Entity [263][env_explosion], ) killed Poci [amnesiac, nones]"
            ], "");

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Amnesiac', '04:28.22', 'vinno', 'Traitor', 'env_explosion', false)");
        });

        test("for selfkill", async () => {
            await logparse.load_logfile([
                "ServerLog: 04:28.22 - CP_KILL: vinno [traitor, traitors] <[NULL Entity]>, (Entity [263][env_explosion], ) killed vinno [traitor, traitors]"
            ], "");

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'vinno', 'Traitor', '04:28.22', 'vinno', 'Traitor', 'env_explosion', false)");
        })

        test("for teamkill", async () => {
            await logparse.load_logfile([
                "ServerLog: 02:58.71 - CP_KILL: GhastM4n [glutton, traitors] <Weapon [1126][w1]>, (Player [4][GhastM4n], GhastM4n) killed Poci [glutton, traitors]"
            ], "");

            expect(queries.shift()).toBe('SET autocommit=0');
            expect(queries.shift()).toBe(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Glutton', '02:58.71', 'GhastM4n', 'Glutton', 'w1', true)");
        });
    })
})