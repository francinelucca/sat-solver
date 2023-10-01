const fs = require("fs");
const { solve: solveSAT } = require("../sat-solver");
const getEncodedProblem = require("./encoder");

/**
 * Given a result metric for the Einstein problem, creates a readable format for the results
 * 
 * @param {string} name - experiment name
 * @param {{results: {string | Record<number, boolean>}, iterations: number, time: string }} results - satisfying assignments if satisfiable, 'UNSAT' otherwise, number of DPLL iterations the algorithm ran and time it took to run in miliseconds
 * @param {Record<string, string>} variableMapper - contains the mapping between the Einstein proposition and the DIMACS variable number and vice versa (e.g.: P(1,6) is variable 1, P(2,7) is variable 27...)
 * @param {Record<string, string>} variableDictionary - contains the mapping between a varialbe number and the Einstein problem representation (e.g.: 1 maps to HOUSE_1, 30 maps to color WHITE...)
 * 
 * @returns {string[]} - results lines that can be logged to a file
 */
function getResultLogs(name, results, variableMapper, variableDictionary){
    const lines = []
    const houses =  [[], [], [], [], []]
    let decodedPropositions = ""

    lines.push(name)
    lines.push("====================================================")
    const trueProps = Object.entries(results.result).filter(([_, value]) => value).map(([sol]) => sol)
    trueProps.forEach(prop => {
        const [house, property] = variableMapper[prop]
        decodedPropositions+=`P(${house},${property}), `
        houses[house-1].push(variableDictionary[property])
    })
    lines.push("")
    lines.push("Propositions assigned true: ")
    lines.push(trueProps) 
    const falseProps = Object.entries(results.result).filter(([_, value]) => !value).map(([sol]) => sol)
    lines.push("")
    lines.push("Propositions assigned false: ")
    lines.push(falseProps) 
    lines.push("")
    lines.push("True Propositions - Decoded: ")
    lines.push(decodedPropositions.substring(0,decodedPropositions.length-2))
    lines.push("")
    lines.push("True Propisitions - Decoded interpretation: ")
    houses.forEach((house, index) => {
        lines.push(`${variableDictionary[index+1]}: ${house}`)
    })
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
 * Generates solutions for the Einstein problem for each available SAT solver and logs results to a results.txt file
 * 
 * @param {string} solver - which solver(s) to use to resolve the problem
 * 
 */
function solve(solver = 'RANDOM'|'TWOCLAUSE'|'OPTIMIZED'|'ALL') {
    console.log("Running...")
    const [encodedLines, variableMapper, variableDictionary] = getEncodedProblem()

    const lines = []
    const dimacsFilePath = './EinsteinProblem/results/DIMACS-CNF.txt'

    var file = fs.createWriteStream(dimacsFilePath);
    encodedLines.forEach(function (v) { file.write(v + '\n'); });
    file.end(() => {
        switch(solver){
            case 'RANDOM':
                lines.push(...getResultLogs("RANDOM SAT SOLVER", solveSAT(dimacsFilePath, 'RANDOM'),variableMapper, variableDictionary))
                break
            case 'TWOCLAUSE':
                lines.push(...getResultLogs("TWO CLAUSE SAT SOLVER", solveSAT(dimacsFilePath, 'TWOCLAUSE'),variableMapper, variableDictionary))
                break
            case 'OPTIMIZED':
                lines.push(...getResultLogs("OPTIMIZED SAT SOLVER", solveSAT(dimacsFilePath, 'OPTIMIZED'),variableMapper, variableDictionary))
                break
            case 'ALL':
                lines.push(...getResultLogs("RANDOM SAT SOLVER", solveSAT(dimacsFilePath, 'RANDOM'),variableMapper, variableDictionary))
                lines.push(...getResultLogs("TWO CLAUSE SAT SOLVER", solveSAT(dimacsFilePath, 'TWOCLAUSE'),variableMapper, variableDictionary))
                lines.push(...getResultLogs("OPTIMIZED SAT SOLVER", solveSAT(dimacsFilePath, 'OPTIMIZED'),variableMapper, variableDictionary))
        }
    
    
        var file = fs.createWriteStream('./EinsteinProblem/results/results.txt');
        lines.forEach(function (v) { file.write(v + '\n'); });
        file.end();
        console.log("Done!")
    });
}


// switch parameter to one of the following to test for a single solver 
// instead of all: 'RANDOM', 'TWOCLAUSE', 'OPTIMIZED'
solve('ALL')