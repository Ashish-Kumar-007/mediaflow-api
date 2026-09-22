const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., 'compress_video', 'extract_audio'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  resultUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
  // assetId and userId will be added via association
});

module.exports = Job;
