
const DirectedGraph = require('./directed-graph');
const { getRandomNumberInRange, restartSeed } = require('./randomizer');

// number of decision calls to run before quitting a formula SAT solving run
const TIMEOUT_LIMIT_ITERATIONS = 150000

/**
 * Simplifies the given formula assuming that the supplied proposition is true 
 * Note that supplied proposition could be a negative value, making it false instead
 * 
 * @param {number} prop - The proposition to use for simplification
 * @param {number[][]} clauses - Set of clauses (formula) to simplify
 * @returns {number[][]} Simplified CNF clauses
 */
function simplifyByProp(prop, clauses) {
    clauses = clauses.filter(clause => !clause.clause.includes(prop))
    // remove negation of prop since it is guaranteed to not be true
    clauses.forEach(clause => clause.clause = clause.clause.filter(cprop => cprop !== prop * -1))
    return clauses
}

function handleConflict(trail, clause, level, lastDecision, assignments) {
    // if (level === 0) {
    //     return 'UNSAT'
    // }
    trail.addVertex("X", false, level)
    clause.originalClause.forEach(prop => {
        trail.addEdge(prop * -1, "X")
    })
    const paths = trail.getAllPaths(lastDecision, 'X')
    const freqTable = {}
    paths.forEach(path => {
        for (let i = 0; i < path.length - 1; i++) {
            freqTable[path[i]] = (freqTable[path[i]] ?? 0) + 1
        }
    })
    const inAllPaths = Object.entries(freqTable).filter(([vertex, frequency]) => frequency === paths.length).map(([vertex, frequency]) => vertex)
    const uip = inAllPaths[inAllPaths.length - 1]
    const a = []
    const b = []
    const vertices = Object.keys(trail.adjacencyList)

    vertices.forEach(v => {
        if (v !== uip) {
            if (trail.getAllPaths(uip, v).length > 0 && trail.getAllPaths(v, 'X').length > 0) {
                b.push(v)
            } else {
                a.push(v)
            }
        }
        else {
            a.push(v)
        }
    })

    const learnedClause = []

    Object.values(trail.adjacencyList).forEach(vertex => {
        if (vertex.edges.some(e => !b.includes(vertex.vertex.toString()) && b.includes(e.vertex.toString()))) {
            learnedClause.push(vertex.vertex * -1)
        }
    })

    return learnedClause

}

function backJump(trail, learnedClause, assignments, clauses, originalClauses) {
    const levels = []
    learnedClause.forEach(vertex => {
        const level = trail.adjacencyList[vertex * -1].level
        if (!levels.includes(level)) {
            levels.push(level)
        }
    })
    levels.sort()
    const baseLevel = levels.length >= 2 ? levels[levels.length - 2] : 0

    Object.keys(trail.adjacencyList).forEach(vertex => {
        if (trail.adjacencyList[vertex].level > baseLevel) {
            if (vertex !== 'X') {
                clauses.forEach(c => {
                    if (c.originalClause.includes(vertex)) {
                        c.clause.push(vertex)
                    }
                    if (c.originalClause.includes(vertex * -1)) {
                        c.clause.push(vertex * -1)
                    }
                })
                originalClauses.forEach(ogclause => {
                    if ((ogclause.originalClause.includes(Number(vertex)) || ogclause.originalClause.includes(vertex * -1)) && !clauses.some(clause => clause.originalClause.join(',') === ogclause.originalClause.join(','))) {
                        clauses.push({ ...ogclause })
                    }
                })
                assignments[Math.abs(vertex)] = undefined
            }
            trail.removeVertex(vertex)
        }
    })

    return baseLevel
}

async function CDCLSolver(clauses, timeout = true) {
    let trackedClauses = []
    clauses.forEach(clause => trackedClauses.push({ clause, originalClause: clause }))
    const trail = new DirectedGraph()
    let level = 0
    const startTime = (new Date()).getTime()
    let counter = 1

    async function makeDecision(clauses, assignments, trail, level, originalClauses) {
        counter++
        if (timeout && counter > TIMEOUT_LIMIT_ITERATIONS) {
            return 'TIMEOUT'
        }
        const unassignedProps = Object.entries(assignments).filter(([_, assignment]) => assignment === undefined)

        if (!unassignedProps.length) {
            if (clauses.length > 0) {
                return 'UNSAT'
            }
            else {
                return assignments
            }
        }

        // select one at random
        const randomIndex = getRandomNumberInRange(0, unassignedProps.length)

        // this gives us the variable number
        prop = Number.parseInt(unassignedProps[randomIndex][0])

        const polarity = getRandomNumberInRange(0, 2)

        trail.addVertex(prop * (polarity === 0 ? 1 : -1), true, ++level)
        let lastDecision = prop * (polarity === 0 ? 1 : -1)
        assignments[prop] = polarity === 0
        clauses = simplifyByProp(prop * (polarity === 0 ? 1 : -1), clauses)

        // unit-preference
        const units = clauses.filter(clause => clause.clause.length === 1)
        units.forEach(unitClause => {
            if (unitClause.clause.length !== 0) {
                const unit = unitClause.clause[0]
                if (assignments[Math.abs(unit)] !== undefined && assignments[Math.abs(unit)] !== unit > 0) {
                    unitClause.clause.pop()
                }
                else {
                    // the prop itself is a clause so it must be true
                    assignments[Math.abs(unit)] = unit > 0
                    trail.addVertex(unit, false, level)
                    unitClause.originalClause.forEach(prop => {
                        if (prop !== unit) {
                            trail.addEdge(prop * -1, unit)
                        }
                    })
                    clauses = simplifyByProp(unit, clauses, trail)
                }
            }
        })

        const clausesWithConflict = clauses.filter(clause => clause.clause.length === 0)

        if (clausesWithConflict.length > 0) {
            clausesWithConflict.forEach(clause => {
                const learnedClause = handleConflict(trail, clause, level, lastDecision, assignments)
                if(learnedClause === 'UNSAT'){
                    return 'UNSAT'
                }
                level = backJump(trail, learnedClause, assignments, clauses, originalClauses)
                clauses.push({
                    clause: learnedClause,
                    originalClause: learnedClause,
                })
                originalClauses.push({
                    clause: learnedClause,
                    originalClause: learnedClause,
                })
                clauses = unitPropagate(clauses, assignments)
            })
            return makeDecision(clauses, assignments, trail, level, originalClauses)
        }
        else {
            return makeDecision(clauses, assignments, trail, level, originalClauses)
        }
    }

    return new Promise(async (resolve, reject) => {
        const assignments = {}
        trackedClauses.forEach(clause => {
            clause.clause.forEach(prop => {
                assignments[Math.abs(prop)] = undefined
            })
        })

        // eliminate propositions that occur with only one polarity
        const polarities = {}
        trackedClauses.forEach(clause => {
            clause.clause.forEach(prop => {
                if (!polarities[prop]) {
                    polarities[prop] = true
                }
            })
        })
        Object.keys(polarities).filter(prop => !polarities[prop * -1]).forEach(singlePolarityProp => {
            assignments[Math.abs(singlePolarityProp)] = singlePolarityProp > 0
            trackedClauses = simplifyByProp(singlePolarityProp, trackedClauses)
        })

        trackedClauses = unitPropagate(trackedClauses, assignments)
        let result
        try {
            result = await makeDecision(trackedClauses, assignments, trail, level, JSON.parse(JSON.stringify(trackedClauses)))
        }
        catch(e){
            reject("here error")
        }
        
        resolve({ result, iterations: counter, time: ((new Date).getTime() - startTime) })
    })
}

function unitPropagate(clauses, assignments) {
    // unit propagation
    clauses.forEach(clause => {
        if (clause.clause.length === 1) {
            const prop = clause.clause[0]
            if (assignments[Math.abs(prop)] === undefined || assignments[Math.abs(prop)] === prop > 0) {
                assignments[Math.abs(prop)] = prop > 0
                clauses = simplifyByProp(prop, clauses)
            }
            else {
                return 'UNSAT'
            }
        }
    })
    return clauses
}

// const clauses = [[1], [-1, 2], [1, -2, 3], [-3, -4], [-3, -2]]
// const a = await CDCLSolver(clauses)
// console.log(a)

module.exports = { CDCLSolver }