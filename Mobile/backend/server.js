const path = require('node:path');

const sharedBackendPath = path.resolve(__dirname, '..', '..', 'backend');
process.chdir(sharedBackendPath);

const app = require(path.join(sharedBackendPath, 'server.js'));

if (require.main === module) {
    app.startServer().catch((error) => {
        console.error('Unable to start shared backend:', error.message);
        process.exit(1);
    });
}

module.exports = app;
