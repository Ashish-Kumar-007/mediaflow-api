require('dotenv').config();
const { Worker } = require('bullmq');
const { connection } = require('./config/queue');
const { Job } = require('./models');

const simulateProcessingDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const worker = new Worker('media-processing', async (job) => {
  const { jobId, assetId, type, filePath } = job.data;
  console.log(`[Worker] Started processing job ${jobId} of type '${type}' for asset ${assetId}`);

  try {
    // Update job status to processing
    await Job.update({ status: 'processing' }, { where: { id: jobId } });

    // Simulate work (e.g., compressing video, extracting audio using ffmpeg in a real app)
    await simulateProcessingDelay(5000); 

    // Simulate successful processing
    console.log(`[Worker] Successfully processed job ${jobId}`);
    
    // Update job status to completed
    await Job.update({ 
      status: 'completed', 
      resultUrl: `/outputs/${jobId}_processed.ext` // simulated output URL
    }, { where: { id: jobId } });

  } catch (error) {
    console.error(`[Worker] Failed processing job ${jobId}:`, error);
    // Update job status to failed
    await Job.update({ 
      status: 'failed',
      error: error.message
    }, { where: { id: jobId } });
    throw error;
  }
}, { 
  connection,
  skipVersionChecker: true
});

worker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} has failed with ${err.message}`);
});

console.log('Worker is running and listening for jobs on "media-processing" queue...');
