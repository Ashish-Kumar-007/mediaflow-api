require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
require('./models'); // Make sure models are loaded before sync

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    await sequelize.sync({ alter: true }); // Automatically sync models to db
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
