const spreadPoolCollection = require("./spread-pools-collection");

module.exports = function (collectionsApi) {
  const spreadPools = spreadPoolCollection(collectionsApi);

  const players = spreadPools[0].standings
    .map((s) => ({ id: s.id, name: s.name, playerPicks: [] }))
    .reduce((p, c) => ({ ...p, [c.id]: c }), {});

  console.debug(`Available players:`, players);
  spreadPools.forEach((weeklyPool) => {
    weeklyPool.playerPicks.forEach((playerPick, i) => {
      const combined = playerPick.picks.map((p, i) => ({
        ...p,
        ...weeklyPool.games[i],
      }));
      console.debug(`Processing player ${playerPick.id}`);
      players[playerPick.id].playerPicks.push({
        ...playerPick,
        year: weeklyPool.year,
        week: weeklyPool.week,
        title: weeklyPool.title,
        picks: combined,
      });
    });
  });

  spreadPools[0].standings.forEach((standing) => {
    players[standing.id].standing = standing;
  });

  return Object.values(players);
};
