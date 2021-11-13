const express = require("express");
const Fingerprint = require("express-fingerprint");
const fs = require("fs");
const path = require("path");
const stream = require("stream");
const ai = require("tictactoe-complex-ai");

const RESET_GAME_AFTER_MS = 1000 * 60 * 3; // 3 minutes

const aiInstance = ai.createAI({
  level: "expert",
  minResponseTime: 500,
  maxResponseTime: 500,
});

const app = express();

const games = {};

class TicTacToe {
  constructor() {
    this.reset();
  }

  getCell(x, y) {
    return this.data[y * 3 + x];
  }

  setCell(x, y, data) {
    this.data[y * 3 + x] = data;
  }

  resetIfExpired() {
    if (Date.now() > this.expires) {
      this.reset();
    }
  }

  resetExpirationTime() {
    this.expires = Date.now() + RESET_GAME_AFTER_MS;
  }

  getTile(x, y) {
    this.resetIfExpired();
    return this.getCell(x, y) || "empty";
  }

  async move(x, y, player = this.player) {
    this.resetExpirationTime();

    if (this.winner) {
      throw new Error("game over");
    }

    if (this.getCell(x, y)) {
      throw new Error("invalid move");
    }

    this.setCell(x, y, player);

    if (!this.checkWinner()) {
      await this.aiMove();
      this.checkWinner();
    }
  }

  async aiMove() {
    try {
      const pos = await aiInstance.play(this.data);
      this.data[pos] = this.computer;
    } catch (e) {
      console.log("err", e);
    }
  }

  checkWinner() {
    const winningCellCombinations = [
      // horizontal
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      // vertical
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      // diagnol
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const combination of winningCellCombinations) {
      const string = combination.map((index) => this.data[index]).join("");
      if (/(X{3}|O{3})/.test(string)) {
        this.winner = string[0];
        return true;
      }
    }

    return false;
  }

  getWinner() {
    return this.winner || "empty";
  }

  toString() {
    return this.data.join(" | ");
  }

  reset() {
    // No need to start the expiration
    // clock until a move has been made
    this.expires = Number.MAX_SAFE_INTEGER;
    this.winner = "";
    this.data = Array(9).fill("");
    this.player = "X";
    this.computer = "O";
    if (this.player !== "X") {
      this.aiMove();
    }
  }
}

function createGame(id) {
  const game = new TicTacToe();
  games[id] = game;
  return game;
}

function getGame(id) {
  return games[id] ?? createGame(id);
}

function noCache(_, res, next) {
  res.header("cache-control", "no-cache,max-age=0");
  next();
}

function sendAsset(res, asset) {
  const r = fs.createReadStream(path.join(__dirname, "assets", `${asset}.png`));
  const ps = new stream.PassThrough();
  stream.pipeline(r, ps, (err) => {
    if (err) {
      console.log(err);
      return res.sendStatus(400);
    }
  });
  ps.pipe(res);
}

app.use(
  Fingerprint({
    parameters: [Fingerprint.useragent, Fingerprint.geoip],
  })
);

app.use((req, res, next) => {
  const noFingerprint = req.query.noFingerprint;
  const x = parseInt(req.query.x ?? 0);
  const y = parseInt(req.query.y ?? 0);

  if ((x && isNaN(x)) || isNaN(y)) {
    res.status(400);
    res.send("invalid x or y coordinate");
    return;
  }

  req.x = x;
  req.y = y;
  req.game = noFingerprint ? getGame("player") : getGame(req.fingerprint.hash);
  next();
});

app.get("/tile", noCache, (req, res) => {
  const { x, y, game } = req;
  const tile = game.getTile(x, y);
  sendAsset(res, tile);
});

app.get("/move", async (req, res) => {
  const { x, y, game } = req;
  const { redirect } = req.query;
  try {
    await game.move(parseInt(x), parseInt(y));
  } catch (e) {}

  if (redirect) {
    res.redirect(redirect);
  } else {
    res.send("missing redirect url");
  }
});

app.get("/winner", noCache, (req, res) => {
  const { game } = req;
  const winner = game.getWinner();
  sendAsset(res, winner);
});

app.get("/restart", noCache, (req, res) => {
  const { game } = req;
  const { redirect } = req.query;
  game.reset();
  if (redirect) {
    res.redirect(redirect);
  } else {
    res.send("missing redirect url");
  }
});

module.exports = app;
