"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// The Bulk upload grid no longer has a Tags column.
exports.up = function (db) {
  return db.removeColumn("bulk_upload_drafts", "tags");
};

exports.down = function (db) {
  return db.addColumn("bulk_upload_drafts", "tags", { type: "string", length: 1000, notNull: true, defaultValue: "" });
};

exports._meta = {
  version: 1,
};
