const Busboy = require("busboy");
const fs = require("fs");
const fe = require("path");
const archiver = require('archiver');
const winston = require('winston');
const mkdirp = require('make-dir');
const m3u8Parser = require('m3u8-parser');
const vpath = require('../src/util/vpath');

exports.setup = function(mstream, program) {

  function getPathInfoOrThrow(req, pathString) {
    const pathInfo = vpath.getVPathInfo(pathString, req.user);
    if (pathInfo === false) {
      throw {code: 500, json: { error: "Could not find file" }};
    }
    return pathInfo;
  }

  function getFileType(pathString) {
    return fe.extname(pathString).substr(1);
  }

  function readPlaylistSongs(pathString) {
    const parser = new m3u8Parser.Parser();
    const fileContents = fs.readFileSync(pathString).toString();
    parser.push(fileContents);
    parser.end();
    let items = parser.manifest.segments.map(segment => { return segment.uri; });
    if (items.length === 0) {
      items = fileContents.split(/\r?\n/).filter(Boolean);
    }
    return items.map(item => { return item.replace(/\\/g, "/"); });
  }

  function handleError(error, res) {
    if (error.code && error.json) {
      res.status(error.code).json(error.json);
    }
  }

  mstream.post('/fileplaylist/download', (req, res, next) => {
    try {
      const playlistPathInfo = getPathInfoOrThrow(req, req.body.path);
      const playlistParentDir = fe.dirname(playlistPathInfo.fullPath);
      const songs = readPlaylistSongs(playlistPathInfo.fullPath);
      const archive = archiver('zip');
      archive.on('error', function (err) {
        winston.error(`Download Error: ${err.message}`);
        res.status(500).json({ error: err.message });
      });
      res.attachment(fe.basename(req.body.path) + ".zip");
      archive.pipe(res);
      for (let song of songs) {
        const songPath = fe.join(playlistParentDir, song);
        archive.file(songPath, { name: fe.basename(song) });
      }
      archive.finalize();
    } catch (error) {
      handleError(error, res);
    }
  });

  mstream.post("/fileplaylist/load", function(req, res, next) {
    try {
      const playlistPathInfo = getPathInfoOrThrow(req, req.body.path);
      const playlistParentDir = fe.dirname(req.body.path);
      const songs = readPlaylistSongs(playlistPathInfo.fullPath);
      res.json({
        contents: songs.map(function (song) {
          return { type: getFileType(song), name: fe.basename(song), path: fe.join(playlistParentDir, song).replace(/\\/g, '/') }
        })
      })
    } catch (error) {
      handleError(error, res);
    }
  });

  mstream.post("/fileplaylist/loadpaths", function(req, res, next) {
    try {
      const playlistPathInfo = getPathInfoOrThrow(req, req.body.path);
      const playlistParentDir = fe.dirname(req.body.path);
      const songs = readPlaylistSongs(playlistPathInfo.fullPath);
      res.json(songs.map(function (song) { return fe.join(playlistParentDir, song).replace(/\\/g, '/'); }));
    } catch (error) {
      handleError(error, res);
    }
  });
};
