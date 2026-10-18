require('dotenv').config({ quiet: true });

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createGzip } = require('node:zlib');
const mongoose = require('mongoose');
const { normalizeMongoUri, DEFAULT_DB_NAME } = require('../config/db');

const MAGIC = Buffer.from('ELTCDB01');
const EJSON = mongoose.mongo.BSON.EJSON;
const repositoryRoot = path.resolve(__dirname, '../..');

const protectKeyForCurrentWindowsUser = (key) => {
    if (process.platform !== 'win32') {
        throw new Error('Encrypted backups currently require Windows user-bound key protection.');
    }
    const command = [
        "$ErrorActionPreference='Stop'",
        'Add-Type -AssemblyName System.Security',
        '$raw=[Console]::In.ReadToEnd().Trim()',
        '$bytes=[Convert]::FromBase64String($raw)',
        '[Console]::Out.Write([Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::Protect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)))',
    ].join('; ');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
        input: key.toString('base64'),
        encoding: 'utf8',
        windowsHide: true,
    });
    if (result.error || result.status !== 0 || !result.stdout.trim()) {
        throw new Error('Windows user-bound backup key protection is unavailable.');
    }
    return Buffer.from(result.stdout.trim(), 'base64');
};

const resolveBackupDirectory = () => {
    const configured = process.env.BACKUP_DIR
        || path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'EltorCoptic', 'backups');
    const directory = path.resolve(configured);
    const relative = path.relative(repositoryRoot, directory);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        throw new Error('Choose a backup directory outside the source repository.');
    }
    return directory;
};

async function* databaseRecords(database) {
    const listed = await database.listCollections({}, { nameOnly: false }).toArray();
    const collections = listed.filter(({ name }) => !name.startsWith('system.'));
    for (const info of collections) {
        const collection = database.collection(info.name);
        const isView = info.type === 'view';
        const indexes = isView ? [] : await collection.indexes();
        yield `${JSON.stringify({
            type: 'collection',
            name: info.name,
            isView,
            options: EJSON.serialize(info.options || {}),
            indexes: EJSON.serialize(indexes),
        })}\n`;
        let count = 0;
        if (!isView) {
            const cursor = collection.find({}).batchSize(250);
            for await (const document of cursor) {
                yield `${JSON.stringify({ type: 'document', document: EJSON.serialize(document) })}\n`;
                count += 1;
            }
        }
        yield `${JSON.stringify({ type: 'end', count })}\n`;
    }
    yield `${JSON.stringify({ type: 'complete', collections: collections.length })}\n`;
}

async function main() {
    const uri = normalizeMongoUri(process.env.MONGODB_URI);
    if (!uri) throw new Error('MONGODB_URI is not configured.');
    const directory = resolveBackupDirectory();
    fs.mkdirSync(directory, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const filePath = path.join(directory, `eltor-coptic-${timestamp}.db.enc`);
    const temporaryPath = `${filePath}.tmp`;
    const keyPath = `${filePath}.key.dpapi`;
    const key = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 15000 });

    try {
        const protectedKey = protectKeyForCurrentWindowsUser(key);
        fs.writeFileSync(keyPath, protectedKey, { mode: 0o600, flag: 'wx' });
        try {
            execFileSync('icacls.exe', [keyPath, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:(R,W)`], {
                stdio: 'ignore', windowsHide: true,
            });
        } catch {
            throw new Error('Could not restrict access to the protected backup key file.');
        }

        await client.connect();
        const database = client.db(DEFAULT_DB_NAME);
        const output = fs.createWriteStream(temporaryPath, { flags: 'wx', mode: 0o600 });
        output.write(Buffer.concat([MAGIC, nonce]));
        await pipeline(
            Readable.from(databaseRecords(database)),
            createGzip({ level: 9 }),
            cipher,
            output,
        );
        fs.appendFileSync(temporaryPath, cipher.getAuthTag());
        fs.renameSync(temporaryPath, filePath);
        console.log(`Encrypted database backup created: ${filePath}`);
        console.log(`Protected key file: ${keyPath}`);
        console.log(`Database: ${DEFAULT_DB_NAME}; file size: ${fs.statSync(filePath).size} bytes`);
    } catch (error) {
        for (const candidate of [temporaryPath, filePath, keyPath]) {
            try { fs.unlinkSync(candidate); } catch {}
        }
        throw error;
    } finally {
        key.fill(0);
        await client.close().catch(() => {});
    }
}

main().catch(() => {
    console.error('Database backup failed. Check the local MongoDB tools and connection configuration without sharing secrets.');
    process.exitCode = 1;
});
