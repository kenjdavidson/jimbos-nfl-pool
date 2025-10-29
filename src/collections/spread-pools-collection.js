/**
 * Processes the `spread_pool` data type into the `spread_pool` collection.
 *
 * @param {object} collectionsApi
 * @returns
 */
module.exports = function (collectionsApi) {
  const data = collectionsApi.getAll()[0].data;

  // Get spread pool data from the new structure
  const spreadPoolData = data.spreadPoolData || {};

  return Object.entries(spreadPoolData)
    .filter(([k, v]) => "spread_pool" === v.type)
    .map(([k, v]) => ({
      ...v,
      name: k,
    }));
};
