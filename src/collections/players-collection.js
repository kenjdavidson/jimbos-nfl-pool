const spreadPoolCollection = require('./spread-pools-collection');

module.exports = function(collectionsApi) {
    const spreadPools = spreadPoolCollection(collectionsApi);

    const players = spreadPools[0]
        .standings.map(s => ({ id: s.id, name: s.name, playerPicks: [] }))
        .reduce((p, c) => ({ ...p, [c.id]: c }), {});

    spreadPools.forEach(weeklyPool => {
        weeklyPool.playerPicks.forEach(playerPick => {
            players[playerPick.id].playerPicks.push({
                ...playerPick,
                week: weeklyPool.week,
                title: weeklyPool.title
            });
        });
    });
 
    return Object.values(players);
}