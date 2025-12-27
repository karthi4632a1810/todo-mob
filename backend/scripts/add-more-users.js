require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');

const addMoreUsers = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get available departments
    const departments = await Department.find({ isActive: true });
    if (departments.length === 0) {
      console.error('❌ No active departments found. Please run update-departments.js first.');
      return;
    }

    console.log(`Found ${departments.length} departments\n`);

    // Additional users data
    const additionalUsers = [
      // More HODs
      {
        name: 'Dr. Priya Sharma',
        email: 'hod.ortho@mapims.org',
        password: 'hod123',
        role: 'HOD',
        department: 'Orthopedics',
        isActive: true
      },
      {
        name: 'Dr. James Anderson',
        email: 'hod.cardio@mapims.org',
        password: 'hod123',
        role: 'HOD',
        department: 'Cardiology',
        isActive: true
      },
      // More Employees
      {
        name: 'Lisa Martinez',
        email: 'lisa.martinez@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'Orthopedics',
        isActive: true
      },
      {
        name: 'David Brown',
        email: 'david.brown@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'Cardiology',
        isActive: true
      },
      {
        name: 'Maria Garcia',
        email: 'maria.garcia@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'Emergency Medicine',
        isActive: true
      },
      {
        name: 'Kevin Lee',
        email: 'kevin.lee@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'Radiology',
        isActive: true
      },
      {
        name: 'Jennifer Taylor',
        email: 'jennifer.taylor@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'Pathology',
        isActive: true
      }
    ];

    console.log('Creating additional users...\n');
    const createdUsers = [];
    const skippedUsers = [];

    for (const userData of additionalUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists. Skipping...`);
          skippedUsers.push(userData);
          continue;
        }

        // Verify department exists
        const dept = departments.find(d => d.name === userData.department);
        if (!dept) {
          console.log(`⚠️  Department "${userData.department}" not found. Using first available department.`);
          userData.department = departments[0].name;
        }

        // Create user
        const user = await User.create(userData);
        createdUsers.push(user);
        console.log(`✅ Created ${userData.role}: ${userData.name} (${userData.email})`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  User ${userData.email} already exists. Skipping...`);
          skippedUsers.push(userData);
        } else {
          console.error(`❌ Error creating user ${userData.email}:`, error.message);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   Created: ${createdUsers.length} users`);
    console.log(`   Skipped: ${skippedUsers.length} users (already exist)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Count total users
    const totalUsers = await User.countDocuments();
    const hodsCount = await User.countDocuments({ role: 'HOD' });
    const employeesCount = await User.countDocuments({ role: 'EMPLOYEE' });
    const directorsCount = await User.countDocuments({ role: 'DIRECTOR' });

    console.log('📊 Total Users in Database:');
    console.log(`   Directors: ${directorsCount}`);
    console.log(`   HODs: ${hodsCount}`);
    console.log(`   Employees: ${employeesCount}`);
    console.log(`   Total: ${totalUsers}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (createdUsers.length > 0) {
      console.log('📋 Newly Created Users:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // HODs
      const hods = createdUsers.filter(u => u.role === 'HOD');
      if (hods.length > 0) {
        console.log('\n👔 HODs:');
        hods.forEach(user => {
          console.log(`   ${user.name} - ${user.email} (Password: hod123)`);
          console.log(`   Department: ${user.department}`);
        });
      }

      // Employees
      const employees = createdUsers.filter(u => u.role === 'EMPLOYEE');
      if (employees.length > 0) {
        console.log('\n👤 Employees:');
        employees.forEach(user => {
          console.log(`   ${user.name} - ${user.email} (Password: emp123)`);
          console.log(`   Department: ${user.department}`);
        });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change passwords after first login for security!');
  } catch (error) {
    console.error('❌ Error adding users:', error.message);
    console.error(error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n✅ Connection closed');
    }
  }
};

addMoreUsers();

