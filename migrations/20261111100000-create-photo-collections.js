"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// Many-to-many link between photos and collections. A photo can sit in several
// collections. photos.collection_id is left in place (not dropped) so existing
// code keeps working until the app is switched over to this table.
exports.up = function (db) {
  return db
    .runSql(
      `
    CREATE TABLE photo_collections (
      photo_id INT NOT NULL,
      collection_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (photo_id, collection_id),
      KEY idx_photo_collections_collection (collection_id),
      CONSTRAINT fk_photo_collections_photo FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
      CONSTRAINT fk_photo_collections_collection FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
    )
  `,
    )
    .then(function () {
      // Carry over each photo's existing single collection.
      return db.runSql(`
      INSERT INTO photo_collections (photo_id, collection_id)
      SELECT p.id, p.collection_id
      FROM photos p
      JOIN collections c ON c.id = p.collection_id
      WHERE p.collection_id IS NOT NULL
    `);
    });
};

exports.down = function (db) {
  return db.runSql(`DROP TABLE photo_collections`);
};

exports._meta = {
  version: 1,
};
