var logger = require('logfmt');
var Promise = require('promise');

var uuid = require('node-uuid');
var EventEmitter = require('events').EventEmitter;
var config = require('../config')
var connections = require('./connections');
//var ArticleModel = require('./article-model');
//var ReqQueue = require('./reqque');
var Q = require('q');
var httpreq = require('httpreq');
async = require("async");
var Ffmpeg = require('fluent-ffmpeg');
Ffmpeg.setFfmpegPath('./lib/app/vendor/bin/ffmpeg');

var fs = require('fs');
var read = require('read-file');
var Parse = require('node-parse-api').Parse;
//var APP_ID = '067nHFWHCzs3KbPdyM6DxIGlszj5VFLnkX6uMrc7';
//var MASTER_KEY = 'w859jfcyRiGCtt5WmFFSsSiQjL2kpcshhjdaNwTQ';
var parseApp = new Parse(config.parse_appId, config.parse_masterKey);
var mediaItemId;
var config = require('../config');

var SCRAPE_QUEUE = 'jobs.scrape';
//var VOTE_QUEUE = 'jobs.vote';

function App(config) {
  EventEmitter.call(this);

  this.config = config;
//  this.connections = connections(config.mongo_url, config.rabbit_url);
  this.connections = connections(config.rabbit_url);
  this.connections.once('ready', this.onConnected.bind(this));
  this.connections.once('lost', this.onLost.bind(this));
}

module.exports = function createApp(config) {
  return new App(config);
};

App.prototype = Object.create(EventEmitter.prototype);

App.prototype.onConnected = function() {
  var queues = 0;
//  this.Article = ArticleModel(this.connections.db, this.config.mongo_cache);

//  this.ReqQueue = ReqQueue(config);
  this.connections.queue.create(SCRAPE_QUEUE, { prefetch: 5 }, onCreate.bind(this));
  //this.connections.queue.create(VOTE_QUEUE, { prefetch: 5 }, onCreate.bind(this));
  function onCreate() {
    if (++queues === 1) this.onReady();
  }
};

App.prototype.onReady = function() {
  logger.log({ type: 'info', msg: 'app.ready' });
  this.emit('ready');
};

App.prototype.onLost = function() {
  logger.log({ type: 'info', msg: 'app.lost' });
  this.emit('lost');
};

App.prototype.addArticle = function(userId, url) {
//  var id = uuid.v1();
};

App.prototype.ffmpegArticle = function(pic, audio, t, mp4, mediaId) {
  var id = uuid.v1();
  this.connections.queue.publish(SCRAPE_QUEUE, { id: id, pic: pic, audio: audio, t: t, mp4: mp4, mediaId: mediaId});
  return Promise.resolve(id);
};

App.prototype.addUpvote = function(userId, articleId) {
//  return Promise.resolve(articleId);
};

App.prototype.startScraping = function() {
  this.connections.queue.handle(SCRAPE_QUEUE, this.getArticle.bind(this));
  return this;
};

App.prototype.upvoteArticle = function(userId, articleId) {
//  return this.Article.voteFor(userId, articleId);
};

App.prototype.purgePendingArticles = function() {
//  logger.log({ type: 'info', msg: 'app.purgePendingArticles' });
};

App.prototype.purgePendingVotes = function() {
//  logger.log({ type: 'info', msg: 'app.purgePendingVotes' });
};

App.prototype.getArticle = function(job , ack) {
  var that = this;
//  return this.Article.get(id);
//return deferred.promise;
  this.fetch( job.pic)
    .then(function(path) {
        ffinp = path;
        logger.log({ type: 'info', msg: 'job.pic complete', status: 'success', id: job.id });
        ack();
        that
          .fetch( job.audio)
          .then(function(fpath) {
              ffinp2 = fpath;
              logger.log({ type: 'info', msg: 'job.audio complete', status: 'success', id: job.id });
              that.procffmpeg( ffinp, ffinp2, job.t, job.mp4)
            .then(function(pathff) {
                that.parsinp = pathff;
                logger.log({ type: 'info', msg: 'job.ffmpeg complete', status: 'success', file: that.parsinp });
                that.parseApi(that.parsinp)
              .then(function(jsonins) {
                  that.fileRes = jsonins;
                  logger.log({ type: 'info', msg: 'job.parseApi complete', status: 'success', id: job.id });
                  that.parseMedia(that.fileRes, job.mediaId)
                .then(function(jsonmedia) {
                  that.fileRes = jsonmedia;
                  logger.log({ type: 'info', msg: 'job.parsMed3Upd complete', status: 'success', id: that.fileRes.updatedAt });
                  //TODO finish the stack
                })})})})

  }).catch(function(v){
  //  logger.log({type: 'info', msg: 'fail, job.pic '+v.message});
    logger.error(new Error(v));
    ack();
  })
 //return Promise.delay(1000).return(new Promise(function(resolve, reject) {}));
}

App.prototype.fetch = function parseFile(url) {
  var _url = url;
  var _path = "/tmp";
  var index = _url.lastIndexOf("/") + 1;
  var _fname = _url.substr(index);
  logger.log({type:'info', msg: 'GET ' +_url.substr(0,78)});

  var deferred = Q.defer();
  httpreq.download(
    _url,
      _path + '/' + _fname,
      function (err, progress){
        if(err) deferred.reject(new Error(err));
      },
      function (err, res){
          if (err) deferred.reject(new Error(err))
          deferred.resolve(res.downloadlocation);
        }
      );  // download ends
      //Promise.delay(1000);

    return deferred.promise;
}

App.prototype.procffmpeg = function ffmpegFile(infil, infil2, time, outfile) {
  var picfile = infil;
  var audfile = infil2;
  var _t = time;
  var mp4out = outfile;
  var deferred = Q.defer();
  var _pth = "/tmp";

  Ffmpeg(picfile).loop()
        .addInput(audfile)
        .fps(4)
        .duration(_t)
        .addOption('-vcodec', 'libx264')

        .addOption('-movflags', 'faststart')
        .addOption('-strict', '-2')
        .audioBitrate('44k')
        .videoBitrate('250k')
        .size('?x1080')
        .format('mp4')
        .outputOptions('-y')
        //.outputOptions('-loglevel debug')
        // outfile mp4 exists in FS
        .on('end', function(err, stdout, stderr) {
          //logger.log({type:'info', msg: 'stdout ' +stdout});
          deferred.resolve(mp4out);//should return a promise for the POST
        })
        .on('error', function(err, stdout, stderr) {
          logger.log({type:'error', msg: 'stderr' +'\n' +stderr});
        })
        // save to file
        .save(_pth + '/' +mp4out);
    return deferred.promise;
}

App.prototype.parseApi = function parseUpd(infil) {
  var postfile = infil;
  var mpth = "/tmp";
  var _buffer = read.sync(mpth + "/" +postfile);
  var deferred = Q.defer();

  parseApp.insertFile(postfile, _buffer, 'video/mp4', function (err, response) {
   // then insert a new object with the link to the new file
   var jsonObj = {"media3": {__type: 'File', "name": response.name, "url": response.url }};
   if (err) deferred.reject(new Error(err));
//   logger.log({type:'info', msg: 'parseAPI newFile mp4 OK ' });
   deferred.resolve(response);
 });
 return deferred.promise;
}
//TODO mediaItem from job
App.prototype.parseMedia = function parseMedia3Upd(parsefile, mediaItemId) {
  var postfile = parsefile;

  var deferred = Q.defer();
  var OID = mediaItemId;
//  console.log("media3oid "+OID)
   // then insert a new object with the link to the new file
   var jsonObj = {"media3": {__type: 'File', "name": postfile.name, "url": postfile.url }};
   //console.log(jsonObj);
   parseApp.update('MediaItem', OID, jsonObj, function (err, response) {
     if (err) {console.log(err)
       deferred.reject(new Error(err))}
    // log.info('parseAPI UPD ' +JSON.stringify(response));
     deferred.resolve(response);
   });
   return deferred.promise;
}

App.prototype.handleVoteJob = function(job, ack) {
//  logger.log({ type: 'info', msg: 'handling job', queue: VOTE_QUEUE, articleId: job.articleId });
};

App.prototype.stopScraping = function() {
  this.connections.queue.ignore(SCRAPE_QUEUE);
  return this;
};

App.prototype.deleteAllArticles = function() {
//  logger.log({ type: 'info', msg: 'app.deleteAllArticles' });
};
