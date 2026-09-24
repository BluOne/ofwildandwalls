"use strict";

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    DROP COLUMN alternate_note
  `);
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    ADD COLUMN alternate_note TEXT
  `);
};

exports._meta = {
  version: 1,
};
