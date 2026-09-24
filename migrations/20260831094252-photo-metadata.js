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
    CREATE TABLE photo_metadata (
      photo_id INT PRIMARY KEY,
      location VARCHAR(255),
      captured_at TIMESTAMP,
      iso INT,
      aperture VARCHAR(50),
      shutter_speed VARCHAR(50),
      focal_length VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_photo_metadata_photo
        FOREIGN KEY (photo_id)
        REFERENCES photos(id)
    )
  `);
};

exports.down = function (db) {
  return db.runSql(`
    DROP TABLE photo_metadata
  `);
};

exports._meta = {
  version: 1,
};
