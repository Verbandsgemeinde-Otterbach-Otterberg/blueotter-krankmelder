"use client";

import React, { useState, useEffect } from 'react';

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function calculateWinner(board: ("X" | "O" | null)[]) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export default function TicTacToe() {
  const [board, setBoard] = useState<("X" | "O" | null)[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [mode, setMode] = useState<'human' | 'cpu'>('cpu');
  const aiSymbol: 'X' | 'O' = 'O';
  const humanSymbol: 'X' | 'O' = 'X';

  const winner = calculateWinner(board);
  const isFull = board.every((c) => c !== null);

  function handleClick(i: number) {
    if (winner || board[i]) return;
    const next = board.slice();
    next[i] = xIsNext ? "X" : "O";
    setBoard(next);
    setXIsNext(!xIsNext);
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  }

  // Simple AI: try to win, block, take center, take corner, else random
  function findBestMove(b: ("X" | "O" | null)[], ai: 'X' | 'O', human: 'X' | 'O') {
    // helper to check win for a symbol
    function canWin(board: ("X" | "O" | null)[], sym: 'X' | 'O') {
      for (const [a, bIdx, c] of WIN_LINES) {
        const line = [board[a], board[bIdx], board[c]];
        const count = line.filter((v) => v === sym).length;
        const emptyIdx = [a, bIdx, c].find((idx) => board[idx] === null);
        if (count === 2 && emptyIdx !== undefined) return emptyIdx;
      }
      return -1;
    }

    // Win
    const winIdx = canWin(b, ai);
    if (winIdx >= 0) return winIdx;
    // Block
    const blockIdx = canWin(b, human);
    if (blockIdx >= 0) return blockIdx;
    // Center
    if (b[4] === null) return 4;
    // Corners
    const corners = [0, 2, 6, 8].filter((i) => b[i] === null);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    // Sides
    const sides = [1, 3, 5, 7].filter((i) => b[i] === null);
    if (sides.length) return sides[Math.floor(Math.random() * sides.length)];
    return -1;
  }

  // Trigger AI move when in CPU mode and it's AI's turn
  useEffect(() => {
    if (mode !== 'cpu') return;
    const currentSymbol = xIsNext ? 'X' : 'O';
    if (currentSymbol !== aiSymbol) return; // AI plays as aiSymbol
    if (winner) return;

    const timer = setTimeout(() => {
      const idx = findBestMove(board, aiSymbol, humanSymbol);
      if (idx >= 0) {
        const next = board.slice();
        next[idx] = aiSymbol;
        setBoard(next);
        setXIsNext(!xIsNext);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [board, xIsNext, mode, winner]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Tic‑Tac‑Toe — Easter Egg</h1>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Modus:</label>
            <button onClick={() => setMode('cpu')} className={`px-3 py-1 rounded ${mode === 'cpu' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Gegen CPU</button>
            <button onClick={() => setMode('human')} className={`px-3 py-1 rounded ${mode === 'human' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Zwei Spieler</button>
          </div>
          <div className="text-sm text-gray-600">CPU spielt als <strong>{aiSymbol}</strong></div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className={`h-20 md:h-24 flex items-center justify-center text-2xl md:text-3xl font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 focus:outline-none ${
                cell === 'X' ? 'text-blue-600' : cell === 'O' ? 'text-red-600' : 'text-gray-700'
              }`}
            >
              {cell}
            </button>
          ))}
        </div>

        <div className="text-center mb-4">
          {!winner && !isFull && (
            <div className="text-gray-700">Nächster Zug: <strong>{xIsNext ? 'X' : 'O'}</strong></div>
          )}
          {winner && <div className="text-green-600 font-semibold">Gewinner: {winner}</div>}
          {!winner && isFull && <div className="text-gray-800 font-medium">Unentschieden</div>}
        </div>

        <div className="flex justify-between">
          <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Neu starten</button>
          <a href="/" className="px-4 py-2 text-blue-600 hover:underline">Zurück zur Startseite</a>
        </div>
      </div>
    </div>
  );
}
