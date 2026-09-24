"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// The flow view's masonry layout (views/site/index.ejs) is now always computed at
// render time, not read from these columns — every existing row's l/t/w/h turned
// out to be machine-generated from the old fixed-cycle template rather than real
// per-photo curation, and trusting it was the cause of a recurring dead-space gap
// in the layout. Clearing them removes that stale, unused data.
exports.up = function (db) {
  return db.runSql(`
    UPDATE photos SET l = NULL, t = NULL, w = NULL, h = NULL
  `);
};

exports.down = function (db) {
  // Not reversible: the cleared values were derived, not authored, so there is
  // nothing meaningful to restore.
  return Promise.resolve();
};

exports._meta = {
  version: 1,
};
