SELECT
    a.player,
    a.kills,
    a.wrong,
    (a.kills - 2 * a.wrong) AS score,
    b.rounds,
    ROUND((CAST(a.kills - 2 * a.wrong AS float) / CAST(b.rounds AS float)), 2) AS killsPerGame
FROM (
    SELECT
        attacker AS player,
        COUNT(*) AS kills,
        sum(case when atkroles.team = vktroles.team then 1 else 0 end) AS wrong
    FROM
        kills
        JOIN roles AS atkroles ON atkroles.role = kills.atkrole
        JOIN roles AS vktroles ON vktroles.role = kills.vktrole
    GROUP BY attacker
    ) a
NATURAL JOIN (
    SELECT COUNT(mid) as rounds, player FROM participates GROUP BY player
) b
ORDER BY score DESC