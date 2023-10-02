# SAT Solver

This repository contains 3 implementations of 3-CNF SAT solvers:
- Randomized SAT Solver
- TwoClause SAT Solver
- Optimized SAT Solver (Single polarity and early termination)

Additionally, contains CNF encoder and solver for Einstein's 5-house problem.

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

## Testing Implementations' Performance

The "Metrics" folder of this repository contains all the tools you need to generate performance metrics for the sat solvers. This process is fully automated so you only need to define a few experiment parameters and run the script.

Please follow the steps defined below:

1. Update the parameters for the experiment within lines 10-15 of Metrics/experiment.js file.
- ratioIncrement: determines how much the clause/number-of-variables ratio will be incremented by every 100 experiments.
- ratioMin: clause/number-of-variables ratio to start each N experiment with.
- ratioMax: clause/number-of-variables ratio to end each N experiment with.
- NTrials: List of number-of-variables "N"s to run experiment for, as an array. Could be a single n ([n]), or multiple ([n1, n2, n3...])
  - Keep in mind the higher the N and the more number of Ns you set here will highly impact how long the script takes to run. You won't be able to see any data until all defined experiments have finished running, this could take hours or even days.

  Note: If you wish to customize the "timeout" settings for the experiment, update the `TIMEOUT_LIMIT_ITERATIONS` value inside of the "sat-solver.js" file (line 5) at the top level of the repository. By default, solving of SAT formulas will be dismissed after 150,000 DPLL iterations.
2. Run `node Metrics/experiment.js` from the root of the project in the command line terminal.
3. This will generate a `experiment-results.txt` file at the top-level of the "Metrics" folder. This file will contain all data relating to runtime, number of iterations, satisfiability and timed out experiments for each N/ratio combination.

    Note: this is by no means an instant process, the program might take hours or even days to finish. The console will periodically output feedback and you should see a log of "Done!" when the program has finished running and the results file has been regenerated.