/**
 * Processes the `spread_pool` data type into the `spread_pool` collection.
 * 
 * @param {object} collectionsApi 
 * @returns 
 */
module.exports = function (collectionsApi) {
    const data = collectionsApi.getAll()[0].data;
    return Object.entries(data)
        .filter(([k, v]) => 'spread_pool' === v.type)
        .map(([k, v]) => ({
            ...v,
            name: k
        }));
}