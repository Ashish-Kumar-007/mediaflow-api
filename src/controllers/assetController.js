const { Asset, Job, User } = require('../models');
const { mediaQueue } = require('../config/queue');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Fixes SSL wildcard certificate issues for Neon S3
});

const uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + originalname;

    // Upload to Neon Object Storage
    const bucketName = 'uploads';
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
    });

    await s3Client.send(command);

    const fileUrl = `${process.env.AWS_ENDPOINT_URL_S3}/${bucketName}/${filename}`;

    const asset = await Asset.create({
      filename,
      originalName: originalname,
      mimeType: mimetype,
      size,
      url: fileUrl,
      userId: req.user.id
    });

    res.status(201).json({ message: 'Asset uploaded to cloud storage successfully', asset });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
};

const getAssets = async (req, res) => {
  try {
    const assets = await Asset.findAll({ where: { userId: req.user.id } });
    res.status(200).json({ assets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve assets', details: error.message });
  }
};

const processAsset = async (req, res) => {
  try {
    const { assetId, type } = req.body; // type e.g., 'compress', 'extract_audio'
    
    if (!assetId || !type) {
      return res.status(400).json({ error: 'assetId and type are required' });
    }

    const asset = await Asset.findOne({ where: { id: assetId, userId: req.user.id } });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const user = await User.findByPk(req.user.id);
    if (user.credits < 1) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    // Deduct credit
    user.credits -= 1;
    await user.save();

    // Create Job record
    const jobRecord = await Job.create({
      type,
      status: 'pending',
      assetId: asset.id,
      userId: req.user.id
    });

    // Enqueue job in BullMQ
    await mediaQueue.add(type, {
      jobId: jobRecord.id,
      assetId: asset.id,
      filePath: asset.url
    });

    res.status(202).json({ message: 'Processing job enqueued', jobId: jobRecord.id, remainingCredits: user.credits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process asset', details: error.message });
  }
};

const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ where: { id: jobId, userId: req.user.id } });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve job status', details: error.message });
  }
};

module.exports = {
  uploadAsset,
  getAssets,
  processAsset,
  getJobStatus
};
