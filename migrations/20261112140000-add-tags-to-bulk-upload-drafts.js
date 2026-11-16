"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// The Bulk upload grid has a Tags column again.
exports.up = function (db) {
  return db.runSql(`ALTER TABLE bulk_upload_drafts ADD COLUMN tags VARCHAR(1000) NOT NULL DEFAULT '' AFTER description`);
};

exports.down = function (db) {
  return db.removeColumn("bulk_upload_drafts", "tags");
};

exports._meta = {
  version: 1,
};
