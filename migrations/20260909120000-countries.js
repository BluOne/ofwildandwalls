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
      CREATE TABLE countries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        country VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE (country, city)
      )
    `)
    .then(function () {
      return db.runSql(`
        INSERT INTO countries (country, city) VALUES
          ('India', 'Udaipur'),
          ('India', 'Bandhavgarh'),
          ('India', 'Bharatpur'),
          ('India', 'Valparai'),
          ('India', 'Spiti'),
          ('USA', 'New York')
      `);
    });
};

exports.down = function (db) {
  return db.runSql(`
    DROP TABLE countries
  `);
};

exports._meta = {
  version: 1,
};
