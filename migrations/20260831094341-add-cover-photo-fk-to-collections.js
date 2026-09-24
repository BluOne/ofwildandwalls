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
    ALTER TABLE collections
    ADD CONSTRAINT fk_collections_cover_photo
    FOREIGN KEY (cover_photo_id)
    REFERENCES photos(id)
  `);
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE collections
    DROP FOREIGN KEY fk_collections_cover_photo
  `);
};

exports._meta = {
  version: 1,
};
