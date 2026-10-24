# Database backup and restore

## What the repository provides

`npm run backup:db` reads the database selected by `MONGODB_URI` and `DB_NAME`, writes a compressed AES-256-GCM encrypted archive outside the repository, and protects its random encryption key with Windows DPAPI for the current Windows user. The default location is `%LOCALAPPDATA%\EltorCoptic\backups`. Set `BACKUP_DIR` to choose another private directory. The archive includes BSON data, collection options, views, and indexes. The script never prints the connection string or document contents.

The key file ends in `.key.dpapi`; keep it with the archive. It can only be opened by the same Windows user on the same Windows installation. Store a second protected copy of both files in an organization-approved encrypted backup location. If the Windows account/profile is lost, the archive cannot be decrypted.

The export walks collections in sequence. It verifies restored collection counts and recreates indexes, but it is not a point-in-time snapshot if production writes continue during the export. Configure and retain MongoDB Atlas automated snapshots or point-in-time recovery for production; use this encrypted export for an additional portable recovery copy.

## Backup

1. Confirm `backend/.env` points to the intended production database and that the current Windows account is approved to handle the resulting encrypted backup.
2. Install dependencies with `npm ci` from `backend/`.
3. Run `npm run backup:db` from `backend/`.
4. Confirm the command reports an archive path and a nonzero file size. Keep the `.db.enc` archive and matching `.key.dpapi` file together in the approved encrypted backup location. Do not copy either file into the source repository or send them through chat/email.

The `.gitignore` rules exclude the archive, protected key, and common local secret/config files. Before publishing, check `git status --ignored` and `git ls-files` to ensure no backup or real environment file is tracked.

## Restore test

1. Install MongoDB Community Server locally and start it on `127.0.0.1:27017`. This is the isolated restore target; the script rejects non-local hosts by default.
2. From `backend/`, select a backup if needed and run `npm run restore:test`. The script uses the newest archive in the backup directory by default. Set `BACKUP_FILE`, `BACKUP_KEY_FILE`, or `BACKUP_DIR` to select another pair.
3. The script creates an empty database with a unique `eltor_coptic_restore_...` name, restores every archived collection and index, decrypts/authenticates the complete archive, and compares restored counts with the encrypted export manifest. It prints the isolated database name only after those checks pass.
4. Point a separate local backend process at that database and exercise read/write flows before considering the restore functional. Do not point the test restore at production. The script retains its test database for manual inspection; remove it after review.

For a managed non-production restore target, set `RESTORE_MONGODB_URI`, choose a unique `RESTORE_DB_NAME` beginning with `eltor_coptic_restore_`, and explicitly set `ALLOW_NONLOCAL_RESTORE=true`. Never use this override with the production cluster.

## Production operations

The repository cannot verify the Atlas backup schedule, retention policy, snapshot age, or restore permissions. An operator with Atlas access must confirm those settings, run a point-in-time restore into a separate Atlas project or cluster, and record the restore date, source snapshot, collection counts, and application smoke-test result. Rotate the database user and application secrets if access was exposed.
