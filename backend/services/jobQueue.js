const { Queue, Worker } = require('bullmq');
const { redisClient } = require('../redisClient');

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};

// Main background task queue
const backgroundTasks = new Queue('backgroundTasks', { connection });

// Example worker (can be moved to its own file/module)
const backgroundWorker = new Worker('backgroundTasks', async job => {
    // Add job processing logic here
    if (job.name === 'example') {
        // Example: log job data
        console.log('Processing example job:', job.data);
    }
}, { connection });

// Function to add a job to the queue
async function addBackgroundJob(name, data) {
    await backgroundTasks.add(name, data);
}

module.exports = {
    backgroundTasks,
    addBackgroundJob,
}; 