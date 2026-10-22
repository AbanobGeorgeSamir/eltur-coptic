const validEmail = (email) => typeof email === 'string'
    && (email.trim() === '' || /^[^\s@]+@(?:[^\s@.]+\.)+com$/i.test(email.trim()));

const validPhone = (phone) => /^\+[1-9]\d{7,14}$/.test(String(phone || ''));

const normalizePhone = (value) => typeof value === 'string'
    ? value.trim().replace(/[()\s-]/g, '')
    : '';

const hasFourPartName = (name) => typeof name === 'string'
    && name.trim().split(/\s+/).filter(Boolean).length >= 4;

module.exports = { validEmail, validPhone, normalizePhone, hasFourPartName };
