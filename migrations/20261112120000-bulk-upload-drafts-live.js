"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// Each Bulk upload row chooses its own Draft / Published state.
exports.up = function (db) {
  return db.runSql(`ALTER TABLE bulk_upload_drafts ADD COLUMN live TINYINT(1) NOT NULL DEFAULT 0 AFTER alt`);
};

exports.down = function (db) {
  return db.removeColumn("bulk_upload_drafts", "live");
};

exports._meta = {
  version: 1,
};
