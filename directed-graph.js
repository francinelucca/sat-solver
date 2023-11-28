class DirectedGraph {
    constructor() {
        this.adjacencyList = {}
    }

    // O(1)
    addVertex(vertex, isDecision, level) {
        if (!this.adjacencyList[vertex]) {
            this.adjacencyList[vertex] = {
                isDecision,
                vertex,
                level,
                edges: []
            }
            return true
        }
        return false
    }

    // O(|V| + |E|)
    removeVertex(vertex) {
        if (!this.adjacencyList[vertex]) return undefined
        Object.values(this.adjacencyList).forEach(v => {
            if(v.vertex !== vertex && v.edges.some(edge => edge.vertex === vertex)){
                v.edges = v.edges.filter(edge => edge.vertex !== vertex)
            }
        })
        delete this.adjacencyList[vertex]
        return this
    }

    // O(1)
    addEdge(vertex1, vertex2) {
        if (!this.adjacencyList[vertex1] || !this.adjacencyList[vertex2]) {
            return false
        }
        this.adjacencyList[vertex1].edges.push(this.adjacencyList[vertex2])
        return true
    }

    // O(|E|)
    removeEdge(vertex1, vertex2) {
        if (this.adjacencyList[vertex1] && this.adjacencyList[vertex2]) {
            this.adjacencyList[vertex1] = this.adjacencyList[vertex1]
                .edges.filter(v => v.vertex !== vertex2)
            return true
        }
        return false
    }

    // TODO: fix

    exploreVertex(vertex, visited = {}, preFunction = () => { }, postFunction = () => { }) {
        const edges = this.adjacencyList[vertex]

        visited[vertex] = true
        preFunction(vertex)
        edges.forEach(edgeVertex => {
            if (!visited[edgeVertex]) {
                this.exploreVertex(edgeVertex, visited, preFunction, postFunction)
            }
        })
        postFunction(vertex)

        return visited
    }

    dfsInOrder(preFunction = () => { }, postFunction = () => { }, order = Object.keys(this.adjacencyList)) {
        const visited = {}

        order.forEach(vertex => {
            if (!visited[vertex]) {
                this.exploreVertex(vertex, visited, preFunction, postFunction)
            }
        })

        return visited
    }

    bfs(start = Object.keys(this.adjacencyList)[0]){
        const queue = []
        const results = []
        const visited = {}

        queue.push(start)

        let cur
        while(queue.length){
            cur = queue.shift()
            results.push(cur)
            visited[cur]
            this.adjacencyList[cur].forEach(edgeVertex => {
                if(!visited[edgeVertex]){
                    queue.push(edgeVertex)
                }
            })
        }

        return results
    }

    findReachableVertices(vertex) {
        const visited = this.exploreVertex(vertex)

        return Object.entries(visited).filter(([value]) => !!value).map(([key]) => key)
    }

    findConnectedComponents(order = Object.keys(this.adjacencyList)) {
        const CC = []
        let currCC = null
        const preFunction = (vertex) => {
            if (currCC === null) {
                currCC = vertex; CC.push([vertex])
            }
            else {
                CC[CC.length - 1].push(vertex)
            }
        }
        const postFunction = (vertex) => { if (currCC === vertex) { currCC = null } }
        this.dfsInOrder(preFunction, postFunction, order)

        return CC
    }

    getPreAndPostOrders() {
        const orders = {}
        let count = 0
        const preVisit = (vertex) => orders[vertex] = [count++]
        const postVisit = (vertex) => orders[vertex].push(count++)
        this.dfsInOrder(preVisit, postVisit)

        return orders
    }

    isBackEdge(from, to, orders) {
        return orders[from][0] > orders[to][0] && orders[from][1] < orders[to][1]
    }

    isForwardEdge(from, to, orders) {
        return orders[from][0] < orders[to][0] && orders[from][1] > orders[to][1]
    }

    isCrossEdge(from, to, orders) {
        return !this.isBackEdge(from, to, orders) && !this.isForwardEdge(from, to, orders)
    }

    hasCycle() {
        const orders = this.getPreAndPostOrders()
        let hasCycle = false

        Object.entries(this.adjacencyList).forEach(([key, value]) => {
            if (value.some(val => this.isBackEdge(key, val, orders))) {
                hasCycle = true
            }
        })

        return hasCycle
    }

    getAllBackEdges() {
        const orders = this.getPreAndPostOrders()
        const backEdges = []

        Object.entries(this.adjacencyList).forEach(([key, value]) => {
            value.forEach(val => {
                if (this.isBackEdge(key, val, orders)) {
                    backEdges.push([key, val])
                }
            })
        })

        return backEdges
    }

    reverse() {
        const reversedGraph = new DirectedGraph()

        Object.entries(this.adjacencyList).forEach(([vertex, edges]) => {
            if (!reversedGraph.adjacencyList[vertex]) {
                reversedGraph.addVertex(vertex)
            }
            edges.forEach(edgeVertex => {
                if (!reversedGraph.adjacencyList[edgeVertex]) {
                    reversedGraph.addVertex(edgeVertex)
                }
                reversedGraph.addEdge(edgeVertex, vertex)
            })
        })

        return reversedGraph
    }

    findStronglyConnectedComponents() {
        const reversedGraph = this.reverse()

        const reverseGraphOrders = reversedGraph.getPreAndPostOrders()

        const ordersArray = []

        Object.entries(reverseGraphOrders).forEach(([vertex, orders]) => {
            ordersArray[orders[1]] = vertex
        })

        const connectedComponents = this.findConnectedComponents(ordersArray.filter(val => !!val).reverse())

        return connectedComponents
    }

    getTopologicalOrder() {
        const sorted = this.findStronglyConnectedComponents().reverse()

        const topologicalGraph = new DirectedGraph()

        const vertexMapping = {}

        sorted.forEach(set => {
            topologicalGraph.addVertex(set.join(", "))

            set.forEach(vertex => vertexMapping[vertex] = set.join(", "))
        })

        sorted.forEach(set => {
            set.forEach(vertex => {
                const edges = this.adjacencyList[vertex]

                edges.forEach(edgeVertex => {
                    if (vertexMapping[vertex] !== vertexMapping[edgeVertex] && !topologicalGraph.adjacencyList[vertexMapping[vertex]].includes(vertexMapping[edgeVertex])) {
                        topologicalGraph.addEdge(vertexMapping[vertex], vertexMapping[edgeVertex])
                    }
                })

            })
        })

        return topologicalGraph
    }

    convertToDAG() {
        const backEdges = this.getAllBackEdges()

        backEdges.forEach(([from, to]) => {
            this.removeEdge(from, to)
        })
    }

    clone() {
        const clonedGraph = new DirectedGraph()

        Object.entries(this.adjacencyList).forEach(([vertex, edges]) => {
            if (!clonedGraph.adjacencyList[vertex]) {
                clonedGraph.addVertex(vertex)
            }
            edges.forEach(edgeVertex => {
                if (!clonedGraph.adjacencyList[edgeVertex]) {
                    clonedGraph.addVertex(edgeVertex)
                }
                clonedGraph.addEdge(vertex, edgeVertex)
            })
        })
        return clonedGraph

    }

    // O(|V| + |E|)
    getPath(start, end) {

        let queue = []
        const visited = {}
        const parents = {}

        queue.push(start)

        let curVertex
        while (queue.length) {
            curVertex = queue.shift()
            visited[curVertex] = true
            this.adjacencyList[curVertex].forEach(edgeVertex => {
                if (!visited[edgeVertex]) {
                    parents[edgeVertex] = curVertex
                    if (edgeVertex == end) {
                        queue = []
                    }
                    else {
                        queue.push(edgeVertex)
                    }
                }
            })
        }

        let path = [end]
        let cur = parents[end]

        while (cur != null) {
            path.unshift(cur)
            cur = parents[cur]
        }

        if (!(path[0] === start && path[path.length - 1] === end)) {
            return null
        }

        return path
    }

    // From: https://www.geeksforgeeks.org/find-paths-given-source-destination/
    // Prints all paths from
    // 's' to 'd'
    getAllPaths(s,d)
    {
        let isVisited = new Array(Object.keys(this.adjacencyList).length);
        for(let i=0;i<Object.keys(this.adjacencyList).length;i++) {
            isVisited[i]=false;
        }
        let pathList = [];

        // add source to path[]
        pathList.push(s);

        // Call recursive utility
        return this.getAllPathsUtil(s, d, isVisited, pathList);
    }
 
    // From: https://www.geeksforgeeks.org/find-paths-given-source-destination/
    // A recursive function to print
    // all paths from 'u' to 'd'.
    // isVisited[] keeps track of
    // vertices in current path.
    // localPathList<> stores actual
    // vertices in the current path
    getAllPathsUtil(u,d,isVisited,localPathList, allPaths = [])
    {
        if (u == (d)) {
                allPaths.push(JSON.parse(JSON.stringify(localPathList)))
                return allPaths;
            }
    
            // Mark the current node
            isVisited[u] = true;
    
            // Recur for all the vertices
            // adjacent to current vertex
            for (let i=0;i< this.adjacencyList[u].edges.length;i++) {
                if (!isVisited[this.adjacencyList[u].edges[i].vertex]) {
                    // store current node
                    // in path[]
                    localPathList.push(this.adjacencyList[u].edges[i].vertex);
                    this.getAllPathsUtil(this.adjacencyList[u].edges[i].vertex, d, 
                    isVisited, localPathList, allPaths);
    
                    // remove current node
                    // in path[]
                    localPathList.splice(localPathList.indexOf
                    (this.adjacencyList[u].edges[i].vertex),1);
                }
            }
    
            // Mark the current node
            isVisited[u] = false;
            return allPaths
    }

}
module.exports = DirectedGraph