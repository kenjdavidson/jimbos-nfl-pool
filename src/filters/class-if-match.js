module.exports = function (value, match, className) {
  if (value === undefined || match === undefined) return "";

  return value == match ? `-${className}` : `-not-${className}`;
};
