class MNKGameAI {
    constructor(m, n, k) {
        let movePattern = []
        let winPattern = []
        let drawPattern = 0

        for (let i = 0; i < m * n; i++) {
            movePattern.push(1 << i)
            drawPattern |= 1 << i

            // Win patterns
            // Vertical patterns
            if (i + (k - 1) * m < m * n) {
                let file = 0
                for (let j = 0; j < k; j++) {
                    file |= 1 << (i + j * m)
                }
                winPattern.push(file)
            }

            // Horizontal patterns
            if (Math.floor((i + k - 1) / m) == Math.floor(i / m)) {
                let row = 0
                for (let j = 0; j < k; j++) {
                    row |= 1 << (i + j)
                }
                winPattern.push(row)
            }

            // Diagonal (bottom-right) patterns
            if ((i % m) + (k - 1) < m && i + (k - 1) * (m + 1) < m * n) {
                let diagRight = 0
                for (let j = 0; j < k; j++) {
                    diagRight |= 1 << (i + j * (m + 1))
                }
                winPattern.push(diagRight)
            }

            // Diagonal (bottom-left) patterns
            if ((i % m) - (k - 1) >= 0 && i + (k - 1) * (m - 1) < m * n) {
                let diagLeft = 0
                for (let j = 0; j < k; j++) {
                    diagLeft |= 1 << (i + j * (m - 1))
                }
                winPattern.push(diagLeft)
            }
        }

        this.movePattern = movePattern
        this.drawPattern = drawPattern
        this.winPattern = winPattern
        this.m = m
        this.n = n
        this.k = k
        this.size = m*n
        this.board = [
            0, // Tablero Primer jugador
            0, // Tablero Segundo jugador
        ]
        this.turn = 1
        this.memo = {}
        this.memoSize = 1*1024*1024/32 // 1GB
        this.FIRST_PLAYER = 0
        this.SECOND_PLAYER = 1
        this.zobristTable = this.initializeZobrist();
        this.currentHash = 0;
    }
    
    initializeZobrist() {
        let zobristTable = [];
        for (let i = 0; i < this.size; i++) {
            zobristTable.push([this.random(), this.random()]);
        }
        zobristTable.push(this.random()); // turn
        return zobristTable;
    }

    random() {
        let sign = Math.floor(Math.random()) ? 1 : -1
        return Math.floor(Math.random()*Math.pow(2,32) * sign)
    }

    generateMoves() {
        let moves = []
        let allBoard = this.board[this.FIRST_PLAYER] | this.board[this.SECOND_PLAYER]
        for (let i = 0; i < this.movePattern.length; i++) {
            if ((this.movePattern[i] & allBoard) == 0) {
                moves.push(i)
            }
        }
        return moves
    }

    makeMove(move) {
        const player = this.turn === 1 ? this.FIRST_PLAYER : this.SECOND_PLAYER
        this.board[player] |= this.movePattern[move]
        this.turn *= -1

        this.currentHash ^= this.zobristTable[move][player]
        this.currentHash ^= this.zobristTable[this.size]  
    }

    unMakeMove(move) {
        this.turn *= -1
        const player = this.turn === 1 ? this.FIRST_PLAYER : this.SECOND_PLAYER
        this.board[player] ^= this.movePattern[move]

        this.currentHash ^= this.zobristTable[move][player]
        this.currentHash ^= this.zobristTable[this.size]
    }

    isDraw() {
        if ((this.board[this.FIRST_PLAYER] | this.board[this.SECOND_PLAYER]) == this.drawPattern) {
            return true
        }
        return false
    }

    isEndGame() {
        for (let i = 0; i < this.winPattern.length; i++) {
            if ((this.board[this.FIRST_PLAYER] & this.winPattern[i]) == this.winPattern[i] ||
                (this.board[this.SECOND_PLAYER] & this.winPattern[i]) == this.winPattern[i]) {
                return true
            }
        }
        return false
    }

    negamax() {
        let hash = this.currentHash%this.memoSize
        let memoValue = this.memo[hash] 
        if (memoValue !== undefined) {
            if (memoValue.board1 == this.board[0] &&
                memoValue.board2 == this.board[1] &&
                memoValue.turn == this.turn)
            return memoValue.score
        }
        if (this.isEndGame()) {
            return -this.turn * this.turn
        } else if (this.isDraw()) {
            return 0
        }
        let moves = this.generateMoves()
        let maxScore = -1000
        for (let i=0; i < moves.length; i++) {
            this.makeMove(moves[i])
            let score = -this.negamax()
            maxScore = Math.max(maxScore, score)
            this.unMakeMove(moves[i])
        }
        this.memo[hash] = {
            board1 : this.board[0],
            board2 : this.board[1],
            turn : this.turn,
            score : maxScore
        }
        return maxScore
    }

    getBestMove() {
        let moves = this.generateMoves()
        let bestScore = -1000
        let bestMove = 0
        for (let i = 0; i < moves.length; i++) {
            this.makeMove(moves[i])
            let score = -this.negamax()
            if (score > bestScore) {
                bestScore = score
                bestMove = moves[i]
            }
            this.unMakeMove(moves[i])
        }
        return bestMove
    }

    perft(depth) {
        let hash = this.currentHash%this.memoSize
        let memoValue = this.memo[hash]
        if (memoValue !== undefined) {
            if (memoValue.board1 == this.board[0] &&
                memoValue.board2 == this.board[1] &&
                memoValue.turn == this.turn) {
                return memoValue.total
            }
        }
        if (this.isEndGame() || this.isDraw() || depth == 0) {
            return 1
        }
        let total = 0
        let moves = this.generateMoves()
        for (let i=0; i < moves.length; i++) {
            this.makeMove(moves[i])
            total += this.perft(depth-1)
            this.unMakeMove(moves[i])
        }
        this.memo[hash] = {
            board1 : this.board[0],
            board2 : this.board[1],
            turn : this.turn,
            total : total
        }
        return total
    }
}

const mnkGame = new MNKGameAI(4,3,3)

for (let i = 0; i < mnkGame.size+1; i++) {
    mnkGame.memo = {}
    let start = performance.now()
    let nodes = mnkGame.perft(i)
    let end = performance.now()
    console.log(i,nodes,end-start)
}

//let nodes = mnkGame.negamax()
//console.log(nodes)