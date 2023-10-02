const fs = require('fs')
const { getRandomNumberInRange, restartSeed } = require('./randomizer');

// number of DPLL calls to run before quitting a formula SAT solving run
const TIMEOUT_LIMIT_ITERATIONS = 150000

/**
 * Generates an array of clauses compatible with DPLL algorithm from a given filePath
 * 
 * @param {string} filePath - Path to DIMACS file.
 * @returns {number[][]} CNF clauses represented as number arrays
 */
function parseDIMACSInput(filePath) {
    const lines = fs.readFileSync(filePath).toString().split("\n");
    const clauses = []
    lines.forEach(clause => {
        if (clause.trim().length > 0 && !clause.startsWith('c') && !clause.startsWith('p')) {
            clauses.push(clause.split(" ").map(prop => Number.parseInt(prop)).slice(0, -1))
        }
    })
    return clauses
}

/**
 * Generates a solution to a SAT problem given a DIMACS file path and a prefered algorithm
 * 
 * @param {string} filePath - Path to DIMACS file.
* @returns {Promise<{results: {string | Record<number, boolean>}, iterations: number, time: string }>} results containing satisfying assignments if satisfiable, 'UNSAT' otherwise, number of DPLL iterations the algorithm ran and time it took to run in miliseconds
 */
async function solve(path, solver = 'RANDOM' | 'TWOCLAUSE' | 'OPTIMIZED', timeout = true) {
    restartSeed()

    const clauses = parseDIMACSInput(path)
    switch (solver) {
        case 'RANDOM':
            return RandomSATSolver(clauses, timeout)
        case 'TWOCLAUSE':
            return TwoClauseSATSolver(clauses, timeout)
        case 'OPTIMIZED':
            return OptimizedSATSolver(clauses, timeout)
    }
}

/**
 * Simplifies the given formula assuming that the supplied proposition is true 
 * Note that supplied proposition could be a negative value, making it false instead
 * 
 * @param {number} prop - The proposition to use for simplification
 * @param {number[][]} clauses - Set of clauses (formula) to simplify
 * @returns {number[][]} Simplified CNF clauses
 */
function simplifyByProp(prop, clauses) {
    clauses = clauses.filter(clause => !clause.includes(prop))
    // remove negation of prop since it is guaranteed to not be true
    clauses = clauses.map(clause => clause.filter(cprop => cprop !== prop * -1))
    return clauses
}

/**
 * Determines whether a CNF formula (set of clauses) is satisfiable 
 * and returns a set of assignments that satisfy the formula (if possible) using no heuristic(random) 
 * 
 * @param {number[][]} - Set of clauses (formula) to evaluate
 * @returns {Promsie<{results: {string | Record<number, boolean>}, iterations: number, time: string }>} results containing satisfying assignments if satisfiable, 'UNSAT' otherwise, number of DPLL iterations the algorithm ran and time it took to run in miliseconds
 */
async function RandomSATSolver(clauses, timeout = true) {
    const startTime = (new Date()).getTime()
    let counter = 1

    /**
     * Recursively searches for a satisfying solution for the given input formula (set of clauses) while simplyfying it
     * 
     * @param {number[][]} - Set of clauses (formula) to solve for
     * @param {assignments} - Current selected set of True/False assignments for the variables
     * @returns {string | Record<number, boolean>} Satisfying assignments if satisfiable, 'UNSAT' otherwise
     */
    async function DPLL(clauses, assignments = {}) {
        counter++
        if(timeout && counter > TIMEOUT_LIMIT_ITERATIONS){
            return 'TIMEOUT'
        }
        const localAssignments = { ...assignments }
        let localClauses = [...clauses]
        // construct assignments 
        if (Object.entries(localAssignments).length === 0) {
            localClauses.forEach(clause => {
                clause.forEach(prop => {
                    localAssignments[Math.abs(prop)] = undefined
                })
            })
        }

        // unit-preference
        const units = localClauses.filter(clause => clause.length === 1)
        units.forEach(unitClause => {
            const unit = unitClause[0]
            // the prop itself is a clause so it must be true
            localAssignments[Math.abs(unit)] = unit > 0
            localClauses = simplifyByProp(unit, localClauses)
        })

        if (localClauses.length === 0) return localAssignments

        // splitting rule
        const unassignedProps = Object.entries(localAssignments).filter(([_, assignment]) => assignment === undefined)

        // we still have unsatisfied clauses and there's no propositions left unassigned,
        // this exploration is not 'SAT'
        if (unassignedProps.length === 0) {
            return 'UNSAT'
        }

        // select one at random
        const randomIndex = getRandomNumberInRange(0, unassignedProps.length)

        // this gives us the variable number
        const prop = Number.parseInt(unassignedProps[randomIndex][0])

        const assumePositive = simplifyByProp(prop, localClauses)
        const assumeNegative = simplifyByProp(prop * -1, localClauses)

        const DPLLOnPositive = await DPLL(assumePositive, { ...localAssignments, [prop]: true })


        if (DPLLOnPositive !== 'UNSAT') {
            return DPLLOnPositive
        }
        else {
            const DPLLOnNegative = await DPLL(assumeNegative, { ...localAssignments, [prop]: false })
            return DPLLOnNegative
        }
    }


    return new Promise(async resolve => {
        const result = await DPLL(clauses)
        resolve({ result, iterations: counter, time: ((new Date).getTime() - startTime) })
    })
}


/**
 * Determines whether a CNF formula (set of clauses) is satisfiable 
 * and returns a set of assignments that satisfy the formula (if possible) using the 2-clause heuristic
 * 
 * @param {number[][]} - Set of clauses (formula) to evaluate
 * @returns {Promise<{results: {string | Record<number, boolean>}, iterations: number, time: string }>} results containing satisfying assignments if satisfiable, 'UNSAT' otherwise, number of DPLL iterations the algorithm ran and time it took to run in miliseconds
 */
async function TwoClauseSATSolver(clauses, timeout = true) {
    const startTime = (new Date()).getTime()
    let counter = 1

    /**
     * Recursively searches for a satisfying solution for the given input formula (set of clauses) while simplyfying it
     * 
     * @param {number[][]} - Set of clauses (formula) to solve for
     * @param {assignments} - Current selected set of True/False assignments for the variables
     * @returns {string | Record<number, boolean>} Satisfying assignments if satisfiable, 'UNSAT' otherwise
     */
    async function DPLL(clauses, assignments = {}) {
        counter++
        if(timeout && counter > TIMEOUT_LIMIT_ITERATIONS){
            return 'TIMEOUT'
        }
        const localAssignments = { ...assignments }
        let localClauses = [...clauses]
        // construct assignments 
        if (Object.entries(localAssignments).length === 0) {
            localClauses.forEach(clause => {
                clause.forEach(prop => {
                    localAssignments[Math.abs(prop)] = undefined
                })
            })
        }

        // unit-preference
        const units = localClauses.filter(clause => clause.length === 1)
        units.forEach(unitClause => {
            const unit = unitClause[0]
            // the prop itself is a clause so it must be true
            localAssignments[Math.abs(unit)] = unit > 0
            localClauses = simplifyByProp(unit, localClauses)
        })

        if (localClauses.length === 0) return localAssignments

        let prop
        const twoClauses = clauses.filter(clause => clause.length === 2)

        // select the proposition that most frequently occurs in clauses with length of two
        if (twoClauses.length) {
            const propFrequency = {}

            twoClauses.forEach(clause => {
                propFrequency[Math.abs(clause[0])] = (propFrequency[Math.abs(clause[0])] ?? 0) + 1
                propFrequency[Math.abs(clause[1])] = (propFrequency[Math.abs(clause[1])] ?? 0) + 1
            })

            const maxFrequencyIndex = Object.values(propFrequency).indexOf(Math.max(...Object.values(propFrequency)))

            prop = Number.parseInt(Object.keys(propFrequency)[maxFrequencyIndex])

        } else {

            // splitting rule
            const unassignedProps = Object.entries(localAssignments).filter(([_, assignment]) => assignment === undefined)

            // we still have unsatisfied clauses and there's no propositions left unassigned,
            // this exploration is not 'SAT'
            if (unassignedProps.length === 0) {
                return 'UNSAT'
            }

            // select one at random
            const randomIndex = getRandomNumberInRange(0, unassignedProps.length)

            // this gives us the variable number
            prop = Number.parseInt(unassignedProps[randomIndex][0])
        }


        const assumePositive = simplifyByProp(prop, localClauses)
        const assumeNegative = simplifyByProp(prop * -1, localClauses)

        const DPLLOnPositive = await DPLL(assumePositive, { ...localAssignments, [prop]: true })


        if (DPLLOnPositive !== 'UNSAT') {
            return DPLLOnPositive
        }
        else {
            const DPLLOnNegative = await DPLL(assumeNegative, { ...localAssignments, [prop]: false })
            return DPLLOnNegative
        }
    }

    return new Promise(async resolve => {
        const result = await DPLL(clauses)

        resolve({ result, iterations: counter, time: ((new Date).getTime() - startTime) })
    })
}

/**
 * Determines whether a CNF formula (set of clauses) is satisfiable 
 * and returns a set of assignments that satisfy the formula (if possible) 
 * using the following heuristics:
 * - picking always a prop that belongs to the "smallest" clause for the splitting rule
 * - Early termination if we encounter an empty clause (this clause is not satisfiable)
 * - Eliminating propositions that occur with only one polarity in the formula, since we can just assume truth value
 * 
 * @param {number[][]} - Set of clauses (formula) to evaluate
 * @returns {Promise<{results: {string | Record<number, boolean>}, iterations: number, time: string }>} results containing satisfying assignments if satisfiable, 'UNSAT' otherwise, number of DPLL iterations the algorithm ran and time it took to run in miliseconds
 */
async function OptimizedSATSolver(clauses, timeout = true) {
    const startTime = (new Date()).getTime()
    let counter = 1

    /**
     * Recursively searches for a satisfying solution for the given input formula (set of clauses) while simplyfying it
     * 
     * @param {number[][]} - Set of clauses (formula) to solve for
     * @param {assignments} - Current selected set of True/False assignments for the variables
     * @returns {string | Record<number, boolean>} Satisfying assignments if satisfiable, 'UNSAT' otherwise
     */
    async function DPLL(clauses, assignments = {}) {
        counter++
        if(timeout && counter > TIMEOUT_LIMIT_ITERATIONS){
            return 'TIMEOUT'
        }
        const localAssignments = { ...assignments }
        let localClauses = [...clauses]
        // construct assignments 
        if (Object.entries(localAssignments).length === 0) {
            localClauses.forEach(clause => {
                clause.forEach(prop => {
                    localAssignments[Math.abs(prop)] = undefined
                })
            })
        }

        // unit-preference
        const units = localClauses.filter(clause => clause.length === 1)
        units.forEach(unitClause => {
            const unit = unitClause[0]
            // the prop itself is a clause so it must be true
            localAssignments[Math.abs(unit)] = unit > 0
            localClauses = simplifyByProp(unit, localClauses)
        })

        if (localClauses.length === 0) return localAssignments

        // there is an "empty" clause, which means we "simplified" all possible satisfying props from it and it is not satisfiable
        if (localClauses.find(clause => clause.length === 0)) {
            return 'UNSAT'
        }

        // splitting rule
        const clauseLengths = localClauses.map(clause => clause.length)
        const smallestClauseIndex = clauseLengths.indexOf(Math.min(...clauseLengths))

        // select one at random
        const randomIndex = getRandomNumberInRange(0, localClauses[smallestClauseIndex].length)

        // this gives us the variable number
        const prop = Number.parseInt(localClauses[smallestClauseIndex][randomIndex])

        const assumePositive = simplifyByProp(prop, localClauses)
        const assumeNegative = simplifyByProp(prop * -1, localClauses)

        const DPLLOnPositive = await DPLL(assumePositive, { ...localAssignments, [Math.abs(prop)]: prop > 0 })


        if (DPLLOnPositive !== 'UNSAT') {
            return DPLLOnPositive
        }
        else {
            const DPLLOnNegative = await DPLL(assumeNegative, { ...localAssignments, [Math.abs(prop)]: prop < 0 })
            return DPLLOnNegative
        }
    }

    return new Promise(async resolve => {
        const assignments = {}

        // eliminate propositions that occur with only one polarity
        const polarities = {}
        clauses.forEach(clause => {
            clause.forEach(prop => {
                if (!polarities[prop]) {
                    polarities[prop] = true
                }
            })
        })

        Object.keys(polarities).filter(prop => !polarities[prop * -1]).forEach(singlePolarityProp => {
            assignments[Math.abs(singlePolarityProp)] = singlePolarityProp > 0
            clauses = simplifyByProp(singlePolarityProp, clauses)
        })
        
        const result = await DPLL(clauses, assignments)
    
        resolve({ result, iterations: counter, time: ((new Date).getTime() - startTime) })
    })
}

module.exports = { solve, RandomSATSolver, TwoClauseSATSolver, OptimizedSATSolver }
