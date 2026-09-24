"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db
    .runSql(`
      ALTER TABLE photos
      ADD COLUMN url VARCHAR(500),
      ADD COLUMN cap VARCHAR(255),
      ADD COLUMN slug VARCHAR(255) UNIQUE,
      ADD COLUMN ref VARCHAR(100),
      ADD COLUMN alt VARCHAR(255),
      ADD COLUMN date VARCHAR(100),
      ADD COLUMN category VARCHAR(255),
      ADD COLUMN collection VARCHAR(255),
      ADD COLUMN camera VARCHAR(255),
      ADD COLUMN l VARCHAR(50),
      ADD COLUMN t VARCHAR(50),
      ADD COLUMN w VARCHAR(50),
      ADD COLUMN h VARCHAR(50),
      ADD COLUMN views JSON,
      ADD COLUMN live BOOLEAN DEFAULT TRUE,
      MODIFY COLUMN created_by INT NULL;
    `)
    .then(function () {
      return db.runSql(`
        INSERT INTO photos (
          slug, url, s3_key, alt, cap, title, ref, category, collection, camera, date, description, l, t, w, h, live, views, metadata
        ) VALUES
        ('lake', '/img/lake.jpg', 'photos/lake.jpg', 'Backwater treeline', 'Palm Backwater', 'Palm Backwater', 'HR.01 / 05', 'Landscape', 'Kerala Backwaters', 'Canon R5', '2022-09-04', '', '26.5', '1.4', '10.3', '7.2', true, '["Flow", "Grid"]', '[{"key":"Camera","value":"Canon R5"},{"key":"Lens","value":"24–70mm f/2.8"},{"key":"Settings","value":"1/125 · f/11 · ISO 100"},{"key":"Location","value":"Kerala"}]'),
        ('eagle', '/img/eagle.jpg', 'photos/eagle.jpg', 'Eagle on a stone', 'Perched Eagle', 'Perched Eagle', 'HR.02 / 05', 'Wildlife', 'Raptors', 'Canon R6', '2023-01-18', '', '63.7', '1.6', '10.3', '13.8', true, '["Grid"]', '[{"key":"Camera","value":"Canon R6"},{"key":"Lens","value":"400mm f/4"},{"key":"Settings","value":"1/1600 · f/5.6 · ISO 640"},{"key":"Location","value":"Bharatpur"}]'),
        ('tiger', '/img/tiger.jpg', 'photos/tiger.jpg', 'Tiger walking', 'Morning Patrol', 'Morning Patrol', 'HR.03 / 05', 'Wildlife', 'Bandhavgarh', 'Canon R5', '2023-04-02', '', '1.5', '17.4', '22.8', '30.8', true, '["Flow", "Grid"]', '[{"key":"Camera","value":"Canon R5"},{"key":"Lens","value":"100–500mm f/7.1"},{"key":"Settings","value":"1/800 · f/7.1 · ISO 1250"},{"key":"Location","value":"Bandhavgarh"}]'),
        ('hornbill', '/img/hornbill.jpg', 'photos/hornbill.jpg', 'Hornbill at a nest', 'Nesting Hornbill', 'Nesting Hornbill', 'HR.04 / 05', 'Wildlife', 'Western Ghats', 'Nikon Z8', '2023-06-11', '', '38.9', '17.3', '10.3', '15.3', true, '["Grid"]', '[{"key":"Camera","value":"Nikon Z8"},{"key":"Lens","value":"500mm f/5.6"},{"key":"Location","value":"Valparai"}]'),
        ('palace', '/img/palace.jpg', 'photos/palace.jpg', 'Palace interior', 'Palace Doorway', 'Palace Doorway', 'HR.01 / 05', 'Architecture', 'Rajasthan', 'Sony A7 IV', '2021-11-27', '', '51.4', '17.4', '22.6', '28.2', true, '["Flow", "Grid"]', '[{"key":"Camera","value":"Sony A7 IV"},{"key":"Lens","value":"16–35mm f/2.8"},{"key":"Location","value":"Udaipur"}]'),
        ('owl', '/img/owl.jpg', 'photos/owl.jpg', 'Spotted owlet', 'Spotted Owlet', 'Spotted Owlet', 'HR.02 / 05', 'Wildlife', 'Western Ghats', 'Nikon Z8', '2023-06-14', '', '88.6', '17.3', '10.1', '13.8', true, '["Grid"]', '[{"key":"Camera","value":"Nikon Z8"},{"key":"Location","value":"Valparai"}]'),
        ('bridge', '/img/bridge.jpg', 'photos/bridge.jpg', 'Brooklyn Bridge', 'Bridge Traffic', 'Bridge Traffic', 'HR.03 / 05', 'Architecture', 'New York', 'Sony A7 IV', '2024-02-09', '', '76.2', '33.1', '10.1', '13.7', false, '["Grid"]', '[{"key":"Camera","value":"Sony A7 IV"},{"key":"Location","value":"New York"}]'),
        ('woodpecker', '/img/woodpecker.jpg', 'photos/woodpecker.jpg', 'Woodpecker on a branch', 'Woodpecker Perch', 'Woodpecker Perch', 'HR.04 / 05', 'Wildlife', 'Western Ghats', 'Nikon Z8', '2023-06-15', '', '14.1', '49.6', '10.2', '6.7', true, '["Grid"]', '[{"key":"Camera","value":"Nikon Z8"}]'),
        ('river', '/img/river.jpg', 'photos/river.jpg', 'River rocks', 'River Rocks', 'River Rocks', 'HR.01 / 05', 'Landscape', 'Spiti', 'Canon R5', '2022-09-06', '', '26.5', '48.6', '22.6', '21.5', true, '["Flow", "Grid"]', '[{"key":"Camera","value":"Canon R5"},{"key":"Location","value":"Spiti"}]'),
        ('tigerclose', '/img/tigerclose.jpg', 'photos/tigerclose.jpg', 'Tiger, close', 'Close Encounter', 'Close Encounter', 'HR.02 / 05', 'Wildlife', 'Bandhavgarh', 'Canon R5', '2023-04-03', '', '76.2', '48.6', '22.7', '21.5', true, '["Grid"]', '[{"key":"Camera","value":"Canon R5"},{"key":"Location","value":"Bandhavgarh"}]');
      `);
    });
};

exports.down = function (db) {
  return db.runSql(`
    ALTER TABLE photos
    DROP COLUMN url,
    DROP COLUMN cap,
    DROP COLUMN slug,
    DROP COLUMN ref,
    DROP COLUMN alt,
    DROP COLUMN date,
    DROP COLUMN category,
    DROP COLUMN collection,
    DROP COLUMN camera,
    DROP COLUMN l,
    DROP COLUMN t,
    DROP COLUMN w,
    DROP COLUMN h,
    DROP COLUMN views,
    DROP COLUMN live;
  `);
};

exports._meta = {
  version: 1,
};
