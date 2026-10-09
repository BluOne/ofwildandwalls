"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// Resized WebP copies of each photo (see src/utils/imageVariants.ts):
//   variant_base   — S3 key prefix; copies live at `${variant_base}-<width>.webp`
//   variant_widths — comma list of the widths actually generated, e.g. "480,960,1600"
//   img_width/img_height — the original's pixel size (lets Flow size tiles before load)
//   img_color      — dominant colour, shown as a placeholder while the image loads
exports.up = function (db) {
  return db
    .addColumn("photos", "variant_base", { type: "string", length: 500, notNull: false })
    .then(function () {
      return db.addColumn("photos", "variant_widths", { type: "string", length: 100, notNull: false });
    })
    .then(function () {
      return db.addColumn("photos", "img_width", { type: "int", notNull: false });
    })
    .then(function () {
      return db.addColumn("photos", "img_height", { type: "int", notNull: false });
    })
    .then(function () {
      return db.addColumn("photos", "img_color", { type: "string", length: 9, notNull: false });
    });
};

exports.down = function (db) {
  return db
    .removeColumn("photos", "img_color")
    .then(function () { return db.removeColumn("photos", "img_height"); })
    .then(function () { return db.removeColumn("photos", "img_width"); })
    .then(function () { return db.removeColumn("photos", "variant_widths"); })
    .then(function () { return db.removeColumn("photos", "variant_base"); });
};

exports._meta = {
  version: 1,
};
