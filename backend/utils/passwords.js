const crypto = require('crypto');

const KEY_LENGTH = 64;
const LEGACY_PARAMS = { N: 2 ** 14, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const CURRENT_PARAMS = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const CURRENT_VERSION = `scrypt$${CURRENT_PARAMS.N}$${CURRENT_PARAMS.r}$${CURRENT_PARAMS.p}`;

const deriveKey = (password, salt, params) => new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, params, (error, derivedKey) => {
        if (error) {
            reject(error);
            return;
        }
        resolve(derivedKey);
    });
});

const hashPassword = async (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await deriveKey(password, salt, CURRENT_PARAMS);
    return `${CURRENT_VERSION}$${salt}$${derivedKey.toString('hex')}`;
};

const parseStoredHash = (storedValue) => {
    if (typeof storedValue !== 'string') return null;

    const hashParts = storedValue.split('$');
    if (hashParts.length === 3 && hashParts[0] === 'scrypt'
        && /^[a-f0-9]{32}$/i.test(hashParts[1])
        && /^[a-f0-9]{128}$/i.test(hashParts[2])) {
        return { salt: hashParts[1], expectedHash: hashParts[2], params: LEGACY_PARAMS, legacy: true };
    }

    if (hashParts.length === 6 && hashParts.slice(0, 4).join('$') === CURRENT_VERSION
        && /^[a-f0-9]{32}$/i.test(hashParts[4])
        && /^[a-f0-9]{128}$/i.test(hashParts[5])) {
        return { salt: hashParts[4], expectedHash: hashParts[5], params: CURRENT_PARAMS, legacy: false };
    }

    return null;
};

const verifyPassword = async (password, storedValue) => {
    if (typeof password !== 'string') return false;
    const parsed = parseStoredHash(storedValue);
    if (!parsed) return false;

    const derivedKey = await deriveKey(password, parsed.salt, parsed.params);
    const storedHash = Buffer.from(parsed.expectedHash, 'hex');
    return storedHash.length === derivedKey.length && crypto.timingSafeEqual(storedHash, derivedKey);
};

const needsRehash = (storedValue) => {
    const parsed = parseStoredHash(storedValue);
    return !parsed || parsed.legacy;
};

module.exports = {
    hashPassword,
    verifyPassword,
    needsRehash,
};
