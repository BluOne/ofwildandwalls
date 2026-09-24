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
      CREATE TABLE lenses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        brand VARCHAR(255),
        model VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE (brand, model)
      )
    `)
    .then(function () {
      return db.runSql(`
        INSERT INTO lenses (brand, model) VALUES
          ('Sony', 'FE 24-70mm f/2.8 GM II'),
          ('Sony', 'FE 70-200mm f/2.8 GM OSS II'),
          ('Canon', 'RF 24-70mm f/2.8L IS USM'),
          ('Nikon', 'NIKKOR Z 14-30mm f/4 S'),
          ('Fujifilm', 'XF 16-55mm f/2.8 R LM WR')
      `);
    });
};

exports.down = function (db) {
  return db.runSql(`
    DROP TABLE lenses
  `);
};

exports._meta = {
  version: 1,
};
