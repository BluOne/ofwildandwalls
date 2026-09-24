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
  return db
    .runSql(`
      CREATE TABLE cameras (
        id INT PRIMARY KEY AUTO_INCREMENT,
        brand VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE (brand, model)
      )
    `)
    .then(function () {
      return db.runSql(`
        INSERT INTO cameras (brand, model) VALUES
          ('Sony', 'Sony α1'),
          ('Sony', 'Sony a7 IV'),
          ('Canon', 'Canon EOS R6'),
          ('Nikon', 'Nikon Z8'),
          ('Fujifilm', 'Fujifilm X-T5')
      `);
    });
};

exports.down = function (db) {
  return db.runSql(`
    DROP TABLE cameras
  `);
};

exports._meta = {
  version: 1,
};
