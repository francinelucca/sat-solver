const fs = require('fs')
const getRandomFormula = require('./formula-generator')
const { restartSeed } = require('../randomizer')
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const { CDCLSolver } = require('../cdcl-solver')
const { OptimizedSATSolver } = require('../dpll-solver')


// experiment parameters 
// ==============================
const ratioIncrement = 0.2;
const ratioMin = 1;
const ratioMax = 2;
// "n" number of variables to run experiments for, separated by commas
const NTrials = [30]
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
 * Adds error, exit and message callback functions to a given worker evaluating a CNF formula.
 * 
 * @param {worker} worker - instance of worker running CNF formula SAT algorithms.
 * @returns void
 */
function addWorkerData(worker) {
    // errors are not expected, throw if encountered
    worker.on('error', (err) => {  });
    // instantiate more workers if needed or compute final experiment data otherwise
    worker.on('exit', () => {
        threads.delete(worker);
        // add more workers if needed
        instantiateWorkers();
        console.log(`Thread exiting, ${threads.size} running...`);
        if (threads.size === 0) {
            // all experiments are finished, data needs to be aggregated
            computeMetrics()

            // write experiment results to file
            generateResultsFile()
        }
    })
    // add results to the aggregated experiment data
    worker.on('message', (msg) => {
        const { optimized, cdcl } = msg.results
        const { iterations: cdclIterations, time: cdclTime, result: cdclResult } = cdcl
        const { iterations: optimizedIterations, time: optimizedTime, result: optimizedResult } = optimized
        experiments[msg.expKey].runtimes.cdcl.push(cdclTime)
        experiments[msg.expKey].DPLLCount.cdcl.push(cdclIterations)
        experiments[msg.expKey].runtimes.optimized.push(optimizedTime)
        experiments[msg.expKey].DPLLCount.optimized.push(optimizedIterations)
        if (optimizedResult !== 'UNSAT' && optimizedResult !== 'TIMEOUT') {
            experiments[msg.expKey].satisCount++
        }
        if (optimizedResult === 'TIMEOUT') {
            experiments[msg.expKey].timeouts.optimized++
        } if (cdclResult === 'TIMEOUT') {
            experiments[msg.expKey].timeouts.cdcl++
        }
    });
}

/**
 * Creates workers to evaluate randomly generated SAT formulas 
 * as long as the worker `threads` set is not full (determined by `workerNumbers`).
 * 
 * @returns void
 */
const instantiateWorkers = () => {
    while (currNIndex < NTrials.length && threads.size < workerNumbers) {
        while (currRatio <= ratioMax && threads.size < workerNumbers) {
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
            while (curExpIndex < 100 && threads.size < workerNumbers) {
                const clauses = getRandomFormula(n, numClauses)
                const worker = new Worker(__filename, { workerData: { clauses, expKey } })
                addWorkerData(worker)
                threads.add(worker);
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
}

// program just started, set the random seed and instantiate workers
if (isMainThread) {
    restartSeed()
    instantiateWorkers()
}
// code that runs on a worker, attempts to solve a given 3-CNF formula using all three solvers, 
// posts a message with results
else {
    const cdcl = CDCLSolver(workerData.clauses)
    const optimized = OptimizedSATSolver(workerData.clauses)
    Promise.allSettled([cdcl, optimized]).then(([cdcl, optimized]) => {
        parentPort.postMessage({ results: { cdcl: cdcl.value, optimized: optimized.value }, expKey: workerData.expKey })
    })
}