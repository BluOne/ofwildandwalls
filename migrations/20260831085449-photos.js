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
    CREATE TABLE photos (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      alternate_note TEXT,
      category_id INT,
      collection_id INT,
      camera_id INT,
      lens_id INT,
      status VARCHAR(50) NOT NULL DEFAULT 'published',
      created_by INT NOT NULL,
      updated_by INT,
      sort_order INT,
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_photos_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id),
      CONSTRAINT fk_photos_collection
        FOREIGN KEY (collection_id)
        REFERENCES collections(id),
      CONSTRAINT fk_photos_camera
        FOREIGN KEY (camera_id)
        REFERENCES cameras(id),
      CONSTRAINT fk_photos_lens
        FOREIGN KEY (lens_id)
        REFERENCES lenses(id),
      CONSTRAINT fk_photos_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),
      CONSTRAINT fk_photos_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
    )
  `);
};

exports.down = function (db) {
  return db.runSql(`
    DROP TABLE photos
  `);
};

exports._meta = {
  version: 1,
};
