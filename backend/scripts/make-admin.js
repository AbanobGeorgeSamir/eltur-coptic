require('dotenv').config();

const { connectDB } = require('../config/db');
const User = require('../models/User');

const email = process.argv[2];

if (!email) {
    console.error('Usage: npm run make-admin -- user@example.com');
    process.exit(1);
}

const run = async () => {
    await connectDB();
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new Error('User not found: ' + normalizedEmail);
    }

    if (user.role !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount >= 4) throw new Error('Eltor Coptic supports a maximum of four administrators.');
        user.role = 'admin';
        await user.save();
    }

    console.log('Admin access granted to ' + normalizedEmail);
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
