# SAT Solver

## Prerequisites

- Must have [node](https://nodejs.org/en/download) installed
- Must have npm installed. This can be installed alongside the node installation. See https://radixweb.com/blog/installing-npm-and-nodejs-on-windows-and-mac#prerequisites
- Before attempting to run the program, run `npm install` at the root of the project

## Einstein Solver Instructions

**From the root of the project**, run in the command line terminal:

 ```
 node EinsteinProblem/solver.js
 ```

This will generate a `results.txt` file inside of `root/EinsteinProblem/results` which will contain all experiment relevant information and analysis for all three implementations, including the solution.

a `DIMACS-CNF.txt` file will be generated inside the same folder which will contain the DIMACS representation of the problem in CNF encoding.

You can find the last ran result's `results.txt` and `DIMACS-CNF.txt` files inside the `EinsteinProblem/sample-output` folder.

  - Notes: 
    - The Random SAT solver does take a bit to run (~20s, depending on machine capabilities). The console will print a "Done!" to the console when it has been finished and the `results.txt` file will be available at that point.

## Running Custom Problems

1. Scroll to the bottom of `test.js` and change the 'path-to-file' parameter with a valid filesystem path to a DIMACS .txt file.
    - Note: feel free to paste your DIMACS contents into the co-located `test.txt` file, you won't need to change the filepath in this case.
2. Run `node test.js` from the root of the project in the command line terminal.
3. This will generate a `test-results.txt` file at the top-level with analytics for all three implementations
    - Note: if you wish to run the test for only one implementation, change the second parameter of the `solve(...)` function call in `test.js` (bottom of the file) from 'ALL' to the desired solver: 'RANDOM', 'TWOCLAUSE' or 'OPTIMIZED'