require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('../models/Department');

const departments = [
  { name: 'General Medicine', code: 'GEN_MED' },
  { name: 'Pediatrics', code: 'PED' },
  { name: 'Orthopedics', code: 'ORTHO' },
  { name: 'Cardiology', code: 'CARDIO' },
  { name: 'Emergency Medicine', code: 'ER' },
  { name: 'Radiology', code: 'RAD' },
  { name: 'Pathology', code: 'PATH' },
  { name: 'Pharmacy', code: 'PHARM' },
  { name: 'Intensive Care Unit', code: 'ICU' },
  { name: 'Information Technology', code: 'IT' },
];

const updateDepartments = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    console.log('\nUpdating departments...');

    for (const dept of departments) {
      const existing = await Department.findOne({ name: dept.name });
      if (existing) {
        existing.code = dept.code;
        existing.isActive = true;
        await existing.save();
        console.log(`✓ Updated: ${dept.name} (${dept.code})`);
      } else {
        await Department.create({
          name: dept.name,
          code: dept.code,
          isActive: true
        });
        console.log(`✓ Created: ${dept.name} (${dept.code})`);
      }
    }

    // Deactivate any departments not in the list
    const allDepts = await Department.find({});
    const deptNames = departments.map(d => d.name);
    for (const dept of allDepts) {
      if (!deptNames.includes(dept.name)) {
        dept.isActive = false;
        await dept.save();
        console.log(`⚠ Deactivated: ${dept.name} (not in new list)`);
      }
    }

    console.log('\n✅ Departments updated successfully!');
  } catch (error) {
    console.error('❌ Error updating departments:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Connection closed');
    }
  }
};

updateDepartments();

