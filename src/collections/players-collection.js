module.exports = function(collectionsApi) {
    let spreadPool = collectionsApi.getAll()[0].data.collections.spread_pool;
    
    const players = spreadPool[0]
        .standings.map(s => ({ name: s.name, nameKey: cleanNameKey(s.name), weekPicks: [] }))
        .reduce((p, c) => ({ ...p, [c.nameKey]: c }), {});

    // spreadPool.forEach(pool => {
    //     pool.playerPicks.forEach(playerPick => {
    //         const nameKey = cleanNameKey(playerPick.name);

    //     });
    // });

    return Object.values(players);
}

function cleanNameKey(name) {
    return name.toUpperCase().replaceAll(/[^\w-]/g, '_');
}