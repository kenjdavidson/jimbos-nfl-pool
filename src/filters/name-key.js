/**
 * Performs some cleaning up of names, since Jimbo doesn't like to use the same name for
 * subsequent weeks, this could become problematic:
 * - Hollywood! has a ! in one spot and not in another (so we ditch it)
 * - J-Mac has a space (J- Mac) in one place
 * @param {string} name
 */
module.exports = function (name) {
  return name
    .trim()
    .toUpperCase()
    .replaceAll(/-\s/g, "-") // Replace with _
    .replaceAll(/!/g, "") // Replace with ''
    .replaceAll(/[^\w\d_-]/g, "_"); // again
};
