const express = require("express");
const uuid = require("uuid").v4;

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.raw());

let tweets = [];

function getTweets({ includeReplies = false, handles }) {
  let output = tweets;

  if (!includeReplies) {
    output = output.filter((t) => {
      return !t.parentId || includeReplies;
    });
  }

  if (handles) {
    output = output.filter((t) => {
      return handles ? handles.includes(t.handle) : true;
    });
  }

  return output;
}

function getTweet({ id, includeReplies = false }) {
  const tweet = tweets.find((t) => t.id === id);

  if (includeReplies && tweet !== undefined) {
    const replies = tweets.filter((t) => t.parentId === id);
    return [tweet, ...replies];
  }

  return tweet;
}

/**
 * POST a tweet when the client POSTS to this endpoint
 */
app.post("/tweets", (req, res) => {
  const { message, handle, parentId } = req.body;

  if ([message, handle].includes(undefined)) {
    res.status(400).send({
      error: "message and handle required.",
    });
    return;
  }

  if (message.length < 2 || message.length > 280) {
    res.status(400).send({
      error: "tweet should be 2 to 280 characters.",
    });
    return;
  }

  const parent = getTweet({ id: parentId });
  if (parentId !== undefined && parent === undefined) {
    res.status(404).send({
      error: "no parent tweet with that id.",
    });
    return;
  }

  const tweet = {
    message,
    handle,
    parentId,
    createdAt: new Date(),
    updatedAt: new Date(),
    id: uuid(),
    likes: 0,
    replies: 0,
    pinned: false,
  };
  tweets.unshift(tweet);

  if (parent !== undefined) {
    parent.replies++;
  }

  res.send(tweet);
});

/**
 * GET a feed of all tweets
 */
app.get("/tweets", (req, res) => {
  const { handle: handles } = req.query;
  res.send(getTweets({ handles }));
});

/**
 * GET all tweets for a profile
 */
app.get("/profile/:handle", (req, res) => {
  const { handle } = req.params;
  res.send(getTweets({ handles: handle }));
});

/**
 * DELETE a tweet by its id
 */
app.delete("/tweets/:id", (req, res) => {
  const { id } = req.params;

  const tweet = getTweet({ id });

  if (tweet === undefined) {
    res.status(404).send({
      error: "no tweet with that id.",
    });
    return;
  }

  tweets = tweets.filter((t) => t.id !== id && t.parentId !== id);

  res.send({
    success: true,
  });
});

/**
 * GET tweet
 */
app.get("/tweets/:id", (req, res) => {
  const { id } = req.params;

  const tweet = getTweet({ id, includeReplies: true });

  if (tweet === undefined) {
    res.status(404).send({
      error: "no tweet with that id.",
    });
    return;
  }

  res.send(tweet);
});

/**
 * Add a like to a tweet using a POST request
 */
app.post("/tweets/:id/like", (req, res) => {
  const { id } = req.params;

  const tweet = tweets.find((t) => t.id === id);

  if (tweet === undefined) {
    res.status(404).send({
      error: "no tweet with that id.",
    });
    return;
  }

  tweet.likes++;

  res.send({
    success: true,
  });
});

module.exports = app;
