
const variableDictionary = {
    1: "HOUSE_1",
    2: "HOUSE_2",
    3: "HOUSE_3",
    4: "HOUSE_4",
    5: "HOUSE_5",
    6: "BRIT",
    7: "SWEDE",
    8: "DANE",
    9: "GERMAN",
    10: "NORWEGIAN",
    11: "TEA",
    12: "MILK",
    13: "BEER",
    14: "WATER",
    15: "COFFEE",
    16: "BLENDS",
    17: "PRINCE",
    18: "DUNHILL",
    19: "PALL_MALL",
    20: "BLUEMASTERS",
    21: "DOGS",
    22: "BIRDS",
    23: "CATS",
    24: "HORSE",
    25: "FISH",
    26: "RED",
    27: "GREEN",
    28: "YELLOW",
    29: "BLUE",
    30: "WHITE"
}

/**
 * Encodes the Instein problem into DIMACS-CNF
 * 
 * @returns {string[], Record<number | string, number | string> } DIMACS-CNF compatible lines and object mapper of variable variableMapper
 */ 
function getEncodedProblem() {
    const lines = []

    const variableMapper = {}

    lines.push("c Einstein problem DIMACS file")
    lines.push("c")
    lines.push("p cnf 125 ") // number of clauses needs to be added

    // at least one N|B|S|P|C
    for (let i = 0; i < 5; i++) { //for each variable
        for (let k = 1; k <= 5; k++) { //for each house
            let line = ''
            for (let j = 5 * i + 1; j <= 5 * i + 5; j++) { // variable counter
                const varNumber = (k - 1) * 25 + j
                line += varNumber + " "

                variableMapper[varNumber] = [k, j + 5]
                variableMapper[`${k},${j + 5}`] = varNumber

            }
            line += '0'
            lines.push(line)
        }
    }

    // at most one N|B|S|P|C
    for (let i = 0; i < 5; i++) { //for each variable
        for (let k = 1; k <= 5; k++) { //for each house
            for (let j = 5 * i + 1; j <= 5 * i + 4; j++) { // left variable counter
                for (let l = j + 1; l <= 5 * i + 5; l++) { // right variable counter
                    lines.push("-" + ((k - 1) * 25 + j) + " -" + ((k - 1) * 25 + l) + " 0")
                }
            }
        }
    }

    // non-duplicates of N|B|S|P|C
    for (let i = 0; i < 5; i++) { //for each variable
        for (let j = 5 * i + 1; j <= 5 * i + 5; j++) { // variable counter
            let line = ''
            for (let k = 1; k <= 5; k++) {// for each house
                const varNumber = (k - 1) * 25 + j
                line += varNumber + " "
            }
            line += '0'
            lines.push(line)
        }
    }

    // The brit (6) lives in the red house (26)
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},6`]
        const varNumber2 = variableMapper[`${k},26`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    //	The Swede (7) keeps dogs (21) as pets
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},7`]
        const varNumber2 = variableMapper[`${k},21`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    // The Dane (8) drinks tea (11)
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},8`]
        const varNumber2 = variableMapper[`${k},11`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    // The green (27) house’s owner drinks coffee (15)
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},27`]
        const varNumber2 = variableMapper[`${k},15`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    // The person who smokes Pall Mall (19) rears birds (22)
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},19`]
        const varNumber2 = variableMapper[`${k},22`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    // The owner of the yellow (28) house smokes Dunhill (18)
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},28`]
        const varNumber2 = variableMapper[`${k},18`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    // The man living in the center house (3) drinks milk (12)
    lines.push(`${variableMapper['3,12']} 0`)

    // The Norwegian (10) lives in the first house (1)
    lines.push(`${variableMapper['1,10']} 0`)

    // The owner who smokes Bluemasters (20) drinks beer (13)
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},20`]
        const varNumber2 = variableMapper[`${k},13`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    // The German (9) smokes Prince (17)	
    for (let k = 1; k <= 5; k++) { //for each house
        const varNumber1 = variableMapper[`${k},9`]
        const varNumber2 = variableMapper[`${k},17`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }

    // The green (27) house is on the left of the white (30) house
    for (let k = 1; k <= 4; k++) { //for each house
        const varNumber1 = variableMapper[`${k},27`]
        const varNumber2 = variableMapper[`${k + 1},30`]

        lines.push(`-${varNumber1} ${varNumber2} 0`)
    }
    lines.push(`-${variableMapper[`5,27`]} 0`)

    //	The man who smokes blends (16) lives next to the one who keeps cats (23)
    lines.push(`-${variableMapper[`1,16`]} ${variableMapper[`2,23`]} 0`)
    lines.push(`-${variableMapper[`2,16`]} ${variableMapper[`1,23`]} ${variableMapper[`3,23`]} 0`)
    lines.push(`-${variableMapper[`3,16`]} ${variableMapper[`2,23`]} ${variableMapper[`4,23`]} 0`)
    lines.push(`-${variableMapper[`4,16`]} ${variableMapper[`3,23`]} ${variableMapper[`5,23`]} 0`)
    lines.push(`-${variableMapper[`5,16`]} ${variableMapper[`4,23`]} 0`)

    //	The man who keeps horses (24) lives next to the man who smokes Dunhill (18)
    lines.push(`-${variableMapper[`1,24`]} ${variableMapper[`2,18`]} 0`)
    lines.push(`-${variableMapper[`2,24`]} ${variableMapper[`1,18`]} ${variableMapper[`3,18`]} 0`)
    lines.push(`-${variableMapper[`3,24`]} ${variableMapper[`2,18`]} ${variableMapper[`4,18`]} 0`)
    lines.push(`-${variableMapper[`4,24`]} ${variableMapper[`3,18`]} ${variableMapper[`5,18`]} 0`)
    lines.push(`-${variableMapper[`5,24`]} ${variableMapper[`4,18`]} 0`)

    // The Norwegian (10) lives next to the blue house (29)
    lines.push(`-${variableMapper[`1,10`]} ${variableMapper[`2,29`]} 0`)
    lines.push(`-${variableMapper[`2,10`]} ${variableMapper[`1,29`]} ${variableMapper[`3,29`]} 0`)
    lines.push(`-${variableMapper[`3,10`]} ${variableMapper[`2,29`]} ${variableMapper[`4,29`]} 0`)
    lines.push(`-${variableMapper[`4,10`]} ${variableMapper[`3,29`]} ${variableMapper[`5,29`]} 0`)
    lines.push(`-${variableMapper[`5,10`]} ${variableMapper[`4,29`]} 0`)

    // The man who smokes Blends (16) has a neighbor who drinks water (14)
    lines.push(`-${variableMapper[`1,16`]} ${variableMapper[`2,14`]} 0`)
    lines.push(`-${variableMapper[`2,16`]} ${variableMapper[`1,14`]} ${variableMapper[`3,14`]} 0`)
    lines.push(`-${variableMapper[`3,16`]} ${variableMapper[`2,14`]} ${variableMapper[`4,14`]} 0`)
    lines.push(`-${variableMapper[`4,16`]} ${variableMapper[`3,14`]} ${variableMapper[`5,14`]} 0`)
    lines.push(`-${variableMapper[`5,16`]} ${variableMapper[`4,14`]} 0`)

    lines[2] += lines.length - 3

    return [lines, variableMapper, variableDictionary]

}

module.exports = getEncodedProblem