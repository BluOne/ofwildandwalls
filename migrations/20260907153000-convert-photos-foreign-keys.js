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
  // Map category_id directly as category_id, collection_id, camera_id, lens_id already exist from table creation
  return db.runSql(`
    UPDATE photos p
    JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(p.category))
    SET p.category_id = c.id
    WHERE p.category_id IS NULL AND p.category IS NOT NULL AND p.category != '';
  `)
    .then(function () {
      // Map collection_id
      return db.runSql(`
        UPDATE photos p
        JOIN collections col ON LOWER(TRIM(col.name)) = LOWER(TRIM(p.collection))
        SET p.collection_id = col.id
        WHERE p.collection_id IS NULL AND p.collection IS NOT NULL AND p.collection != '';
      `);
    })
    .then(function () {
      // Map camera_id by full string match or model match
      return db.runSql(`
        UPDATE photos p
        JOIN cameras cam ON (
          LOWER(TRIM(CONCAT(cam.brand, ' ', cam.model))) = LOWER(TRIM(p.camera))
          OR LOWER(TRIM(cam.model)) = LOWER(TRIM(p.camera))
        )
        SET p.camera_id = cam.id
        WHERE p.camera_id IS NULL AND p.camera IS NOT NULL AND p.camera != '';
      `);
    })
    .then(function () {
      // Map lens_id from metadata JSON key "Lens"
      return db.runSql(`
        UPDATE photos p
        JOIN lenses l ON (
          LOWER(TRIM(CONCAT(IFNULL(l.brand, ''), ' ', l.model))) = LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(p.metadata, '$[1].value'))))
          OR LOWER(TRIM(CONCAT(IFNULL(l.brand, ''), ' ', l.model))) = LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(p.metadata, '$[0].value'))))
          OR LOWER(TRIM(l.model)) = LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(p.metadata, '$[1].value'))))
          OR LOWER(TRIM(l.model)) = LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(p.metadata, '$[0].value'))))
        )
        SET p.lens_id = l.id
        WHERE p.lens_id IS NULL;
      `);
    });
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    DROP COLUMN category_id,
    DROP COLUMN collection_id,
    DROP COLUMN camera_id,
    DROP COLUMN lens_id;
  `);
};

exports._meta = {
  version: 1,
};
