
const {getRandomNumberInRange} = require('../randomizer')

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