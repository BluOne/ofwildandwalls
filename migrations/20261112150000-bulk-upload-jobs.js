"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

// Background queue for Bulk upload: one job per grid row. The server's worker
// downloads from Drive, stores in S3 and saves the photo, recording each
// step in stage/progress so the page can show per-row progress.
//   status: queued -> processing -> done | failed   (failed jobs can be retried)
//   dismissed: hidden from the grid ("Clear uploaded rows", removed failed rows)
// bulk_upload_drafts.job_id links a failed job's row being fixed in the grid
// back to that job, so its edits are kept and the retry reuses the job.
exports.up = function (db) {
  return db
    .runSql(`
      CREATE TABLE bulk_upload_jobs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        status ENUM('queued', 'processing', 'done', 'failed') NOT NULL DEFAULT 'queued',
        stage VARCHAR(20) NOT NULL DEFAULT 'queued',
        progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
        payload JSON NOT NULL,
        drive_file_id VARCHAR(128) NULL,
        error VARCHAR(500) NULL,
        error_field VARCHAR(30) NULL,
        photo_slug VARCHAR(255) NULL,
        attempts INT NOT NULL DEFAULT 0,
        dismissed TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        started_at TIMESTAMP NULL,
        finished_at TIMESTAMP NULL,
        KEY idx_bulk_jobs_status (status, id),
        KEY idx_bulk_jobs_user (user_id, dismissed),
        KEY idx_bulk_jobs_drive (drive_file_id),
        CONSTRAINT fk_bulk_jobs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `)
    .then(function () {
      return db.runSql(`
        ALTER TABLE bulk_upload_drafts
          ADD COLUMN job_id INT NULL AFTER user_id,
          ADD CONSTRAINT fk_bulk_upload_drafts_job FOREIGN KEY (job_id) REFERENCES bulk_upload_jobs (id) ON DELETE SET NULL
      `);
    });
};

exports.down = function (db) {
  return db
    .runSql(`ALTER TABLE bulk_upload_drafts DROP FOREIGN KEY fk_bulk_upload_drafts_job, DROP COLUMN job_id`)
    .then(function () {
      return db.runSql(`DROP TABLE bulk_upload_jobs`);
    });
};

exports._meta = {
  version: 1,
};
