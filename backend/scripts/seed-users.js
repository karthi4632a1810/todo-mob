require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');

const seedUsers = async () => {
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

    console.log(`Found ${departments.length} departments:`, departments.map(d => d.name).join(', '));
    console.log('');

    // Sample users data
    const sampleUsers = [
      // 2 HODs
      {
        name: 'Dr. Sarah Johnson',
        email: 'hod.medicine@mapims.org',
        password: 'hod123',
        role: 'HOD',
        department: 'General Medicine',
        isActive: true
      },
      {
        name: 'Dr. Michael Chen',
        email: 'hod.pediatrics@mapims.org',
        password: 'hod123',
        role: 'HOD',
        department: 'Pediatrics',
        isActive: true
      },
      // 3 Employees
      {
        name: 'John Smith',
        email: 'john.smith@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'General Medicine',
        isActive: true
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'Pediatrics',
        isActive: true
      },
      {
        name: 'Robert Wilson',
        email: 'robert.wilson@mapims.org',
        password: 'emp123',
        role: 'EMPLOYEE',
        department: 'General Medicine',
        isActive: true
      }
    ];

    console.log('Creating sample users...\n');
    const createdUsers = [];
    const skippedUsers = [];

    for (const userData of sampleUsers) {
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

    if (createdUsers.length > 0) {
      console.log('📋 Created Users:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // HODs
      const hods = createdUsers.filter(u => u.role === 'HOD');
      if (hods.length > 0) {
        console.log('\n👔 HODs (Heads of Department):');
        hods.forEach(user => {
          console.log(`   Email: ${user.email}`);
          console.log(`   Password: ${user.password === 'hod123' ? 'hod123' : '***'}`);
          console.log(`   Department: ${user.department}`);
          console.log('');
        });
      }

      // Employees
      const employees = createdUsers.filter(u => u.role === 'EMPLOYEE');
      if (employees.length > 0) {
        console.log('👤 Employees:');
        employees.forEach(user => {
          console.log(`   Email: ${user.email}`);
          console.log(`   Password: ${user.password === 'emp123' ? 'emp123' : '***'}`);
          console.log(`   Department: ${user.department}`);
          console.log('');
        });
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change passwords after first login for security!');
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    console.error(error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n✅ Connection closed');
    }
  }
};

seedUsers();

