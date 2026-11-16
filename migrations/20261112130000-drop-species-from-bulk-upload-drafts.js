"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// The Bulk upload grid no longer has Species / Scientific name columns.
// (photos.species / photos.scientific_name are kept.)
exports.up = function (db) {
  return db.runSql(`ALTER TABLE bulk_upload_drafts DROP COLUMN species, DROP COLUMN scientific_name`);
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE bulk_upload_drafts
      ADD COLUMN species VARCHAR(255) NOT NULL DEFAULT '' AFTER ref,
      ADD COLUMN scientific_name VARCHAR(255) NOT NULL DEFAULT '' AFTER species
  `);
};

exports._meta = {
  version: 1,
};
