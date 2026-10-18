require('dotenv').config({ quiet: true });

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PassThrough } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createDecipheriv, randomUUID } = require('node:crypto');
const { createGunzip } = require('node:zlib');
const readline = require('node:readline');
const mongoose = require('mongoose');

const MAGIC = Buffer.from('ELTCDB01');
const EJSON = mongoose.mongo.BSON.EJSON;
const verbose = process.env.RESTORE_VERBOSE === 'true';
const restoreLog = (message) => { if (verbose) console.log(message); };

const unprotectKeyForCurrentWindowsUser = (protectedKey) => {
    if (process.platform !== 'win32') {
        throw new Error('Encrypted backups currently require Windows user-bound key protection.');
    }
    const command = [
        "$ErrorActionPreference='Stop'",
        'Add-Type -AssemblyName System.Security',
        '$raw=[Console]::In.ReadToEnd().Trim()',
        '$bytes=[Convert]::FromBase64String($raw)',
        '[Console]::Out.Write([Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)))',
    ].join('; ');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
        input: protectedKey.toString('base64'),
        encoding: 'utf8',
        windowsHide: true,
    });
    if (result.error || result.status !== 0 || !result.stdout.trim()) {
        throw new Error('The protected backup key cannot be opened by this Windows account.');
    }
    return Buffer.from(result.stdout.trim(), 'base64');
};

const defaultBackupDirectory = path.join(
    process.env.LOCALAPPDATA || require('node:os').tmpdir(),
    'EltorCoptic', 'backups',
);

const localRestoreUri = () => {
    const uri = String(process.env.RESTORE_MONGODB_URI || 'mongodb://127.0.0.1:27017').trim();
    let host;
    try { host = new URL(uri).hostname.replace(/^\[|\]$/g, ''); } catch {
        throw new Error('RESTORE_MONGODB_URI is invalid.');
    }
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    if (!localHosts.has(host) && process.env.ALLOW_NONLOCAL_RESTORE !== 'true') {
        throw new Error('Restore target must be local. Use a separately isolated test cluster only with explicit configuration.');
    }
    return uri;
};

const latestBackupPath = (directory) => fs.readdirSync(directory)
    .filter((name) => name.endsWith('.db.enc'))
    .sort()
    .at(-1);

const safeIndexOptions = (index) => {
    const options = { ...index };
    delete options.key;
    delete options.ns;
    delete options.v;
    delete options.background;
    return options;
};

async function main() {
    const directory = path.resolve(process.env.BACKUP_DIR || defaultBackupDirectory);
    const backupPath = path.resolve(process.env.BACKUP_FILE || path.join(directory, latestBackupPath(directory) || ''));
    const keyPath = path.resolve(process.env.BACKUP_KEY_FILE || `${backupPath}.key.dpapi`);
    if (!fs.existsSync(backupPath) || !fs.existsSync(keyPath)) {
        throw new Error('A backup archive and its protected key file are required.');
    }
    const restoreUri = localRestoreUri();
    const baseName = `eltor_coptic_restore_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
    const databaseName = String(process.env.RESTORE_DB_NAME || baseName).toLowerCase();
    if (!/^eltor_coptic_restore_[a-z0-9_]+$/.test(databaseName)) {
        throw new Error('RESTORE_DB_NAME must begin with eltor_coptic_restore_.');
    }

    const archive = fs.openSync(backupPath, 'r');
    const size = fs.statSync(backupPath).size;
    if (size < 36) throw new Error('Backup archive is incomplete.');
    const header = Buffer.alloc(20);
    const tag = Buffer.alloc(16);
    fs.readSync(archive, header, 0, header.length, 0);
    fs.readSync(archive, tag, 0, tag.length, size - tag.length);
    fs.closeSync(archive);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Backup format is invalid.');

    const key = unprotectKeyForCurrentWindowsUser(fs.readFileSync(keyPath));
    const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
    decipher.setAuthTag(tag);
    key.fill(0);

    const client = new mongoose.mongo.MongoClient(restoreUri, { serverSelectionTimeoutMS: 5000 });
    try {
        restoreLog('Connecting to the isolated restore target.');
        await client.connect();
        const database = client.db(databaseName);
        const existing = await database.listCollections({}, { nameOnly: true }).toArray();
        if (existing.length) throw new Error('Restore database must be empty.');

        const plaintext = new PassThrough();
        const decrypting = pipeline(
            fs.createReadStream(backupPath, { start: header.length, end: size - tag.length - 1 }),
            decipher,
            createGunzip(),
            plaintext,
        );

        let current = null;
        let batch = [];
        let written = 0;
        let totalCollections = 0;
        const expectedCounts = new Map();
        const indexes = new Map();
        const views = [];
        const lines = readline.createInterface({ input: plaintext, crlfDelay: Infinity });
        for await (const line of lines) {
            if (!line) continue;
            const record = JSON.parse(line);
            if (record.type === 'collection') {
                current = record;
                totalCollections += 1;
                restoreLog(`Preparing collection ${record.name}.`);
                const options = EJSON.deserialize(record.options || {});
                if (record.isView) {
                    views.push({ name: record.name, options });
                    current.collection = null;
                } else {
                    current.collection = await database.createCollection(record.name, options);
                    indexes.set(record.name, EJSON.deserialize(record.indexes || []));
                }
                written = 0;
            } else if (record.type === 'document') {
                if (!current?.collection) throw new Error('Backup document appears outside a collection.');
                batch.push(EJSON.deserialize(record.document));
                if (batch.length >= 250) {
                    await current.collection.insertMany(batch, { ordered: true });
                    written += batch.length;
                    batch = [];
                }
            } else if (record.type === 'end') {
                if (batch.length) {
                    await current.collection.insertMany(batch, { ordered: true });
                    written += batch.length;
                    batch = [];
                }
                if (written !== record.count) throw new Error(`Restore count verification failed for ${current.name}.`);
                if (!current.isView) expectedCounts.set(current.name, record.count);
                restoreLog(`Restored ${current.name}: ${written} documents.`);
                current = null;
            } else if (record.type === 'complete') {
                if (record.collections !== totalCollections) throw new Error('Backup collection manifest is incomplete.');
            } else {
                throw new Error('Backup archive contains an unknown record.');
            }
        }
        await decrypting;

        for (const [collectionName, collectionIndexes] of indexes) {
            const collection = database.collection(collectionName);
            for (const index of collectionIndexes) {
                if (index.name === '_id_') continue;
                restoreLog(`Rebuilding index ${collectionName}.${index.name}.`);
                await collection.createIndex(index.key, safeIndexOptions(index));
            }
        }
        for (const view of views) {
            await database.createCollection(view.name, {
                viewOn: view.options.viewOn,
                pipeline: view.options.pipeline || [],
            });
        }

        for (const [name, expected] of expectedCounts) {
            const actual = await database.collection(name).countDocuments();
            if (actual !== expected) throw new Error(`Restored data verification failed for ${name}.`);
        }
        console.log(`Restore verified in isolated database: ${databaseName}`);
        console.log(`Collections verified: ${expectedCounts.size}; documents restored: ${[...expectedCounts.values()].reduce((sum, count) => sum + count, 0)}`);
        console.log('The restored database is retained for inspection; remove it manually after review.');
    } finally {
        await client.close().catch(() => {});
    }
}

main().catch(() => {
    console.error('Database restore test failed. Check the local database, archive, and protected key without sharing secrets.');
    process.exitCode = 1;
});
