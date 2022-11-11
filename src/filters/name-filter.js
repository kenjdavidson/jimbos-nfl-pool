/**
 * Performs some cleaning up of names, since Jimbo doesn't like to use the same name for 
 * subsequent weeks, this could become problematic.
 * @param {string} name 
 */
module.exports = function(name) {
    return name.trim()
        .toUpperCase()
        .replaceAll(/-\s/g, '-')    // J- MAC named differently in differnet spots
        .replaceAll(/[^\w\d'_-]/g, '_');
}