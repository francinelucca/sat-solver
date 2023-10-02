const fs = require("fs");
const { solve: solveSAT } = require("./sat-solver");

/**
 * Given a result metric for a SAT problem, creates a readable format for the results
 * 
 * @param {string} name - experiment name
 * @param {{results: {string | Record<number, boolean>}, iterations: number, time: string }} results - satisfying assignments if satisfiable, 'UNSAT' otherwise, number of DPLL iterations the algorithm ran and time it took to run in miliseconds
 * 
 * @returns {string[]} - results lines that can be logged to a file
 */
function getResultLogs(name, results){
    const lines = []

    lines.push(name)
    lines.push("====================================================")
    const trueProps = Object.entries(results.result).filter(([_, value]) => value).map(([sol]) => sol)
    lines.push("")
    lines.push("Propositions assigned true: ")
    lines.push(trueProps) 
    const falseProps = Object.entries(results.result).filter(([_, value]) => !value).map(([sol]) => sol)
    lines.push("")
    lines.push("Propositions assigned false: ")
    lines.push(falseProps) 
    lines.push("")
    lines.push("Number of iterations: ", results.iterations)
    lines.push("")
    lines.push("Run time: ", results.time + 'ms')
    lines.push("")
    lines.push("")
    lines.push("")

    return lines
}

/**
 * Generates solutions for the a given DIMACS-CNF represented problem 
 * for each available SAT solver and logs results to a results.txt file
 * 
 * @param {string} filePath - Path to DIMACS file.
 * @param {string} solver - which solver(s) to use to resolve the problem
 */
 async function solve(filePath, solver = 'RANDOM'|'TWOCLAUSE'|'OPTIMIZED'|'ALL') {
    const lines = []
    switch(solver){
        case 'RANDOM':
            lines.push(...getResultLogs("RANDOM SAT SOLVER", await solveSAT(filePath, 'RANDOM', false)))
            break
        case 'TWOCLAUSE':
            lines.push(...getResultLogs("TWO CLAUSE SAT SOLVER",await solveSAT(filePath, 'TWOCLAUSE', false)))
            break
        case 'OPTIMIZED':
            lines.push(...getResultLogs("OPTIMIZED SAT SOLVER", await solveSAT(filePath, 'OPTIMIZED', false)))
            break
        case 'ALL':
            lines.push(...getResultLogs("RANDOM SAT SOLVER", await solveSAT(filePath, 'RANDOM', false)))
            lines.push(...getResultLogs("TWO CLAUSE SAT SOLVER", await solveSAT(filePath, 'TWOCLAUSE', false)))
            lines.push(...getResultLogs("OPTIMIZED SAT SOLVER", await solveSAT(filePath, 'OPTIMIZED', false)))
    }

    var file = fs.createWriteStream('./test-results.txt');
    file.on('error', function (err) { /* error handling */ });
    lines.forEach(function (v) { file.write(v + '\n'); });
    file.end();
}

// switch second parameter to one of the following to test for a single solver 
// instead of all: 'RANDOM', 'TWOCLAUSE', 'OPTIMIZED'
solve('test.txt', 'ALL')