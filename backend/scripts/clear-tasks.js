require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');

const clearTasks = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    console.log('\nClearing all tasks...');

    const result = await Task.deleteMany({});
    console.log(`✓ Cleared tasks: ${result.deletedCount} documents`);

    console.log('\n✅ All tasks cleared successfully!');
    console.log('You can now create new tasks.');
  } catch (error) {
    console.error('❌ Error clearing tasks:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Connection closed');
    }
  }
};

clearTasks();

