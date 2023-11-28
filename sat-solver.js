const fs = require('fs')
const { restartSeed } = require('./randomizer');
const { CDCLSolver } = require('./cdcl-solver');
const { RandomSATSolver, TwoClauseSATSolver, OptimizedSATSolver } = require('./dpll-solver');

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
        case 'CDCL':
            return CDCLSolver(clauses, timeout)
    }
}

module.exports = { solve }
