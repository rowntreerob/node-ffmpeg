var uuid = require('node-uuid');
var express = require('express');
var path = require('path');
var logger = require('logfmt');

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var ARTICLE_URLS = [
];

module.exports = function benchmarksRouter(app, enabled, addChance, voteChance) {
  var router = new express.Router();
  if (enabled) {
  //  router.get('/benchmark.json', listArticles, benchmark);

    router.post("/ffmpeg", jsonParser, main);

    router.get('/baseline.json', baseline);
  }
  return router;

  function listArticles(req, res, next) {
    app
      .listArticles(req.user.id, 15)
      .then(attachArticles, next);

    function attachArticles(list) {
      req.articles = list;
      next();
    }
  }

  function main(req, res, next) {
    logger.log({ type: 'info', msg: 'benchmarking', branch: 'addFfmpeg ' + req.body.pic +' ' +req.body.audio});
    if (!req.body) return res.sendStatus(400);
    app
      .ffmpegArticle(req.body.pic, req.body.audio, req.body.t, req.body.mp4, req.body.mediaId)
      .then(sendLink, next);

    function sendLink(id) {
      res.json({ link: '/articles/' + id + '.json' });
    }
  }

  function baseline(req, res, next) {
    res.send('ok');
  }
};
