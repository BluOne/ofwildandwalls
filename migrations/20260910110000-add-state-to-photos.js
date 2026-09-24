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
    ADD COLUMN state VARCHAR(255) NULL AFTER country_id
  `);
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    DROP COLUMN state
  `);
};

exports._meta = {
  version: 1,
};
