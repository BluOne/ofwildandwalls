"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/*
 * Surajpur, twice: the town near Greater Noida (Surajpur Wetland bird
 * sanctuary) in Uttar Pradesh, and the district town in Chhattisgarh.
 * Added only under states that exist; INSERT IGNORE skips one already there.
 */
var CITIES = [
  ["India", "Uttar Pradesh", "Surajpur"],
  ["India", "Chhattisgarh", "Surajpur"],
];

exports.up = function (db) {
  return CITIES.reduce(function (p, c) {
    return p.then(function () {
      return db.runSql(
        `INSERT IGNORE INTO countries (country, state, city)
         SELECT ?, ?, ? FROM DUAL
         WHERE EXISTS (SELECT 1 FROM countries s WHERE s.country = ? AND s.state = ? AND s.city IS NULL)`,
        [c[0], c[1], c[2], c[0], c[1]]
      );
    });
  }, Promise.resolve());
};

// Removes them again, moving any photo that uses one back to its state.
exports.down = function (db) {
  return CITIES.reduce(function (p, c) {
    return p
      .then(function () {
        return db.runSql(
          `UPDATE photos p
           JOIN countries ci ON ci.id = p.country_id AND ci.country = ? AND ci.state = ? AND ci.city = ?
           JOIN countries s ON s.country = ci.country AND s.state = ci.state AND s.city IS NULL
           SET p.country_id = s.id`,
          [c[0], c[1], c[2]]
        );
      })
      .then(function () {
        return db.runSql("DELETE FROM countries WHERE country = ? AND state = ? AND city = ?", c);
      });
  }, Promise.resolve());
};

exports._meta = {
  version: 1,
};
