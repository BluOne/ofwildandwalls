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
  // Drop foreign key constraints first for created_by and updated_by
  return db.runSql(`
    ALTER TABLE photos
    DROP FOREIGN KEY fk_photos_created_by,
    DROP FOREIGN KEY fk_photos_updated_by;
  `)
    .catch(function () {
      // Ignore if foreign keys do not exist or were already dropped
      return Promise.resolve();
    })
    .then(function () {
      return db.runSql(`
        ALTER TABLE photos
        DROP COLUMN created_by,
        DROP COLUMN updated_by,
        DROP COLUMN views;
      `);
    });
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    ADD COLUMN created_by INT NULL,
    ADD COLUMN updated_by INT NULL,
    ADD COLUMN views JSON NULL;
  `);
};

exports._meta = {
  version: 1,
};
