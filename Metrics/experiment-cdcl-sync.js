const fs = require('fs')
const getRandomFormula = require('./formula-generator')
const { restartSeed } = require('../randomizer')
const { CDCLSolver } = require('../cdcl-solver')
const { OptimizedSATSolver } = require('../dpll-solver')


// experiment parameters 
// ==============================
const ratioIncrement = 0.2;
const ratioMin = 1.0;
const ratioMax = 5.0;
// "n" number of variables to run experiments for, separated by commas
const NTrials = [20]
// ==============================


const experiments = {}
let expNumber = 0;
const threads = new Set()
const startDate = new Date()
// number of parellel workers to run concurrently,
// adjust according to machine's capabilities
const workerNumbers = 2;

// indexes to track the current N trial, ratio and experiment index 
// (used to instantiate workers)
let currNIndex = 0;
let curExpIndex = 0;
let currRatio = ratioMin

/**
 * Computes the median of a given array of numbers.
 * 
 * @param {number[]} arr - Number array to calculate median for.
 * @returns {number} The median 
 */
function getMedian(arr) {
    if (arr.length % 2 === 0) {
        return (arr[(arr.length / 2) - 1] + arr[arr.length / 2]) / 2
    } else {
        // arrays are 0-based
        return arr[(arr.length - 1) / 2]
    }
}

/**
 * Computes the runtime, DPLL calls, satisfiability and timeout metrics 
 * for all finished experiments available in the experiments mapper
 * and generates logs array.
 * 
 * @returns void 
 */
function computeMetrics() {
    Object.values(experiments).forEach(val => {
        val.runtimes.cdcl.sort(function (a, b) { return a - b })
        val.runtimes.optimized.sort(function (a, b) { return a - b })
        val.DPLLCount.cdcl.sort(function (a, b) { return a - b })
        val.DPLLCount.optimized.sort(function (a, b) { return a - b })
        val.lines.push("SATISFIED")
        val.lines.push(`${val.satisCount}/100`)
        val.lines.push("====================================================")
        val.lines.push("OPTIMIZED RESULTS")
        val.lines.push(`Median time: ${getMedian(val.runtimes.optimized)}`)
        val.lines.push(`Median DPLL iterations: ${getMedian(val.DPLLCount.optimized)}`)
        val.lines.push("====================================================")
        val.lines.push("CDCL RESULTS")
        val.lines.push(`Median time: ${getMedian(val.runtimes.cdcl)}`)
        val.lines.push(`Median DPLL iterations: ${getMedian(val.DPLLCount.cdcl)}`)
        val.lines.push("====================================================")
        val.lines.push("TIMED OUT EXPERIMENTS")
        val.lines.push("CDCL: ", val.timeouts.cdcl)
        val.lines.push("Optimized: ", val.timeouts.optimized)
        val.lines.push("====================================================")
        val.lines.push("")
        val.lines.push("")
    })
}

/**
 * Writes all of the experiment-generated logs to "experiment-results.txt" file.
 * 
 * @returns void 
 */
function generateResultsFile() {
    var file = fs.createWriteStream('Metrics/experiment-results.txt');
    file.on('error', function (err) { /* error handling */ });
    file.write(`Starting experiment, current time: ${(startDate).toTimeString()} \n`)
    Object.values(experiments).forEach(experiment => {
        experiment.lines.forEach(function (v) { file.write(v + '\n'); });
    })
    const endDate = new Date()
    file.write(`Finishing experiment, current time: ${(endDate).toTimeString()} \n`)
    file.write(`ElapsedTime: ${(endDate).getTime() - startDate.getTime()}ms`)
    file.end();
    console.log(`Done!, time: ${(new Date()).toTimeString()}`)
}


/**
 * Creates workers to evaluate randomly generated SAT formulas 
 * as long as the worker `threads` set is not full (determined by `workerNumbers`).
 * 
 * @returns void
 */
const instantiateWorkers = async () => {
    while (currNIndex < NTrials.length) {
        while (currRatio <= ratioMax) {
            const n = NTrials[currNIndex]
            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            const numClauses = Math.round((currRatio * n) * 10) / 10
            let expKey
            // experiment just started, initializing data
            if (curExpIndex === 0) {
                expKey = `${n}-${++expNumber}`
                experiments[expKey] = {
                    satisCount: 0,
                    lines: [],
                    runtimes: { cdcl: [], optimized: [] },
                    DPLLCount: { cdcl: [], optimized: [] },
                    timeouts: { cdcl: 0, optimized: 0 },
                    n
                }
                console.log(`Preparing experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}, time: ${(new Date()).toTimeString()}`)
                experiments[expKey].lines.push(`Experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}`)
                experiments[expKey].lines.push("====================================================")
            }
            // continuing previous experiment, no need to initialize data
            else {
                expKey = `${n}-${expNumber}`
            }
            // while there are workers available, generate a new 3-CNF formula and a worker to solve it
            while (curExpIndex < 100) {
                let clauses = getRandomFormula(n, numClauses)
                let success = false
                let cdcl
                let loopTimes = 0
                while(!success){
                    if(loopTimes > 100){
                        clauses = getRandomFormula(n, numClauses)
                        loopTimes = 0
                    }
                    loopTimes++
                    success = true
                    cdcl = await CDCLSolver(clauses).catch(err => success = false)
                }
                const optimized = await OptimizedSATSolver(clauses)
                const { iterations: cdclIterations, time: cdclTime, result: cdclResult } = cdcl
                const { iterations: optimizedIterations, time: optimizedTime, result: optimizedResult } = optimized
                experiments[expKey].runtimes.cdcl.push(cdclTime)
                experiments[expKey].DPLLCount.cdcl.push(cdclIterations)
                experiments[expKey].runtimes.optimized.push(optimizedTime)
                experiments[expKey].DPLLCount.optimized.push(optimizedIterations)
                if (optimizedResult !== 'UNSAT' && optimizedResult !== 'TIMEOUT') {
                    experiments[expKey].satisCount++
                }
                if (optimizedResult === 'TIMEOUT') {
                    experiments[expKey].timeouts.optimized++
                } if (cdclResult === 'TIMEOUT') {
                    experiments[expKey].timeouts.cdcl++
                }
                curExpIndex++;
            }
            // move on to next ratio, reset the experiment index to 0
            if (curExpIndex >= 100) {
                // I have no explanation for this other than Javascript is weird
                // and if you don't believe me https://jsisweird.com/
                // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
                // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
                currRatio = Math.round((currRatio + ratioIncrement) * 10) / 10
                curExpIndex = 0
            }
        }
        // experiment is over for the current N, move on to next one and reset the ratio
        if (currRatio > ratioMax) {
            currNIndex++
            currRatio = ratioMin
        }
    }
     // all experiments are finished, data needs to be aggregated
    computeMetrics()

    // write experiment results to file
    generateResultsFile()
}

restartSeed()
instantiateWorkers()
