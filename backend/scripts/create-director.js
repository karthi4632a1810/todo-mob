require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createDirector = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Check if director with this email already exists
    const existingDirector = await User.findOne({ email: 'admin@mapims.org' });
    
    if (existingDirector) {
      // Update existing director
      console.log('⚠️  Director with email admin@mapims.org already exists!');
      console.log('   Updating password and ensuring correct role...');
      
      existingDirector.password = 'admin@123'; // Will be hashed by pre-save hook
      existingDirector.role = 'DIRECTOR';
      existingDirector.department = 'Information Technology';
      existingDirector.isActive = true;
      existingDirector.name = 'Admin Director';
      
      await existingDirector.save();
      
      console.log('\n✅ Director updated successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    admin@mapims.org');
      console.log('Password: admin@123');
      console.log('Role:     DIRECTOR');
      console.log('Department: Information Technology');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      // Create new director
      const director = await User.create({
        name: 'Admin Director',
        email: 'admin@mapims.org',
        password: 'admin@123',
        role: 'DIRECTOR',
        department: 'Information Technology',
        isActive: true
      });

      console.log('\n✅ Director created successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    admin@mapims.org');
      console.log('Password: admin@123');
      console.log('Role:     DIRECTOR');
      console.log('Department: Information Technology');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
    console.log('\n⚠️  IMPORTANT: Change the password after first login for security!');
  } catch (error) {
    console.error('❌ Error creating director:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate email - user already exists');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\nConnection closed');
    }
  }
};

createDirector();

