const User = require('./User');
const Asset = require('./Asset');
const Job = require('./Job');

// Setup Associations
User.hasMany(Asset, { foreignKey: 'userId', as: 'assets' });
Asset.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Job, { foreignKey: 'userId', as: 'jobs' });
Job.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Asset.hasMany(Job, { foreignKey: 'assetId', as: 'jobs' });
Job.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });

module.exports = {
  User,
  Asset,
  Job
};
