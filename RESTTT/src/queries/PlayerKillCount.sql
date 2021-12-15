SELECT
    a.player,
    a.kills,
    a.wrong,
    (a.kills - 2 * a.wrong) AS score,
    b.rounds,
    ROUND((CAST(a.kills - 2 * a.wrong AS float) / CAST(b.rounds AS float)), 2) AS killsPerGame
FROM (-- kills per player
    SELECT
        causee AS player,
        COUNT(*) AS kills,
        SUM(teamkill) AS wrong
    FROM dies
		WHERE causee IS NOT NULL
    GROUP BY causee
    ) a
NATURAL JOIN (-- rounds played per player
    SELECT COUNT(mid) as rounds, player FROM participates GROUP BY player
) b
ORDER BY score DESC