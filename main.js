const express = require("express");
const Gun = require("gun");

const ticTacToe = require("./projects/ticTacToe/index.js");
const twitter = require("./projects/twitter/index.js");

const { PORT } = {
  PORT: 3000,
  ...process.env,
};

const app = express();

app.use(Gun.serve).use(express.static(__dirname));

app.use("/tic-tac-toe", ticTacToe);
app.use("/twitter", twitter);

const server = app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});

Gun({ file: "data.json", web: server });
