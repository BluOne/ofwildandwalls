"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// Admin login sessions, kept in the database so a server restart doesn't log
// everyone out (see src/config/sessionStore.ts). expires is epoch milliseconds.
exports.up = function (db) {
  return db.runSql(`
    CREATE TABLE sessions (
      sid VARCHAR(128) NOT NULL PRIMARY KEY,
      data MEDIUMTEXT NOT NULL,
      expires BIGINT UNSIGNED NOT NULL,
      KEY idx_sessions_expires (expires)
    )
  `);
};

exports.down = function (db) {
  return db.runSql(`DROP TABLE sessions`);
};

exports._meta = {
  version: 1,
};
