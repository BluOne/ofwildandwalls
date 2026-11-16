"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// The Bulk upload grid now has every Add photo field (except Tags), so its
// saved draft keeps them too. `place` is the free-text Location ("Spiti, Himachal").
exports.up = function (db) {
  return db.runSql(`
    ALTER TABLE bulk_upload_drafts
      ADD COLUMN slug VARCHAR(255) NOT NULL DEFAULT '' AFTER title,
      ADD COLUMN cap VARCHAR(255) NOT NULL DEFAULT '' AFTER slug,
      ADD COLUMN ref VARCHAR(255) NOT NULL DEFAULT '' AFTER cap,
      ADD COLUMN camera_id INT NULL AFTER collection_ids,
      ADD COLUMN lens_id INT NULL AFTER camera_id,
      ADD COLUMN date VARCHAR(20) NOT NULL DEFAULT '' AFTER lens_id,
      ADD COLUMN place VARCHAR(255) NOT NULL DEFAULT '' AFTER country_id,
      ADD COLUMN settings VARCHAR(255) NOT NULL DEFAULT '' AFTER place,
      ADD COLUMN alt VARCHAR(255) NOT NULL DEFAULT '' AFTER description,
      ADD CONSTRAINT fk_bulk_upload_drafts_camera FOREIGN KEY (camera_id) REFERENCES cameras (id) ON DELETE SET NULL,
      ADD CONSTRAINT fk_bulk_upload_drafts_lens FOREIGN KEY (lens_id) REFERENCES lenses (id) ON DELETE SET NULL
  `);
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE bulk_upload_drafts
      DROP FOREIGN KEY fk_bulk_upload_drafts_camera,
      DROP FOREIGN KEY fk_bulk_upload_drafts_lens,
      DROP COLUMN slug, DROP COLUMN cap, DROP COLUMN ref, DROP COLUMN camera_id, DROP COLUMN lens_id,
      DROP COLUMN date, DROP COLUMN place, DROP COLUMN settings, DROP COLUMN alt
  `);
};

exports._meta = {
  version: 1,
};
