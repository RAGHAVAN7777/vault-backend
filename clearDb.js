require('dotenv').config();
const mongoose = require('mongoose');
const File = require('./models/File');

async function clearDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('CONNECTED_TO_DB');

        const result = await File.deleteMany({});
        console.log(`PURGE_COMPLETE: ${result.deletedCount} RECORDS_REMOVED`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('PURGE_FAILED:', err);
        process.exit(1);
    }
}

clearDatabase();
