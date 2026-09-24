"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    DROP COLUMN category,
    DROP COLUMN collection,
    DROP COLUMN camera;
  `);
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    ADD COLUMN category VARCHAR(255) NULL,
    ADD COLUMN collection VARCHAR(255) NULL,
    ADD COLUMN camera VARCHAR(255) NULL;
  `);
};

exports._meta = {
  version: 1,
};
