const fs = require('fs')
const { RandomSATSolver, TwoClauseSATSolver, OptimizedSATSolver } = require('../sat-solver')
const getRandomFormula = require('./formula-generator')
const { restartSeed } = require('../randomizer')
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')


async function runExperiment() {
    restartSeed()
    const ratioIncrement = 0.2
    const ratioMin = 3
    const ratioMax = 6
    let currRatio = ratioMin
    const NTrials = [60]
    const lines = []
    const startDate = new Date()

    lines.push(`Starting experiment, current time: ${(startDate).toTimeString()}`)

    for (const n of NTrials) {
        currRatio = ratioMin
        while (currRatio <= ratioMax) {
            const numClauses = currRatio * n
            console.log(`Running experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}, time: ${(new Date()).toTimeString()}`)
            lines.push(`Running experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}`)
            lines.push("====================================================")
            let satisCount = 0
            const runtimes = { random: [], twoClause: [], optimized: [] }
            const DPLLCount = { random: [], twoClause: [], optimized: [] }
            const Timeouts = { random: 0, twoClause: 0, optimized: 0 }
            for (let i = 0; i < 100; i++) {
                const clauses = getRandomFormula(n, numClauses)
                const random = RandomSATSolver(clauses)
                const twoClause = TwoClauseSATSolver(clauses)
                const optimized = OptimizedSATSolver(clauses)
                await Promise.allSettled([random, twoClause, optimized]).then(([randomData, twoClauseData, optimizedData]) => {
                    const { result: randomResult, iterations: randomIterations, time: randomTime } = randomData.value
                    const { result: twoClauseResult, iterations: TwoClauseIterations, time: TwoClauseTime } = twoClauseData.value
                    const { result: optimizedResult, iterations: optimizedIterations, time: optimizedTime } = optimizedData.value
                    if (optimizedResult !== 'UNSAT' && optimizedResult !== 'TIMEOUT') {
                        satisCount++
                    }
                    if (optimizedResult === 'TIMEOUT') {
                        Timeouts.optimized++
                    }
                    if (twoClauseResult === 'TIMEOUT') {
                        Timeouts.twoClause++
                    }
                    if (randomResult === 'TIMEOUT') {
                        Timeouts.random++
                    }
                    runtimes.random.push(randomTime)
                    runtimes.twoClause.push(TwoClauseTime)
                    runtimes.optimized.push(optimizedTime)

                    DPLLCount.random.push(randomIterations)
                    DPLLCount.twoClause.push(TwoClauseIterations)
                    DPLLCount.optimized.push(optimizedIterations)
                })
            }
            runtimes.random.sort(function (a, b) { return a - b })
            runtimes.twoClause.sort(function (a, b) { return a - b })
            runtimes.optimized.sort(function (a, b) { return a - b })
            DPLLCount.random.sort(function (a, b) { return a - b })
            DPLLCount.twoClause.sort(function (a, b) { return a - b })
            DPLLCount.optimized.sort(function (a, b) { return a - b })
            lines.push("SATISFIED")
            lines.push(`${satisCount}/100`)
            lines.push("====================================================")
            lines.push("RANDOM RESULTS")
            lines.push(`Median time: ${(runtimes.random[(n / 2) - 1] + runtimes.random[n / 2]) / 2}`)
            lines.push(`Median DPLL iterations: ${(DPLLCount.random[(n / 2) - 1] + DPLLCount.random[n / 2]) / 2}`)
            lines.push("====================================================")
            lines.push("TWOCLAUSE RESULTS")
            lines.push(`Median time: ${(runtimes.twoClause[(n / 2) - 1] + runtimes.twoClause[n / 2]) / 2}`)
            lines.push(`Median DPLL iterations: ${(DPLLCount.twoClause[(n / 2) - 1] + DPLLCount.twoClause[n / 2]) / 2}`)
            lines.push("====================================================")
            lines.push("OPTIMIZED RESULTS")
            lines.push(`Median time: ${(runtimes.optimized[(n / 2) - 1] + runtimes.optimized[n / 2]) / 2}`)
            lines.push(`Median DPLL iterations: ${(DPLLCount.optimized[(n / 2) - 1] + DPLLCount.optimized[n / 2]) / 2}`)
            lines.push("====================================================")
            lines.push("TIMED OUT EXPERIMENTS")
            lines.push("Random: ", Timeouts.random)
            lines.push("TwoClause: ", Timeouts.twoClause)
            lines.push("Optimized: ", Timeouts.optimized)
            lines.push("")
            lines.push("")
            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            currRatio = Math.round((currRatio + ratioIncrement) * 10) / 10
        }

        var file = fs.createWriteStream('./experiment-results.txt');
        file.on('error', function (err) { /* error handling */ });
        lines.forEach(function (v) { file.write(v + '\n'); });
        const endDate = new Date()
        file.write(`Finishing experiment, current time: ${(endDate).toTimeString()} \n`)
        file.write(`ElapsedTime: ${(endDate).getTime() - startDate.getTime()}ms`)
        file.end();
    }
}


async function runExperimentAsync() {
    restartSeed()
    const ratioIncrement = 0.2
    const ratioMin = 3
    const ratioMax = 6
    let currRatio = ratioMin
    const NTrials = [50, 80]
    const lines = {}
    const allTrialsPromises = []
    let expNumber = 0

    for (const n of NTrials) {
        currRatio = ratioMin
        const NtrialPromises = []
        while (currRatio <= ratioMax) {
            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            const numClauses = Math.round((currRatio * n) * 10) / 10
            const expKey = `${n}-${++expNumber}`
            lines[expKey] = []
            console.log(`Preparing experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}, time: ${(new Date()).toTimeString()}`)
            lines[expKey].push(`Experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}`)
            lines[expKey].push("====================================================")
            let satisCount = 100
            const runtimes = { random: [], twoClause: [], optimized: [] }
            const DPLLCount = { random: [], twoClause: [], optimized: [] }
            const randomPromises = []
            const twoClausePromises = []
            const optimizedPromises = []
            for (let i = 0; i < 100; i++) {
                const clauses = getRandomFormula(n, numClauses)
                randomPromises.push(RandomSATSolver(clauses, expKey))
                twoClausePromises.push(TwoClauseSATSolver(clauses, expKey))
                optimizedPromises.push(OptimizedSATSolver(clauses, expKey))
            }

            const allPromises = []

            allPromises.push(Promise.allSettled(randomPromises).then(results => results.forEach(randomResult => {
                const { iterations: randomIterations, time: randomTime } = randomResult.value
                runtimes.random.push(randomTime)
                DPLLCount.random.push(randomIterations)
            })))
            allPromises.push(Promise.allSettled(twoClausePromises).then(results => results.forEach(twoClauseResult => {
                const { iterations: TwoClauseIterations, time: TwoClauseTime } = twoClauseResult.value
                runtimes.twoClause.push(TwoClauseTime)
                DPLLCount.twoClause.push(TwoClauseIterations)
            })))
            allPromises.push(Promise.allSettled(optimizedPromises).then(results => results.forEach(optimizedResult => {
                const { result, iterations: optimizedIterations, time: optimizedTime } = optimizedResult.value
                runtimes.optimized.push(optimizedTime)
                DPLLCount.optimized.push(optimizedIterations)

                if (result === 'UNSAT') {
                    satisCount--
                }
            })))

            NtrialPromises.push(Promise.allSettled(allPromises).then(() => {
                runtimes.random.sort(function (a, b) { return a - b })
                runtimes.twoClause.sort(function (a, b) { return a - b })
                runtimes.optimized.sort(function (a, b) { return a - b })
                DPLLCount.random.sort(function (a, b) { return a - b })
                DPLLCount.twoClause.sort(function (a, b) { return a - b })
                DPLLCount.optimized.sort(function (a, b) { return a - b })
                lines[expKey].push("SATISFIED")
                lines[expKey].push(`${satisCount}/100`)
                lines[expKey].push("====================================================")
                lines[expKey].push("RANDOM RESULTS")
                lines[expKey].push(`Median time: ${(runtimes.random[(n / 2) - 1] + runtimes.random[n / 2]) / 2}`)
                lines[expKey].push(`Median DPLL iterations: ${(DPLLCount.random[(n / 2) - 1] + DPLLCount.random[n / 2]) / 2}`)
                lines[expKey].push("====================================================")
                lines[expKey].push("TWOCLAUSE RESULTS")
                lines[expKey].push(`Median time: ${(runtimes.twoClause[(n / 2) - 1] + runtimes.twoClause[n / 2]) / 2}`)
                lines[expKey].push(`Median DPLL iterations: ${(DPLLCount.twoClause[(n / 2) - 1] + DPLLCount.twoClause[n / 2]) / 2}`)
                lines[expKey].push("====================================================")
                lines[expKey].push("OPTIMIZED RESULTS")
                lines[expKey].push(`Median time: ${(runtimes.optimized[(n / 2) - 1] + runtimes.optimized[n / 2]) / 2}`)
                lines[expKey].push(`Median DPLL iterations: ${(DPLLCount.optimized[(n / 2) - 1] + DPLLCount.optimized[n / 2]) / 2}`)
                lines[expKey].push("====================================================")
                lines[expKey].push("")
                lines[expKey].push("")
            }))

            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            currRatio = Math.round((currRatio + ratioIncrement) * 10) / 10
        }
        allTrialsPromises.push(Promise.allSettled(NtrialPromises))
    }

    await Promise.allSettled(allTrialsPromises)

    var file = fs.createWriteStream('./experiment-results.txt');
    file.on('error', function (err) { /* error handling */ });
    Object.values(lines).forEach(setOfLines => {
        setOfLines.forEach(function (v) { file.write(v + '\n'); });
    })
    file.end();
}


async function runExperimentAsync2() {
    restartSeed()
    const ratioIncrement = 0.2
    const ratioMin = 3
    const ratioMax = 6
    let currRatio = ratioMin
    const NTrials = [60]
    const lines = {}
    let expNumber = 0
    const startDate = new Date()

    lines[0] = [`Starting experiment, current time: ${(startDate).toTimeString()}`]
    for (const n of NTrials) {
        currRatio = ratioMin
        const NtrialPromises = []
        while (currRatio <= ratioMax) {
            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            const numClauses = Math.round((currRatio * n) * 10) / 10
            const expKey = `${n}-${++expNumber}`
            lines[expKey] = []
            console.log(`Preparing experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}, time: ${(new Date()).toTimeString()}`)
            lines[expKey].push(`Experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}`)
            lines[expKey].push("====================================================")
            let satisCount = 0
            const runtimes = { random: [], twoClause: [], optimized: [] }
            const DPLLCount = { random: [], twoClause: [], optimized: [] }
            const Timeouts = { random: 0, twoClause: 0, optimized: 0 }
            const randomPromises = []
            const twoClausePromises = []
            const optimizedPromises = []
            for (let i = 0; i < 100; i++) {
                const clauses = getRandomFormula(n, numClauses)
                randomPromises.push(RandomSATSolver(clauses, expKey))
                twoClausePromises.push(TwoClauseSATSolver(clauses, expKey))
                optimizedPromises.push(OptimizedSATSolver(clauses, expKey))
            }

            const allPromises = []

            allPromises.push(Promise.allSettled(randomPromises).then(results => results.forEach(randomData => {
                const { result: randomResult, iterations: randomIterations, time: randomTime } = randomData.value
                runtimes.random.push(randomTime)
                DPLLCount.random.push(randomIterations)
                if (randomResult === 'TIMEOUT') {
                    Timeouts.random++
                }
            })))
            allPromises.push(Promise.allSettled(twoClausePromises).then(results => results.forEach(twoClauseData => {
                const { result: twoClauseResult, iterations: TwoClauseIterations, time: TwoClauseTime } = twoClauseData.value
                runtimes.twoClause.push(TwoClauseTime)
                DPLLCount.twoClause.push(TwoClauseIterations)
                if (twoClauseResult === 'TIMEOUT') {
                    Timeouts.twoClause++
                }
            })))
            allPromises.push(Promise.allSettled(optimizedPromises).then(results => results.forEach(optimizedData => {
                const { result: optimizedResult, iterations: optimizedIterations, time: optimizedTime } = optimizedData.value
                runtimes.optimized.push(optimizedTime)
                DPLLCount.optimized.push(optimizedIterations)

                if (optimizedResult !== 'UNSAT' && optimizedResult !== 'TIMEOUT') {
                    satisCount++
                }
                if (optimizedResult === 'TIMEOUT') {
                    Timeouts.optimized++
                }
            })))

            NtrialPromises.push(Promise.allSettled(allPromises).then(() => {
                runtimes.random.sort(function (a, b) { return a - b })
                runtimes.twoClause.sort(function (a, b) { return a - b })
                runtimes.optimized.sort(function (a, b) { return a - b })
                DPLLCount.random.sort(function (a, b) { return a - b })
                DPLLCount.twoClause.sort(function (a, b) { return a - b })
                DPLLCount.optimized.sort(function (a, b) { return a - b })
                lines[expKey].push("SATISFIED")
                lines[expKey].push(`${satisCount}/100`)
                lines[expKey].push("====================================================")
                lines[expKey].push("RANDOM RESULTS")
                lines[expKey].push(`Median time: ${(runtimes.random[(n / 2) - 1] + runtimes.random[n / 2]) / 2}`)
                lines[expKey].push(`Median DPLL iterations: ${(DPLLCount.random[(n / 2) - 1] + DPLLCount.random[n / 2]) / 2}`)
                lines[expKey].push("====================================================")
                lines[expKey].push("TWOCLAUSE RESULTS")
                lines[expKey].push(`Median time: ${(runtimes.twoClause[(n / 2) - 1] + runtimes.twoClause[n / 2]) / 2}`)
                lines[expKey].push(`Median DPLL iterations: ${(DPLLCount.twoClause[(n / 2) - 1] + DPLLCount.twoClause[n / 2]) / 2}`)
                lines[expKey].push("====================================================")
                lines[expKey].push("OPTIMIZED RESULTS")
                lines[expKey].push(`Median time: ${(runtimes.optimized[(n / 2) - 1] + runtimes.optimized[n / 2]) / 2}`)
                lines[expKey].push(`Median DPLL iterations: ${(DPLLCount.optimized[(n / 2) - 1] + DPLLCount.optimized[n / 2]) / 2}`)
                lines[expKey].push("====================================================")
                lines[expKey].push("TIMED OUT EXPERIMENTS")
                lines[expKey].push("Random: ", Timeouts.random)
                lines[expKey].push("TwoClause: ", Timeouts.twoClause)
                lines[expKey].push("Optimized: ", Timeouts.optimized)
                lines[expKey].push("")
                lines[expKey].push("")
            }))

            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            currRatio = Math.round((currRatio + ratioIncrement) * 10) / 10
        }
        await Promise.allSettled(NtrialPromises)
    }

    var file = fs.createWriteStream('./experiment-results.txt');
    file.on('error', function (err) { /* error handling */ });
    Object.values(lines).forEach(setOfLines => {
        setOfLines.forEach(function (v) { file.write(v + '\n'); });
    })
    const endDate = new Date()
    file.write(`Finishing experiment, current time: ${(endDate).toTimeString()} \n`)
    file.write(`ElapsedTime: ${(endDate).getTime() - startDate.getTime()}ms`)
    file.end();
}

if (isMainThread) {
    restartSeed()
    const ratioIncrement = 0.2
    const ratioMin = 3
    const ratioMax = 6
    let currRatio = ratioMin
    const NTrials = [40]
    const experiments = {}
    let expNumber = 0
    const threads = new Set()
    const startDate = new Date()

    for (const n of NTrials) {
        currRatio = ratioMin
        while (currRatio <= ratioMax) {
            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            const numClauses = Math.round((currRatio * n) * 10) / 10
            const expKey = `${n}-${++expNumber}`
            experiments[expKey] = {
                satisCount: 0,
                lines: [],
                runtimes: { random: [], twoClause: [], optimized: [] },
                DPLLCount: { random: [], twoClause: [], optimized: [] },
                timeouts: { random: 0, twoClause: 0, optimized: 0 },
                n
            }
            console.log(`Preparing experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}, time: ${(new Date()).toTimeString()}`)
            experiments[expKey].lines.push(`Experiment with ratio = ${currRatio}, N = ${n} L = ${numClauses}`)
            experiments[expKey].lines.push("====================================================")
            for (let i = 0; i < 100; i++) {
                const clauses = getRandomFormula(n, numClauses)
                threads.add(new Worker(__filename, { workerData: { clauses, expKey } }));
            }
            // I have no explanation for this other than Javascript is weird
            // and if you don't believe me https://jsisweird.com/
            // more concretely, JS doesn't do well with adding floating numbers to intergers so it thinks 
            // 3 + 0.2 + 0.2 + 0.2 = 3.600000000something, so I'm rounding to the first decimal point :) 
            currRatio = Math.round((currRatio + ratioIncrement) * 10) / 10
        }
    }

    for (let worker of threads) {
        worker.on('error', (err) => { throw err; });
        worker.on('exit', () => {
            threads.delete(worker);
            console.log(`Thread exiting, ${threads.size} running...`);
            if (threads.size === 0) {
                Object.values(experiments).forEach(val => {
                    const n = val.n
                    val.runtimes.random.sort(function(a, b){return a-b})
                    val.runtimes.twoClause.sort(function(a, b){return a-b})
                    val.runtimes.optimized.sort(function(a, b){return a-b})
                    val.DPLLCount.random.sort(function(a, b){return a-b})
                    val.DPLLCount.twoClause.sort(function(a, b){return a-b})
                    val.DPLLCount.optimized.sort(function(a, b){return a-b})
                    val.lines.push("SATISFIED")
                    val.lines.push(`${val.satisCount}/100`)
                    val.lines.push("====================================================")
                    val.lines.push("RANDOM RESULTS")
                    val.lines.push(`Median time: ${(val.runtimes.random[(n / 2) - 1] + val.runtimes.random[n / 2]) / 2}`)
                    val.lines.push(`Median DPLL iterations: ${(val.DPLLCount.random[(n / 2) - 1] + val.DPLLCount.random[n / 2]) / 2}`)
                    val.lines.push("====================================================")
                    val.lines.push("TWOCLAUSE RESULTS")
                    val.lines.push(`Median time: ${(val.runtimes.twoClause[(n / 2) - 1] + val.runtimes.twoClause[n / 2]) / 2}`)
                    val.lines.push(`Median DPLL iterations: ${(val.DPLLCount.twoClause[(n / 2) - 1] + val.DPLLCount.twoClause[n / 2]) / 2}`)
                    val.lines.push("====================================================")
                    val.lines.push("OPTIMIZED RESULTS")
                    val.lines.push(`Median time: ${(val.runtimes.optimized[(n / 2) - 1] + val.runtimes.optimized[n / 2]) / 2}`)
                    val.lines.push(`Median DPLL iterations: ${(val.DPLLCount.optimized[(n / 2) - 1] + val.DPLLCount.optimized[n / 2]) / 2}`)
                    val.lines.push("====================================================")
                    lines[expKey].push("TIMED OUT EXPERIMENTS")
                    lines[expKey].push("Random: ", val.timeouts.random)
                    lines[expKey].push("TwoClause: ", val.timeouts.twoClause)
                    lines[expKey].push("Optimized: ", val.timeouts.optimized)
                    lines[expKey].push("")
                    lines[expKey].push("")
                    val.lines.push("====================================================")
                    val.lines.push("")
                    val.lines.push("")
                })

                var file = fs.createWriteStream('./experiment-results.txt');
                file.on('error', function (err) { /* error handling */ });
                file.write(`Starting experiment, current time: ${(startDate).toTimeString()}`)
                Object.values(experiments).forEach(experiment => {
                    experiment.lines.forEach(function (v) { file.write(v + '\n'); });
                })
                const endDate = new Date()
                file.write(`Finishing experiment, current time: ${(endDate).toTimeString()} \n`)
                file.write(`ElapsedTime: ${(endDate).getTime() - startDate.getTime()}ms`)
                file.end();
                console.log(`Done!, time: ${(new Date()).toTimeString()}`)
            }
        })
        worker.on('message', (msg) => {
            const { random, twoClause, optimized } = msg.results
            const { iterations: randomIterations, time: randomTime, result: randomResult } = random
            const { iterations: twoClauseIterations, time: twoClauseTime, result: twoClauseResult } = twoClause
            const { iterations: optimizedIterations, time: optimizedTime, result: optimizedResult } = optimized
            experiments[msg.expKey].runtimes.random.push(randomTime)
            experiments[msg.expKey].DPLLCount.random.push(randomIterations)
            experiments[msg.expKey].runtimes.twoClause.push(twoClauseTime)
            experiments[msg.expKey].DPLLCount.twoClause.push(twoClauseIterations)
            experiments[msg.expKey].runtimes.optimized.push(optimizedTime)
            experiments[msg.expKey].DPLLCount.optimized.push(optimizedIterations)
            if (optimizedResult !== 'UNSAT' && optimizedResult !== 'TIMEOUT') {
                experiments[msg.expKey].satisCount++
            }
            if (optimizedResult === 'TIMEOUT') {
                experiments[msg.expKey].timeouts.optimized++
            }if (randomResult === 'TIMEOUT') {
                experiments[msg.expKey].timeouts.random++
            }if (twoClauseResult === 'TIMEOUT') {
                experiments[msg.expKey].timeouts.twoClause++
            }
        });
    }

}
else {
    const random = RandomSATSolver(workerData.clauses)
    const twoClause = TwoClauseSATSolver(workerData.clauses)
    const optimized = OptimizedSATSolver(workerData.clauses)
    Promise.allSettled([random, twoClause, optimized]).then(([random, twoClause, optimized]) => {
        parentPort.postMessage({ results: { random: random.value, twoClause: twoClause.value, optimized: optimized.value }, expKey: workerData.expKey })
    })
}


// (async () => {
//     const startDate = new Date()
//     console.log('starting... ' + startDate.toString());

//     await runExperimentAsync2();

//     const endDate = new Date()
//     console.log('done! ' + endDate.toString());
//     console.log(`elapsedTime: ${(endDate.getTime() - startDate.getTime())}ms`)
// })();