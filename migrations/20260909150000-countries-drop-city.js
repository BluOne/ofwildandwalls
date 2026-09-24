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
      DELETE FROM countries
      WHERE state IS NULL
        AND (
          (country = 'India' AND city IN ('Udaipur', 'Bandhavgarh', 'Bharatpur', 'Valparai', 'Spiti'))
          OR (country = 'USA' AND city = 'New York')
        )
    `)
    .then(function () {
      return db.runSql(`
        ALTER TABLE countries
        DROP INDEX country,
        DROP COLUMN city,
        ADD UNIQUE KEY country (country, state)
      `);
    });
};

exports.down = function (db) {
  return db
    .runSql(`
      ALTER TABLE countries
      DROP INDEX country,
      ADD COLUMN city VARCHAR(255) NULL,
      ADD UNIQUE KEY country (country, state, city)
    `)
    .then(function () {
      return db.runSql(`
        UPDATE countries SET city = '' WHERE city IS NULL
      `);
    })
    .then(function () {
      return db.runSql(`
        ALTER TABLE countries MODIFY COLUMN city VARCHAR(255) NOT NULL
      `);
    });
};

exports._meta = {
  version: 1,
};
