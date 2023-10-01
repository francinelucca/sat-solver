const seedrandom = require('seedrandom');

/**
 * Generates a random number in the given range 
 * including min and excluding max
 * 
 * @param {number} min - Minimum desired value.
 * @param {number} max - Maximum desired value.
 * @returns {number} The random number
 */
function getRandomNumberInRange(min, max) {
    const random = Math.random()
    return Math.floor(random * (max - min)) + min;
}

function restartSeed(){
    // replaces native math.random function with a seeded function
    // to generate reproducible random numbers
    seedrandom("my-seed-123", { global: true });
}

module.exports = { getRandomNumberInRange, restartSeed }