SELECT player, wins.team, COUNT(wins.mid) AS amount
FROM wins
JOIN participates ON wins.mid = participates.mid
JOIN role ON participates.mainrole = role.name AND wins.team = role.team
GROUP BY player, team