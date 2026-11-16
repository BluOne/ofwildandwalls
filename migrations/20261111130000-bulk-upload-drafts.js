"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// The Bulk upload grid's unsaved rows, kept per admin user so they survive
// leaving the page, a failed upload, or switching browser/device.
// One table row per grid row; uploaded grid rows are removed.
exports.up = function (db) {
  return db.runSql(`
    CREATE TABLE bulk_upload_drafts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      position INT NOT NULL,
      drive_url VARCHAR(1000) NOT NULL DEFAULT '',
      title VARCHAR(255) NOT NULL DEFAULT '',
      species VARCHAR(255) NOT NULL DEFAULT '',
      scientific_name VARCHAR(255) NOT NULL DEFAULT '',
      category_id INT NULL,
      collection_ids JSON NULL,
      country_id INT NULL,
      tags VARCHAR(1000) NOT NULL DEFAULT '',
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_bulk_upload_drafts_user (user_id, position),
      CONSTRAINT fk_bulk_upload_drafts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_bulk_upload_drafts_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
      CONSTRAINT fk_bulk_upload_drafts_country FOREIGN KEY (country_id) REFERENCES countries (id) ON DELETE SET NULL
    )
  `);
};

exports.down = function (db) {
  return db.runSql(`DROP TABLE bulk_upload_drafts`);
};

exports._meta = {
  version: 1,
};
