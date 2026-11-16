"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// Free-form tags typed in the admin form, stored normalised as "tiger, wild, night".
exports.up = function (db) {
  return db.addColumn("photos", "tags", { type: "text", notNull: false });
};

exports.down = function (db) {
  return db.removeColumn("photos", "tags");
};

exports._meta = {
  version: 1,
};
