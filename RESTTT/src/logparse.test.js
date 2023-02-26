const db = require('../src/utils/database.js');
const logparse = require('../src/logparse.js');
const logger = require('../src/utils/logger.js');

class SimuGame {
    constructor(map = "", date = "") {
        this.map = map
        this.date = date
        this.players = new Set()
        this.logs = []
    }

    addPlayer(name) {
        this.players.add(name)
        this.logs.push(`Client "${name}" spawned in server <STEAM_0:0:000000000> (took 5 seconds).`)
    }

    removePlayer(name) {
        this.players.delete(name)
        this.logs.push(`Dropped ${name} from server`)
    }

    init() {
        this.logs.push(`Map: ${this.map}`)
        this.logs.push("Round state: 2")
    }

    prepare(roles = {}) {
        for (const p of this.players) {
            this.logs.push(`ServerLog: 00:00.00 - ROUND_START: ${p} is ${roles[p]}`)
        }
        this.logs.push("Round state: 3")
    }

    start(logs) {
        this.logs = this.logs.concat(logs)
    }

    end(timeout = false, elseresult = "traitors wins.", time = "09:01.01") {
        if (timeout)
            this.logs.push("ServerLog: Result: timelimit reached, traitors lose.")
        else
            this.logs.push(`ServerLog: Result: ${elseresult}`)
        this.logs.push(`ServerLog: ${time} - ROUND_ENDED at given time`)
        this.logs.push("Round state: 4")
    }

    async submit() {
        await logparse.load_logfile(this.logs, this.date)
    }
}

describe('logparse', () => {
    var queries = [];
    var results = {};

    function expectInitialQueries() {
        expect(queries.shift()).toBe('SET autocommit=0');
    }

    beforeEach(() => {
        queries = [];
        results = {
            "SELECT mid FROM game ORDER BY mid DESC LIMIT 1": [{mid: 0}]
        };
        db.setTestFunctions((con, query, params) => {
            queries.push(db.format(query, params));
            logger.debug("LogParseTest", "Queried " + queries[queries.length - 1])
            return new Promise((res, rej) => res(results[queries[queries.length - 1]] || []));
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
        test('creates a game and stores duration.', async () => {
            results["SELECT mid FROM game ORDER BY mid DESC LIMIT 1"] = [{mid: 5}]
    
            await logparse.load_logfile([
                "Map: ttt_rooftops_2016_v1",
                "Round state: 2",
                "Round state: 3",
                "ServerLog: Result: innocents wins.",
                "ServerLog: 04:02.01 - ROUND_ENDED at given time",
                "Round state: 4"
            ], '2021-01-01');
    
            expect(queries.includes(
                "INSERT INTO game (map, date, duration) VALUES ('ttt_rooftops_2016_v1', '2021-01-01', 0)"
                )).toBe(true);
            expect(queries.includes(
                "UPDATE game SET duration = 242.01 WHERE mid = 5"
                )).toBe(true);
        });

        test('stores a players role', async () => {
            results["SELECT mid FROM game ORDER BY mid DESC LIMIT 1"] = [{mid: 1}]

            await logparse.load_logfile([
                'Client "GhastM4n" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                'ServerLog: 00:00.00 - ROUND_START: GhastM4n is necromancer',
                "Round state: 3",
            ], '');

            expect(queries.includes(
                "INSERT INTO participates (mid, player, startrole) VALUES (1, 'GhastM4n', 'Necromancer')"
                )).toBe(true);
        });

        test('handles timelimit reached', async () => {
            results["SELECT name, team FROM role"] = [{'name': 'Innocent', 'team': 'Innocent'}];
            results["SELECT mid FROM game ORDER BY mid DESC LIMIT 1"] = [{mid: 0}]

            await logparse.load_logfile([
                'Client "GhastM4n" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                'Round state: 2',
                'ServerLog: 00:00.00 - ROUND_START: GhastM4n is innocent',
                "ServerLog: Result: timelimit reached, traitors lose.",
                "ServerLog: 04:02.01 - ROUND_ENDED at given time",
                "Round state: 4"
            ], '2021-01-01');

            expect(queries.includes(
                "UPDATE game SET duration = 242.01 WHERE mid = 0"
            )).toBe(true);
            expect(queries.includes(
                "UPDATE participates SET won = true WHERE mid = 0 AND player = 'GhastM4n'"
            )).toBe(true);
        });
    });

    test('adds joining player to player table', async () => {
        await logparse.load_logfile([
            'Client "GhastM4n" spawned in server <STEAM_0:0:152172591> (took 50 seconds).'
        ], "");

        expect(queries.includes(
            "INSERT IGNORE INTO player (name) VALUES ('GhastM4n')"
        )).toBe(true);
    });

    test('captures bought items', async () => {
        await logparse.load_logfile([
            'ServerLog: 01:05.55 - CP_OE: Zumoari [survivalist]  ordered weapon_ttt_sandwich'
        ], "");

        expect(queries.includes(
            "INSERT INTO buys (mid, player, item, time, role) VALUES (0, 'Zumoari', 'weapon_ttt_sandwich', 65.55, 'Survivalist')"
        )).toBe(true);
    });

    describe('handles role special cases', () => {
        test('ignore vampire world damage', async () => {
            await logparse.load_logfile([
                "Round state: 2",
                "ServerLog: 01:00.02 - CP_DMG OTHER<0>: nonplayer (Entity [0][worldspawn]) damaged GhastM4n [vampire, traitors] for 1",
                "ServerLog: 01:00.03 - CP_DMG OTHER<0>: nonplayer (Entity [0][worldspawn]) damaged GhastM4n [vampire, traitors] for 2",
                'Round state: 4'
            ]);

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, damage) VALUES (0, 'GhastM4n', 'Vampire', 'OTHER<0>', 2)"
            )).toBe(true);
        });

        test('multiple bodyguard win mechanic', async () => {
            results["SELECT name, team FROM role"] = [{name: 'Bodyguard', team: 'Innocent'}];

            await logparse.load_logfile([
                'Client "V8Block" spawned in server <STEAM_0:1:202841564> (took 40 seconds).',
                'Client "Poci" spawned in server <STEAM_0:1:202841564> (took 40 seconds).',
                'Round state: 2',
                'ServerLog: 00:00.00 - ROUND_START: V8Block is bodyguard',
                'ServerLog: 00:00.00 - ROUND_START: Poci is bodyguard',
                'ServerLog: 00:00.06 - CP_TC: V8Block [bodyguard] changed Team from innocents to traitors',
                'ServerLog: Result: traitors wins.',
                'Round state: 4'
            ], "");

            expect(queries.includes(
                "UPDATE participates SET won = true WHERE mid = 0 AND player = 'V8Block'"
            )).toBe(true);
            expect(queries.includes(
                "UPDATE participates SET won = false WHERE mid = 0 AND player = 'Poci'"
            )).toBe(true);
        });

        test("doppelganger may stay killer", async () => {
            results["SELECT name, team FROM role"] = [{name: 'Doppelganger', team: 'Doppelganger'}];

            let game = new SimuGame();
            game.addPlayer("Zumoari");
            game.init();
            game.prepare({"Zumoari": "Doppelganger"});
            game.start([
                'ServerLog: 00:00.00 - ROUND_START: Zumoari is doppelganger',
            ])
            game.end(false, "doppelganger wins.");
            game.prepare({"Zumoari": "Doppelganger"});
            game.start([
                'ServerLog: 00:08.39 - CP_TC: Zumoari [cursed] changed Team from doppelgangers to nones',
                'ServerLog: 00:08.39 - CP_RC: Zumoari changed Role from innocent to cursed'
            ])
            game.end(false, "doppelganger wins.");
            await game.submit();

            expect(queries.includes(
                "UPDATE participates SET won = true WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
            expect(queries.includes(
                "UPDATE participates SET won = false WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });

        test('captures loved ones', async () => {
            await logparse.load_logfile([
                'P1 is now in love with P2'
            ], "");
    
            expect(queries.includes(
                "INSERT INTO teamup (mid, first, second, reason) VALUES (0, 'P1', 'P2', 'love')"
            )).toBe(true);
        });

        test("captures jackal teamup", async () => {
            await logparse.load_logfile([
                'Round state: 2',
                'ServerLog: 01:41.99 - CP_DMG BULLET: vinno [jackal, jackals] <Weapon [126][weapon_ttt2_sidekickdeagle]>, (Player [4][vinno], vinno) damaged GhastM4n [sidekick, jackals] for 0',
                'ServerLog: 01:41.99 - CP_DMG BULLET: vinno [jackal, jackals] <Weapon [126][weapon_ttt2_sidekickdeagle]>, (Player [4][vinno], vinno) damaged GhastM4n [sidekick, jackals] for 0'
            ], "");

            expect(queries.includes(
                "INSERT INTO teamup (mid, first, second, reason) VALUES (0, 'vinno', 'GhastM4n', 'jackal')"
            )).toBe(true);
            expect(queries.filter(q => q.includes("INSERT INTO teamup (mid, first, second, reason) VALUES (0, 'vinno', 'GhastM4n', 'jackal')")).length).toBe(1);
        });

        test("lootgoblin win on survive", async () => {
            results["SELECT name, team FROM role"] = [{name: 'Lootgoblin', team: 'None'}];

            let game = new SimuGame();
            game.addPlayer("Zumoari");
            game.init();
            game.prepare({"Zumoari": "Lootgoblin"});
            game.start()
            game.end(true);
            await game.submit();

            expect(queries.includes(
                "UPDATE participates SET won = true WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });

        test("lootgoblin lose on death", async () => {
            results["SELECT name, team FROM role"] = [{name: 'Lootgoblin', team: 'None'}];

            let game = new SimuGame();
            game.addPlayer("Zumoari");
            game.init();
            game.prepare({"Zumoari": "Lootgoblin"});
            game.start([
                "ServerLog: 02:57.16 - CP_KILL: nonplayer (Entity [0][worldspawn]) killed Zumoari [lootgoblin, nones]"
            ])
            game.end(false, "nones win.");
            await game.submit();

            expect(queries.includes(
                "UPDATE participates SET won = false WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });
    });

    describe('handles kills', () => {
        test("for PvE", async () => {
            await logparse.load_logfile([
                'Client "Schnitzelboy" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                "ServerLog: 02:57.16 - CP_KILL: nonplayer (Entity [0][worldspawn]) killed Schnitzelboy [traitor, traitors]",
            ], "");

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time) VALUES (0, 'Schnitzelboy', 'Traitor', 177.16)"
            )).toBe(true);
        });

        test("for PvP", async () => {
            await logparse.load_logfile([
                'Client "Poci" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                "ServerLog: 02:58.71 - CP_KILL: GhastM4n [glutton, traitors] <Weapon [1126][w1]>, (Player [4][GhastM4n], GhastM4n) killed Poci [amnesiac, nones]"
            ], "");

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Amnesiac', 178.71, 'GhastM4n', 'Glutton', 'w1', false)"
            )).toBe(true);
        });

        test("for non-weapon kill", async () => {
            await logparse.load_logfile([
                'Client "Poci" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                "ServerLog: 04:28.22 - CP_KILL: vinno [traitor, traitors] <[NULL Entity]>, (Entity [263][env_explosion], ) killed Poci [amnesiac, nones]"
            ], "");

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Amnesiac', 268.22, 'vinno', 'Traitor', 'env_explosion', false)"
            )).toBe(true);
        });

        test("for selfkill", async () => {
            await logparse.load_logfile([
                'Client "vinno" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                "ServerLog: 04:28.22 - CP_KILL: vinno [traitor, traitors] <[NULL Entity]>, (Entity [263][env_explosion], ) killed vinno [traitor, traitors]"
            ], "");

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'vinno', 'Traitor', 268.22, 'vinno', 'Traitor', 'env_explosion', false)"
            )).toBe(true);
        });

        test("for teamkill", async () => {
            await logparse.load_logfile([
                'Client "Poci" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                "ServerLog: 02:58.71 - CP_KILL: GhastM4n [glutton, traitors] <Weapon [1126][w1]>, (Player [4][GhastM4n], GhastM4n) killed Poci [glutton, traitors]"
            ], "");

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Glutton', 178.71, 'GhastM4n', 'Glutton', 'w1', true)"
            )).toBe(true);
        });
    });

    describe("handles damage", () => {
        test("for PvP", async () => {
            await logparse.load_logfile([
                "Round state: 2",
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t2] for 85",
                "Round state: 4"
            ], "");

            expectInitialQueries();
            expect(queries.shift()).toBe("SELECT name, team FROM role");
            expect(queries.shift()).toBe(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'BULLET', 'p1', 'R1', 'w1', false, 85)");
        });

        test("for PvE", async () => {
            await logparse.load_logfile([
                "Round state: 2",
                "ServerLog: 00:52.92 - CP_DMG FALL: nonplayer (Entity [0][worldspawn]) damaged p2 [r2, t2] for 85",
                "Round state: 4"
            ], "");

            expectInitialQueries();
            expect(queries.shift()).toBe("SELECT name, team FROM role");
            expect(queries.shift()).toBe(
                "INSERT INTO damage (mid, player, vktrole, reason, damage) VALUES (0, 'p2', 'R2', 'FALL', 85)");
        });

        test("for non-weapon damage", async () => {
            await logparse.load_logfile([
                "Round state: 2",
                "ServerLog: 00:52.92 - CP_DMG EXPL: p1 [r1, t1] <[NULL Entity]>, (Entity [3][w1], ) damaged p2 [r2, t2] for 85",
                "Round state: 4"
            ], "");

            expectInitialQueries();
            expect(queries.shift()).toBe("SELECT name, team FROM role");
            expect(queries.shift()).toBe(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'EXPL', 'p1', 'R1', 'w1', false, 85)");
        });

        test("for selfdamage", async () => {
            await logparse.load_logfile([
                "Round state: 2",
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p1 [r1, t1] for 85",
                "Round state: 4"
            ], "");

            expectInitialQueries();
            expect(queries.shift()).toBe("SELECT name, team FROM role");
            expect(queries.shift()).toBe(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p1', 'R1', 'BULLET', 'p1', 'R1', 'w1', false, 85)");
        })

        test("for teamdamage", async () => {
            await logparse.load_logfile([
                "Round state: 2",
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t1] for 85",
                "Round state: 4"
            ], "");

            expectInitialQueries();
            expect(queries.shift()).toBe("SELECT name, team FROM role");
            expect(queries.shift()).toBe(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'BULLET', 'p1', 'R1', 'w1', true, 85)");
        });

        test("through aggregation", async () => {
            await logparse.load_logfile([
                "Round state: 2",
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t2] for 10",
                "ServerLog: 01:54.93 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t2] for 12",
                "Round state: 4"
            ], "");

            expectInitialQueries();
            expect(queries.shift()).toBe("SELECT name, team FROM role");
            expect(queries.shift()).toBe(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'BULLET', 'p1', 'R1', 'w1', false, 22)");
        });
    });

    test("handles rolechange", async () => {
        await logparse.load_logfile([
            'Client "GhastM4n" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
            "ServerLog: 03:35.91 - CP_RC: GhastM4n changed Role from survivalist to traitor"
        ], "");

        expect(queries.includes(
            "INSERT INTO rolechange (mid, player, orig, dest, time) VALUES (0, 'GhastM4n', 'Survivalist', 'Traitor', 215.91)"
        )).toBe(true);
    });

    test("stores medium messages", async () => {
        await logparse.load_logfile([
            '[TTT2 Medium Role] Noisified chat: mrkus retess'
        ], "");

        expect(queries.includes(
            "INSERT INTO mediumchat (mid, msg) VALUES (0, 'mrkus retess')"
        )).toBe(true);
    });

    describe("handles karma", () => {
        test("by storing the current sub 1000 karma with time", async () => {
            await logparse.load_logfile([
                'Round state: 2',
                'Client "V8Block" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                'ServerLog: 00:05.50 - CP_DMG BULLET: V8Block [r, t] <Weapon [735][w]>, (Player [7][V8Block], V8Block) damaged p2 [r2, t2] for 10',
                "V8Block (989.5) hurt Schnitzelboy (1000.000000) and gets penalised for 10.450000"
            ], "");

            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 989.5, 5.5)"
            )).toBe(true);
        });

        test("when getting back to 1000 karma", async () => {
            await logparse.load_logfile([
                'Round state: 2',
                'Client "V8Block" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                "V8Block (989.5) hurt Schnitzelboy (1000.000000) and gets penalised for 10.450000",
                "V8Block (1000) hurt Schnitzelboy (1000.000000) and gets REWARDED for 10.450000"
            ], "");

            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 989.5, 0)"
            )).toBe(true);
            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 1000, 0)"
            )).toBe(true);
        })

        test("by not storing continuous 1000 karma", async () => {
            await logparse.load_logfile([
                'Round state: 2',
                'Client "V8Block" spawned in server <STEAM_0:0:152172591> (took 50 seconds).',
                "V8Block (1000) hurt Schnitzelboy (1000) and gets REWARDED for 10.450000",
                "V8Block (989.5) hurt Schnitzelboy (1000.000000) and gets penalised for 10.450000"
            ], "");

            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 1000, 0)"
            )).toBe(false);
            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 989.5, 0)"
            )).toBe(true);
        });
    });

    describe("tracks survival", () => {
        test("when player survives", async () => {
            let game = new SimuGame();
            game.addPlayer("Zumoari");
            game.init();
            game.prepare({"Zumoari": "innocent"});
            game.start();
            game.end();
            await game.submit();

            expect(queries.includes(
                "UPDATE participates SET survived = true WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });

        test("when player dies", async () => {
            let game = new SimuGame();
            game.addPlayer("Zumoari");
            game.init();
            game.prepare({"Zumoari": "innocent"});
            game.start([
                'ServerLog: 01:12.15 - CP_KILL: p1 [r1, t1] <Weapon [159][w]>, (Player [3][p1], p1) killed Zumoari [r2, t2]',
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "UPDATE participates SET survived = false WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });

        test("when player is revived", async () => {
            let game = new SimuGame();
            game.addPlayer("Zumoari");
            game.init();
            game.prepare({"Zumoari": "innocent"});
            game.start([
                'ServerLog: 01:12.15 - CP_KILL: p1 [r1, t1] <Weapon [159][w]>, (Player [3][p1], p1) killed Zumoari [r2, t2]',
                'ServerLog: 01:12.15 - TTT2Revive: Zumoari has been respawned.',
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "UPDATE participates SET survived = true WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });
    });

    test("handles duplicated round state 3", async () => {
        results["SELECT mid FROM game ORDER BY mid DESC LIMIT 1"] = [{mid: 5}]

        await logparse.load_logfile([
            'Round state: 2',
            'Round state: 3',
            'Round state: 3'
        ], "");

        expect(queries.filter(q => q.startsWith("INSERT INTO game")).length).toBe(1);
    });
});