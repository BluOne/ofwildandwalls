"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// For the spreadsheet bulk upload:
//   species / scientific_name — new photo details
//   drive_file_id — the Google Drive file a photo was imported from; unique, so
//                   the same Drive file can never be imported twice
//   photo_categories — a photo can sit in several categories (like photo_collections).
//                   photos.category_id is kept, mirroring the first one, for existing readers.
exports.up = function (db) {
  return db
    .runSql(`
      ALTER TABLE photos
        ADD COLUMN species VARCHAR(255) NULL,
        ADD COLUMN scientific_name VARCHAR(255) NULL,
        ADD COLUMN drive_file_id VARCHAR(128) NULL,
        ADD UNIQUE KEY uq_photos_drive_file_id (drive_file_id)
    `)
    .then(function () {
      return db.runSql(`
        CREATE TABLE photo_categories (
          photo_id INT NOT NULL,
          category_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (photo_id, category_id),
          KEY idx_photo_categories_category (category_id),
          CONSTRAINT fk_photo_categories_photo FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
          CONSTRAINT fk_photo_categories_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        )
      `);
    })
    .then(function () {
      return db.runSql(`
        INSERT INTO photo_categories (photo_id, category_id)
        SELECT p.id, p.category_id
        FROM photos p
        JOIN categories c ON c.id = p.category_id
        WHERE p.category_id IS NOT NULL
      `);
    });
};

exports.down = function (db) {
  return db.runSql(`DROP TABLE photo_categories`).then(function () {
    return db.runSql(`
      ALTER TABLE photos
        DROP INDEX uq_photos_drive_file_id,
        DROP COLUMN drive_file_id,
        DROP COLUMN scientific_name,
        DROP COLUMN species
    `);
  });
};

exports._meta = {
  version: 1,
};
