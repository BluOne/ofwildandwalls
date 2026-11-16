"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// Published / Unpublished for categories and collections. Unpublished ones are
// hidden from the public site's menus and filters. Existing ones stay published.
exports.up = function (db) {
  return db
    .runSql(`ALTER TABLE categories ADD COLUMN live TINYINT(1) NOT NULL DEFAULT 1`)
    .then(function () {
      return db.runSql(`ALTER TABLE collections ADD COLUMN live TINYINT(1) NOT NULL DEFAULT 1`);
    });
};

exports.down = function (db) {
  return db.removeColumn("categories", "live").then(function () {
    return db.removeColumn("collections", "live");
  });
};

exports._meta = {
  version: 1,
};
