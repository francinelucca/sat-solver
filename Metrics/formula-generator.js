
const {getRandomNumberInRange} = require('../randomizer')

/**
 * Generates a random K-CNF SAT formula given a number of variables and clauses.
 * 
 * @param {number} varNums - Number of variables to use to generate random formula.
 * @param {number} clauseNums - Number of clauses to use to generate random formula.
 * @param {number} k  - Number of variables that should be contained in a clause.
 * @returns {number[][]} formula represented as array of clauses 
 */
function getRandomFormula(varNums, clauseNums, k = 3){
    const clauses = []

    while(clauses.length < clauseNums){
        const clause = []
        while(clause.length < k){
            const variable = getRandomNumberInRange(1, varNums +1)
            const polarity = getRandomNumberInRange(0, 2) === 0 ? 1 : -1
            if(!clause.includes(variable)) clause.push(variable * polarity)
        }
        clauses.push(clause)
    }

    return clauses
}

module.exports = getRandomFormula