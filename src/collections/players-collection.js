const spreadPoolCollection = require("./spread-pools-collection");

module.exports = function (collectionsApi) {
  const spreadPools = spreadPoolCollection(collectionsApi);
  // Defensive: ensure we have spread pool data
  if (!Array.isArray(spreadPools) || spreadPools.length === 0) {
    console.warn("No spread pool data available for players collection");
    return [];
  }

  // Find first pool that contains standings to seed the players list
  const seedPool = spreadPools.find(
    (p) => Array.isArray(p.standings) && p.standings.length > 0
  );
  if (!seedPool) {
    console.warn(
      "No standings found in spread pools to seed players collection"
    );
    return [];
  }

  const players = seedPool.standings
    .map((s) => ({ id: s.id, name: s.name, playerPicks: [] }))
    .reduce((p, c) => ({ ...p, [c.id]: c }), {});

  console.debug(`Available players:`, players);

  spreadPools.forEach((weeklyPool) => {
    if (!Array.isArray(weeklyPool.playerPicks)) return; // skip malformed pools

    weeklyPool.playerPicks.forEach((playerPick) => {
      try {
        // Ensure a player entry exists even if they weren't in the seed standings
        if (!players[playerPick.id]) {
          players[playerPick.id] = {
            id: playerPick.id,
            name: playerPick.name || playerPick.id,
            playerPicks: [],
          };
        }

        // Safely combine pick info with game info if available
        const combined = Array.isArray(playerPick.picks)
          ? playerPick.picks.map((p, i) => ({
              ...(p || {}),
              ...(weeklyPool.games && weeklyPool.games[i]
                ? weeklyPool.games[i]
                : {}),
            }))
          : [];

        console.debug(`Processing player ${playerPick.id}`);
        players[playerPick.id].playerPicks.push({
          ...playerPick,
          year: weeklyPool.year,
          week: weeklyPool.week,
          title: weeklyPool.title,
          picks: combined,
        });
      } catch (e) {
        console.warn(
          `Skipping playerPick for ${playerPick && playerPick.id}:`,
          e.message
        );
      }
    });
  });

  // Attach the latest standing from seedPool (or update as available)
  if (Array.isArray(seedPool.standings)) {
    seedPool.standings.forEach((standing) => {
      if (!players[standing.id]) {
        players[standing.id] = {
          id: standing.id,
          name: standing.name || standing.id,
          playerPicks: [],
        };
      }
      players[standing.id].standing = standing;
    });
  }

  return Object.values(players);
};
