const express = require("express");

const ticTacToe = require("./projects/ticTacToe/index.js");
const twitter = require("./projects/twitter/index.js");

const { PORT } = {
  PORT: 3000,
  ...process.env,
};

const app = express();

app.use("/tic-tac-toe", ticTacToe);
app.use("/twitter", twitter);

app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
