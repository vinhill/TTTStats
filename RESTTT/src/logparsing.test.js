const db = require('./utils/database.js');
const load_logfile = require('../src/logparsing.js');
const logger = require('./utils/logger.js');

class SimuGame {
    constructor(map = "", fname = "", date = "") {
        this.map = map
        this.date = date
        this.fname = fname
        this.players = []
        this.logs = []
    }

    addPlayer(name, role="innocent", team="innocents") {
        this.players.push({name, role, team})
    }

    removePlayer(name) {
        this.players = this.players.filter(p => p.name !== name)
    }

    updatePlayer(name, role, team) {
        this.players = this.players.map(p => {
            p.name == name ? {name, role, team} : p
        })
    }

    prepare() {
        this.logs.push(`CP map: ${this.map}`)
        this.logs.push("CP round state: prep")
        for (let {name, role, team} of this.players) {
            this.logs.push(`ServerLog: 00:00.00 - ROUND_START: ${name} [${role}, ${team}]`)
        }
    }

    start(logs = []) {
        this.logs.push("CP round state: active")
        this.logs = this.logs.concat(logs)
    }

    end(timeout = false, elseresult = "traitors wins.", time = "09:01.01") {
        if (timeout)
            this.logs.push("ServerLog: Result: timelimit reached, traitors lose.")
        else
            this.logs.push(`ServerLog: Result: ${elseresult}`)
        this.logs.push("CP round state: post")
        this.logs.push(`ServerLog: ${time} - ROUND_ENDED at given time`)
    }

    async submit() {
        await load_logfile(this.logs, this.fname, this.date)
    }

    async run(steps=[2,3,4]) {
        if (steps.includes(2))
            this.prepare()
        if (steps.includes(3))
            this.start()
        if (steps.includes(4))
            this.end()
        await this.submit()
    }
}

describe('logparsing', () => {
    var queries = [];
    var results = {};

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

    describe('for one game', () => {
        test('creates a game and stores duration.', async () => {
            results["SELECT mid FROM game ORDER BY mid DESC LIMIT 1"] = [{mid: 5}]

            const game = new SimuGame(map="ttt_rooftops_2016_v1", fname="test", date="2021-01-01");
            game.prepare();
            game.start();
            game.end(false, "traitors win.", "4:02.01");
            await game.submit();

            expect(queries.includes(
                "INSERT INTO configs (filename) VALUES ('test')"
            )).toBe(true);
            expect(queries.includes(
                "INSERT INTO game (map, date, duration) VALUES ('ttt_rooftops_2016_v1', '2021-01-01', 0)"
                )).toBe(true);
            expect(queries.includes(
                "UPDATE game SET duration = 242.01 WHERE mid = 5"
                )).toBe(true);
        });

        test('stores a players role', async () => {
            results["SELECT mid FROM game ORDER BY mid DESC LIMIT 1"] = [{mid: 1}]

            const game = new SimuGame();
            game.addPlayer('GhastM4n', 'necromancer', 'traitors');
            await game.run([2, 3]);

            expect(queries.includes(
                "INSERT INTO participates (mid, player, startrole) VALUES (1, 'GhastM4n', 'Necromancer')"
                )).toBe(true);
        });

        test('handles timelimit reached', async () => {
            results["SELECT name, team FROM role"] = [{'name': 'Innocent', 'team': 'Innocent'}];
            results["SELECT mid FROM game ORDER BY mid DESC LIMIT 1"] = [{mid: 0}]

            const game = new SimuGame();
            game.addPlayer('GhastM4n', 'innocent', 'innocent');
            game.prepare();
            game.start();
            game.end(true, "", "4:02.01");
            await game.submit();

            expect(queries.includes(
                "UPDATE game SET duration = 242.01 WHERE mid = 0"
            )).toBe(true);
            expect(queries.includes(
                "UPDATE participates SET won = true WHERE mid = 0 AND player = 'GhastM4n'"
            )).toBe(true);
        });
    });

    test('adds participating player to player table', async () => {
        const game = new SimuGame();
        game.addPlayer('GhastM4n', 'necromancer', 'traitors');
        await game.run([2]);

        expect(queries.includes(
            "INSERT IGNORE INTO player (name) VALUES ('GhastM4n')"
        )).toBe(true);
    });

    test('captures bought items', async () => {
        await load_logfile([
            'ServerLog: 01:05.55 - CP_OE: Zumoari [survivalist, t] ordered weapon_ttt_sandwich'
        ], "");

        expect(queries.includes(
            "INSERT INTO buys (mid, player, item, time, role) VALUES (0, 'Zumoari', 'weapon_ttt_sandwich', 65.55, 'Survivalist')"
        )).toBe(true);
    });

    describe('handles role special cases', () => {
        test('ignore vampire world damage', async () => {
            const game = new SimuGame();
            game.addPlayer('GhastM4n', 'vampire', 'traitors');
            game.prepare();
            game.start([
                "ServerLog: 01:00.02 - CP_DMG OTHER<0>: nonplayer (Entity [0][worldspawn]) damaged GhastM4n [vampire, traitors] for 1",
                "ServerLog: 01:00.03 - CP_DMG OTHER<0>: nonplayer (Entity [0][worldspawn]) damaged GhastM4n [vampire, traitors] for 2",
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, damage) VALUES (0, 'GhastM4n', 'Vampire', 'OTHER<0>', 2)"
            )).toBe(true);
        });

        test('multiple bodyguard win mechanic', async () => {
            results["SELECT name, team FROM role"] = [{name: 'Bodyguard', team: 'Innocent'}];

            const game = new SimuGame();
            game.addPlayer('V8Block', 'bodyguard', 'innocent');
            game.addPlayer('Poci', 'bodyguard', 'innocent');
            game.prepare();
            game.start([
                'ServerLog: 00:00.06 - CP_TC: V8Block [bodyguard, t] changed Team from [innocents] to [traitors]',
            ]);
            game.end(false, "traitors wins.");
            await game.submit();

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
            game.addPlayer("Zumoari", "doppelganger", "doppelganger");
            game.prepare();
            game.start();
            game.end(false, "doppelganger wins.");
            game.prepare();
            game.start([
                'ServerLog: 00:08.39 - CP_TC: Zumoari [cursed, t] changed Team from [doppelgangers] to [nones]',
                'ServerLog: 00:08.39 - CP_RC: Zumoari [r, t] changed Role from [innocent] to [cursed]'
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
            const game = new SimuGame();
            game.addPlayer('Zumoari');
            game.addPlayer('Poci');
            game.prepare();
            game.start([
                'ServerLog: 00:55.67 - CP_TC: Zumoari [cupid, lovers] changed Team from [innocents] to [lovers]',
                'ServerLog: 00:55.67 - CP_TC: Poci [bodyguard, lovers] changed Team from [innocents] to [lovers]'
            ]);
            await game.submit();
    
            expect(queries.includes(
                "INSERT INTO teamup (mid, first, second, reason) VALUES (0, 'Poci', 'Zumoari', 'love')"
            )).toBe(true);
        });

        test("captures jackal teamup", async () => {
            const game = new SimuGame();
            game.addPlayer('vinno', 'jackal', 'jackals');
            game.addPlayer('GhastM4n', 'innocent', 'innocent');
            game.prepare();
            game.start([
                'ServerLog: 01:41.99 - CP_DMG BULLET: vinno [jackal, jackals] <Weapon [126][weapon_ttt2_sidekickdeagle]>, (Player [4][vinno], vinno) damaged GhastM4n [sidekick, jackals] for 0',
                'ServerLog: 01:41.99 - CP_DMG BULLET: vinno [jackal, jackals] <Weapon [126][weapon_ttt2_sidekickdeagle]>, (Player [4][vinno], vinno) damaged GhastM4n [sidekick, jackals] for 0'
            ]);
            await game.submit();

            expect(queries.filter(q => q.includes("INSERT INTO teamup (mid, first, second, reason) VALUES (0, 'vinno', 'GhastM4n', 'jackal')")).length).toBe(1);
        });

        test("captures sheriff teamup", async () => {
            const game = new SimuGame();
            game.addPlayer('GhastM4n', 'sheriff', 'innocent');
            game.addPlayer('Dr Who', 'innocent', 'innocent');
            game.prepare();
            game.start([
                'ServerLog: 00:09.36 - CP_RC: Dr Who [deputy, innocents] changed Role from [innocent] to [detective]',
                'ServerLog: 00:09.36 - CP_DMG BULLET: GhastM4n [sheriff, innocents] <Weapon [110][weapon_ttt2_deputydeagle]>, (Player [3][GhastM4n], GhastM4n) damaged Dr Who [deputy, innocents] for 0',
                'ServerLog: 00:09.36 - CP_DMG BULLET: GhastM4n [sheriff, innocents] <Weapon [110][weapon_ttt2_deputydeagle]>, (Player [3][GhastM4n], GhastM4n) damaged Dr Who [deputy, innocents] for 0',
            ]);
            await game.submit();

            expect(queries.filter(q => q.includes("INSERT INTO teamup (mid, first, second, reason) VALUES (0, 'GhastM4n', 'Dr Who', 'sheriff')")).length).toBe(1);
        });

        test("lootgoblin win on survive", async () => {
            results["SELECT name, team FROM role"] = [{name: 'Lootgoblin', team: 'None'}];

            let game = new SimuGame();
            game.addPlayer("Zumoari", "lootgoblin", "nones");
            await game.run();

            expect(queries.includes(
                "UPDATE participates SET won = true WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });

        test("lootgoblin lose on death", async () => {
            results["SELECT name, team FROM role"] = [{name: 'Lootgoblin', team: 'None'}];

            let game = new SimuGame();
            game.addPlayer("Zumoari", "lootgoblin", "nones")
            game.prepare();
            game.start([
                "ServerLog: 02:57.16 - CP_KILL: nonplayer (Entity [0][worldspawn]) killed Zumoari [lootgoblin, nones]"
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "UPDATE participates SET won = false WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });

        test("Cursed deaths don't count", async() => {
            let game = new SimuGame();
            game.addPlayer("Zumoari", "cursed", "nones");
            game.prepare();
            game.start([
                "ServerLog: 02:57.16 - CP_KILL: nonplayer (Entity [0][worldspawn]) killed Zumoari [cursed, nones]",
                "ServerLog: 02:58.71 - CP_KILL: P1 [r1, t1] <Weapon [1126][w1]>, (Player [4][P1], P1) killed Zumoari [cursed, nones]"
            ]);
            game.end();
            await game.submit();
            
            expect(queries.some(
                (value, _i, _a) => /dies/.exec(value)
            )).toBe(false);
        });
    });

    describe('handles kills', () => {
        test("for PvE", async () => {
            const game = new SimuGame();
            game.addPlayer('Schnitzelboy', 'traitor', 'traitors');
            game.prepare();
            game.start([
                "ServerLog: 02:57.16 - CP_KILL: nonplayer (Entity [0][worldspawn]) killed Schnitzelboy [traitor, traitors]",
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time) VALUES (0, 'Schnitzelboy', 'Traitor', 177.16)"
            )).toBe(true);
        });

        test("for PvP", async () => {
            const game = new SimuGame();
            game.addPlayer("GhastM4n", "glutton", "traitors");
            game.addPlayer("Poci", "amnesiac", "nones");
            game.prepare();
            game.start([
                "ServerLog: 02:58.71 - CP_KILL: GhastM4n [glutton, traitors] <Weapon [1126][w1]>, (Player [4][GhastM4n], GhastM4n) killed Poci [amnesiac, nones]"
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Amnesiac', 178.71, 'GhastM4n', 'Glutton', 'w1', false)"
            )).toBe(true);
        });

        test("for non-weapon kill", async () => {
            const game = new SimuGame();
            game.addPlayer("vinno", "traitor", "traitors");
            game.addPlayer("Poci", "amnesiac", "nones");
            game.prepare();
            game.start([
                "ServerLog: 04:28.22 - CP_KILL: vinno [traitor, traitors] <[NULL Entity]>, (Entity [263][env_explosion], ) killed Poci [amnesiac, nones]"
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Amnesiac', 268.22, 'vinno', 'Traitor', 'env_explosion', false)"
            )).toBe(true);
        });

        test("for selfkill", async () => {
            const game = new SimuGame();
            game.addPlayer("vinno", "traitor", "traitors");
            game.prepare();
            game.start([
                "ServerLog: 04:28.22 - CP_KILL: vinno [traitor, traitors] <[NULL Entity]>, (Entity [263][env_explosion], ) killed vinno [traitor, traitors]"
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'vinno', 'Traitor', 268.22, 'vinno', 'Traitor', 'env_explosion', false)"
            )).toBe(true);
        });

        test("for teamkill", async () => {
            const game = new SimuGame();
            game.addPlayer("GhastM4n", "glutton", "traitors");
            game.addPlayer("Poci", "glutton", "traitors");
            game.prepare();
            game.start([
                "ServerLog: 02:58.71 - CP_KILL: GhastM4n [glutton, traitors] <Weapon [1126][w1]>, (Player [4][GhastM4n], GhastM4n) killed Poci [glutton, traitors]"
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO dies (mid, player, vktrole, time, causee, atkrole, weapon, teamkill) VALUES (0, 'Poci', 'Glutton', 178.71, 'GhastM4n', 'Glutton', 'w1', true)"
            )).toBe(true);
        });
    });

    describe("handles damage", () => {
        test("for PvP", async () => {
            const game = new SimuGame();
            game.prepare();
            game.start([
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t2] for 85",
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'BULLET', 'p1', 'R1', 'w1', false, 85)"
            )).toBe(true);
        });

        test("for PvE", async () => {
            const game = new SimuGame();
            game.prepare();
            game.start([
                "ServerLog: 00:52.92 - CP_DMG FALL: nonplayer (Entity [0][worldspawn]) damaged p2 [r2, t2] for 85",
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, damage) VALUES (0, 'p2', 'R2', 'FALL', 85)"
            )).toBe(true);
        });

        test("for non-weapon damage", async () => {
            const game = new SimuGame();
            game.prepare();
            game.start([
                "ServerLog: 00:52.92 - CP_DMG EXPL: p1 [r1, t1] <[NULL Entity]>, (Entity [3][w1], ) damaged p2 [r2, t2] for 85",
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'EXPL', 'p1', 'R1', 'w1', false, 85)"
            )).toBe(true);
        });

        test("for selfdamage", async () => {
            const game = new SimuGame();
            game.prepare();
            game.start([
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p1 [r1, t1] for 85",
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p1', 'R1', 'BULLET', 'p1', 'R1', 'w1', false, 85)"
            )).toBe(true);
        })

        test("for teamdamage", async () => {
            const game = new SimuGame();
            game.prepare();
            game.start([
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t1] for 85",
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'BULLET', 'p1', 'R1', 'w1', true, 85)"
            )).toBe(true);
        });

        test("through aggregation", async () => {
            const game = new SimuGame();
            game.prepare();
            game.start([
                "ServerLog: 00:52.92 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t2] for 10",
                "ServerLog: 01:54.93 - CP_DMG BULLET: p1 [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged p2 [r2, t2] for 12"
            ]);
            game.end();
            await game.submit();

            expect(queries.includes(
                "INSERT INTO damage (mid, player, vktrole, reason, causee, atkrole, weapon, teamdmg, damage) VALUES (0, 'p2', 'R2', 'BULLET', 'p1', 'R1', 'w1', false, 22)"
            )).toBe(true);
        });
    });

    test("handles rolechange", async () => {
        const game = new SimuGame();
        game.addPlayer("GhastM4n", "Survivalist", "innocents");
        game.prepare();
        game.start([
            "ServerLog: 03:35.91 - CP_RC: GhastM4n [r, t] changed Role from [survivalist] to [traitor]"
        ])
        await game.submit();

        expect(queries.includes(
            "INSERT INTO rolechange (mid, player, orig, dest, time) VALUES (0, 'GhastM4n', 'Survivalist', 'Traitor', 215.91)"
        )).toBe(true);
    });

    test("stores medium messages", async () => {
        await load_logfile([
            '[TTT2 Medium Role] Noisified chat: mrkus retess'
        ], "");

        expect(queries.includes(
            "INSERT INTO mediumchat (mid, msg) VALUES (0, 'mrkus retess')"
        )).toBe(true);
    });

    describe("handles karma", () => {
        test("by storing the current sub 10000 karma with time", async () => {
            const game = new SimuGame();
            game.addPlayer("V8Block");
            game.addPlayer("Schnitzelboy");
            game.prepare();
            game.start([
                "ServerLog: 00:05.50 - CP_DMG BULLET: V8Block [r1, t1] <Weapon [1081][w1]>, (Player [3][p1], p1) damaged Schnitzelboy [r2, t1] for 10",
                "V8Block (989.5) hurt Schnitzelboy (10000.000000) and gets penalised for 10.450000"
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 989.5, 5.5)"
            )).toBe(true);
        });

        test("when getting back to 10000 karma", async () => {
            const game = new SimuGame();
            game.addPlayer("V8Block");
            game.addPlayer("Schnitzelboy");
            game.prepare();
            game.start([
                "V8Block (9989.5) hurt Schnitzelboy (10000.000000) and gets penalised for 10.450000",
                "V8Block (10000) hurt Schnitzelboy (10000.000000) and gets REWARDED for 10.450000"
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 9989.5, 0)"
            )).toBe(true);
            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 10000, 0)"
            )).toBe(true);
        })

        test("by not storing continuous 10000 karma", async () => {
            const game = new SimuGame();
            game.addPlayer("V8Block");
            game.addPlayer("Schnitzelboy")
            game.prepare();
            game.start([
                "V8Block (10000) hurt Schnitzelboy (10000) and gets REWARDED for 10.450000",
                "V8Block (9989.5) hurt Schnitzelboy (10000.000000) and gets penalised for 10.450000"
            ]);
            await game.submit();

            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 10000, 0)"
            )).toBe(false);
            expect(queries.includes(
                "INSERT INTO karma (mid, player, karma, time) VALUES (0, 'V8Block', 9989.5, 0)"
            )).toBe(true);
        });
    });

    describe("tracks survival", () => {
        test("when player survives", async () => {
            let game = new SimuGame();
            game.addPlayer("Zumoari", "Innocent", "innocents");
            await game.run();

            expect(queries.includes(
                "UPDATE participates SET survived = true WHERE mid = 0 AND player = 'Zumoari'"
            )).toBe(true);
        });

        test("when player dies", async () => {
            let game = new SimuGame();
            game.addPlayer("Zumoari", "Innocent", "innocents");
            game.prepare();
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
            game.addPlayer("Zumoari", "Innocent", "innocents");
            game.prepare();
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
});