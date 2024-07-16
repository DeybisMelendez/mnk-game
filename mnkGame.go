package main

import (
	"fmt"
	"math/rand"
	"time"
)

type MNKGameAI struct {
	movePattern   []uint64
	winPattern    []uint64
	drawPattern   uint64
	m             int
	n             int
	k             int
	size          int
	board         [2]uint64
	turn          int8
	memo          map[uint64]MemoEntry
	memoSize      uint64
	FIRST_PLAYER  int
	SECOND_PLAYER int
	zobristTable  [][]uint64
	currentHash   uint64
}

type MemoEntry struct {
	board1 uint64
	board2 uint64
	turn   int8
	score  int8
	total  uint
}

func NewMNKGameAI(m, n, k int) *MNKGameAI {
	movePattern := make([]uint64, 0)
	winPattern := make([]uint64, 0)
	var drawPattern uint64 = 0

	for i := 0; i < m*n; i++ {
		movePattern = append(movePattern, 1<<i)
		drawPattern |= 1 << i

		// Win patterns
		// Vertical patterns
		if i+(k-1)*m < m*n {
			var file uint64 = 0
			for j := 0; j < k; j++ {
				file |= 1 << (i + j*m)
			}
			winPattern = append(winPattern, file)
		}

		// Horizontal patterns
		if (i+k-1)/m == i/m {
			var row uint64 = 0
			for j := 0; j < k; j++ {
				row |= 1 << (i + j)
			}
			winPattern = append(winPattern, row)
		}

		// Diagonal (bottom-right) patterns
		if (i%m)+(k-1) < m && i+(k-1)*(m+1) < m*n {
			var diagRight uint64 = 0
			for j := 0; j < k; j++ {
				diagRight |= 1 << (i + j*(m+1))
			}
			winPattern = append(winPattern, diagRight)
		}

		// Diagonal (bottom-left) patterns
		if (i%m)-(k-1) >= 0 && i+(k-1)*(m-1) < m*n {
			var diagLeft uint64 = 0
			for j := 0; j < k; j++ {
				diagLeft |= 1 << (i + j*(m-1))
			}
			winPattern = append(winPattern, diagLeft)
		}
	}

	game := &MNKGameAI{
		movePattern:   movePattern,
		winPattern:    winPattern,
		drawPattern:   drawPattern,
		m:             m,
		n:             n,
		k:             k,
		size:          m * n,
		board:         [2]uint64{0, 0},
		turn:          1,
		memo:          make(map[uint64]MemoEntry),
		memoSize:      1 * 1024 * 1024 * 1024 / 32, // 1GB aprox
		FIRST_PLAYER:  0,
		SECOND_PLAYER: 1,
		zobristTable:  initializeZobrist(m * n),
		currentHash:   0,
	}

	return game
}

func initializeZobrist(size int) [][]uint64 {
	zobristTable := make([][]uint64, size)
	for i := 0; i < size; i++ {
		zobristTable[i] = []uint64{random64Bit(), random64Bit()}
	}
	zobristTable = append(zobristTable, []uint64{random64Bit()})
	return zobristTable
}

func random64Bit() uint64 {
	rand.Seed(time.Now().UnixNano())
	return rand.Uint64()
}

func (game *MNKGameAI) generateMoves() []uint8 {
	moves := make([]uint8, 0)
	allBoard := game.board[game.FIRST_PLAYER] | game.board[game.SECOND_PLAYER]
	for i := uint8(0); i < uint8(len(game.movePattern)); i++ {
		if (game.movePattern[i] & allBoard) == 0 {
			moves = append(moves, i)
		}
	}
	return moves
}

func (game *MNKGameAI) makeMove(move uint8) {
	player := game.FIRST_PLAYER
	if game.turn == -1 {
		player = game.SECOND_PLAYER
	}
	game.board[player] |= game.movePattern[move]
	game.turn *= -1

	game.currentHash ^= game.zobristTable[move][player]
	game.currentHash ^= game.zobristTable[game.size][0]
}

func (game *MNKGameAI) unMakeMove(move uint8) {
	game.turn *= -1
	player := game.FIRST_PLAYER
	if game.turn == -1 {
		player = game.SECOND_PLAYER
	}
	game.board[player] ^= game.movePattern[move]

	game.currentHash ^= game.zobristTable[move][player]
	game.currentHash ^= game.zobristTable[game.size][0]
}

func (game *MNKGameAI) isDraw() bool {
	return (game.board[game.FIRST_PLAYER] | game.board[game.SECOND_PLAYER]) == game.drawPattern
}

func (game *MNKGameAI) isEndGame() bool {
	for i := 0; i < len(game.winPattern); i++ {
		if (game.board[game.FIRST_PLAYER]&game.winPattern[i]) == game.winPattern[i] ||
			(game.board[game.SECOND_PLAYER]&game.winPattern[i]) == game.winPattern[i] {
			return true
		}
	}
	return false
}

func (game *MNKGameAI) negamax() int8 {
	if entry, ok := game.memo[game.currentHash%game.memoSize]; ok {
		if entry.board1 == game.board[0] && entry.board2 == game.board[1] && entry.turn == game.turn {
			return entry.score
		}
	}
	if game.isEndGame() {
		return -game.turn
	}
	if game.isDraw() {
		return 0
	}
	moves := game.generateMoves()
	var maxScore int8 = -100
	for _, move := range moves {
		game.makeMove(move)
		var score int8 = -game.negamax()
		if score > maxScore {
			maxScore = score
		}
		game.unMakeMove(move)
	}
	game.memo[game.currentHash%game.memoSize] = MemoEntry{board1: game.board[0], board2: game.board[1], turn: game.turn, score: maxScore}
	return maxScore
}

func (game *MNKGameAI) getBestMove() uint8 {
	moves := game.generateMoves()
	var bestScore int8 = -100
	var bestMove uint8 = 0
	for _, move := range moves {
		game.makeMove(move)
		var score int8 = -game.negamax()
		if score > bestScore {
			bestScore = score
			bestMove = move
		}
		game.unMakeMove(move)
	}
	return bestMove
}

func (game *MNKGameAI) perft(depth int) uint {
	if entry, ok := game.memo[game.currentHash%game.memoSize]; ok {
		if entry.board1 == game.board[0] && entry.board2 == game.board[1] && entry.turn == game.turn {
			return entry.total
		}
	}
	if game.isEndGame() || game.isDraw() || depth == 0 {
		return 1
	}
	var total uint = 0
	moves := game.generateMoves()
	for _, move := range moves {
		game.makeMove(move)
		total += game.perft(depth - 1)
		game.unMakeMove(move)
	}
	game.memo[game.currentHash%game.memoSize] = MemoEntry{board1: game.board[0], board2: game.board[1], turn: game.turn, total: total}
	return total
}

func main() {
	mnkGame := NewMNKGameAI(4, 3, 3)
	for i := 0; i < mnkGame.size; i++ {
		mnkGame.memo = make(map[uint64]MemoEntry)
		start := time.Now()
		nodes := mnkGame.perft(i)
		end := time.Now()
		fmt.Printf("%d %d %v\n", i, nodes, end.Sub(start))
	}
}
