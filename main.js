const express = require("express");

const ticTacToe = require("./projects/ticTacToe/index.js");

const { PORT } = {
  PORT: 3000,
  ...process.env,
};

const app = express();

app.use("/tic-tac-toe", ticTacToe);

app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
