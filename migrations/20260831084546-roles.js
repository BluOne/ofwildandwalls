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
    .runSql(
      `
    CREATE TABLE roles (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `,
    )
    .then(function () {
      return db.runSql(`
      INSERT INTO roles (name, description) VALUES
        ('admin', 'Administrator with full system access'),
        ('user', 'Standard user with basic access'),
        ('editor', 'Editor with content management access')
    `);
    });
};

exports.down = function (db) {
  return db.runSql(`
    DROP TABLE roles
  `);
};

exports._meta = {
  version: 1,
};
