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
    }
    board = [
        0, // Tablero Primer jugador
        0, // Tablero Segundo jugador
    ]
    turn = 1
    memo = {}
    FIRST_PLAYER = 0
    SECOND_PLAYER = 1

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
        if (this.turn == 1) {
            this.board[this.FIRST_PLAYER] |= this.movePattern[move]
        } else {
            this.board[this.SECOND_PLAYER] |= this.movePattern[move]
        }
        this.turn *=-1
    }
    
    unMakeMove(move) {
        this.turn *=-1
        if (this.turn == 1) {
            this.board[this.FIRST_PLAYER] ^= this.movePattern[move]
        } else {
            this.board[this.SECOND_PLAYER] ^= this.movePattern[move]
        }
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
        if (this.isEndGame()) {
            return -this.turn * this.turn
        } else if (this.isDraw()) {
            return 0
        }
        let keyMemo = (this.board[0] | (1 << this.size)) | this.board[1]
        keyMemo |= this.turn == 1 ? 1 << this.size + 1 : 0
        //let keyMemo = this.board[0].toString() + "-" + this.board[1].toString() + "-"+ this.turn.toString()
        let valueMemo = this.memo[keyMemo]
        if (valueMemo !== undefined) {
            return valueMemo
        }
        let moves = this.generateMoves()
        let maxScore = -1000
        for (let i=0; i < moves.length; i++) {
            this.makeMove(moves[i])
            let score = -this.negamax()
            maxScore = Math.max(maxScore, score)
            this.unMakeMove(moves[i])
            this.memo[keyMemo] = score
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
        return this.movePattern.indexOf(bestMove)
    }
    // Para contar estadísticas
    firstPlayerWinCount = 0
    secondPlayerWinCount = 0
    drawsCount = 0

    isFirstPlayerWin() {
        for (let i = 0; i < this.winPattern.length; i++) {
            if ((this.board[this.FIRST_PLAYER] & this.winPattern[i]) == this.winPattern[i]) {
                return true
            }
        }
        return false
    }
    isSecondPlayerWin() {
        for (let i = 0; i < this.winPattern.length; i++) {
            if ((this.board[this.SECOND_PLAYER] & this.winPattern[i]) == this.winPattern[i]) {
                return true
            }
        }
        return false
    }
    
    perft(depth) {
        if (this.isFirstPlayerWin()) {
            this.firstPlayerWinCount++
            return 1
        } else if (this.isSecondPlayerWin()) {
            this.secondPlayerWinCount++
            return 1
        } else if (this.isDraw()) {
            this.drawsCount++
            return 1
        }
        if (depth == 0) {
            return 1
        }
        let total = 0
        let moves = this.generateMoves()
        for (let i=0; i < moves.length; i++) {
            this.makeMove(moves[i])
            total += this.perft(depth-1)
            this.unMakeMove(moves[i])
        }
        return total
    }
}

const mnkGame = new MNKGameAI(4,4,4)

console.log(mnkGame.negamax())
