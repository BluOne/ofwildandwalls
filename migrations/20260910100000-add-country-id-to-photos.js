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
    ADD COLUMN country_id INT NULL AFTER lens_id,
    ADD CONSTRAINT fk_photos_country
      FOREIGN KEY (country_id)
      REFERENCES countries(id)
  `);
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    DROP FOREIGN KEY fk_photos_country,
    DROP COLUMN country_id
  `);
};

exports._meta = {
  version: 1,
};
