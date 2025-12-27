require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');

// Sample task data
const taskTemplates = [
  // General Medicine tasks
  {
    titles: [
      'Review patient medical records',
      'Prepare monthly department report',
      'Conduct staff training session',
      'Update patient database',
      'Schedule department meeting',
      'Review medication inventory',
      'Prepare budget proposal',
      'Update standard operating procedures',
      'Conduct quality audit',
      'Prepare presentation for board meeting'
    ],
    descriptions: [
      'Review and update patient medical records for accuracy and completeness.',
      'Compile monthly statistics and prepare comprehensive department report.',
      'Organize and conduct training session for new staff members.',
      'Update patient database with latest information and records.',
      'Schedule and coordinate monthly department meeting with all staff.',
      'Review and update medication inventory levels and expiry dates.',
      'Prepare detailed budget proposal for next fiscal year.',
      'Review and update standard operating procedures document.',
      'Conduct comprehensive quality audit of department processes.',
      'Prepare detailed presentation for upcoming board meeting.'
    ],
    department: 'General Medicine'
  },
  // Pediatrics tasks
  {
    titles: [
      'Review pediatric patient cases',
      'Update vaccination schedule',
      'Prepare child health report',
      'Organize pediatric workshop',
      'Review child safety protocols',
      'Update pediatric guidelines',
      'Prepare patient care plan',
      'Conduct staff evaluation',
      'Review equipment maintenance',
      'Prepare quarterly statistics'
    ],
    descriptions: [
      'Review and analyze recent pediatric patient cases for quality improvement.',
      'Update and maintain vaccination schedule for all pediatric patients.',
      'Compile comprehensive child health report for the month.',
      'Organize and coordinate pediatric care workshop for staff.',
      'Review and update child safety protocols and procedures.',
      'Update pediatric care guidelines based on latest medical research.',
      'Prepare detailed patient care plan for complex cases.',
      'Conduct annual staff performance evaluation.',
      'Review and schedule equipment maintenance and calibration.',
      'Prepare and analyze quarterly department statistics.'
    ],
    department: 'Pediatrics'
  },
  // IT tasks
  {
    titles: [
      'Update system security patches',
      'Backup database systems',
      'Review network infrastructure',
      'Update software documentation',
      'Conduct system performance audit',
      'Implement new feature',
      'Fix critical bug in system',
      'Update user access permissions',
      'Review and optimize database',
      'Prepare system upgrade plan'
    ],
    descriptions: [
      'Install and test latest security patches for all systems.',
      'Perform scheduled backup of all database systems and verify integrity.',
      'Review network infrastructure and identify optimization opportunities.',
      'Update technical documentation for all software systems.',
      'Conduct comprehensive system performance audit and analysis.',
      'Implement new feature based on user requirements.',
      'Investigate and fix critical bug reported in production system.',
      'Review and update user access permissions and roles.',
      'Review database performance and optimize slow queries.',
      'Prepare detailed plan for upcoming system upgrade.'
    ],
    department: 'Information Technology'
  },
  // Cardiology tasks
  {
    titles: [
      'Review cardiac patient reports',
      'Update ECG equipment calibration',
      'Prepare cardiac care protocol',
      'Review medication dosages',
      'Conduct cardiac assessment',
      'Update patient treatment plans',
      'Review diagnostic reports',
      'Prepare cardiac statistics',
      'Update emergency procedures',
      'Review equipment maintenance logs'
    ],
    descriptions: [
      'Review and analyze cardiac patient reports for accuracy.',
      'Schedule and perform ECG equipment calibration.',
      'Update and document cardiac care protocols.',
      'Review and verify medication dosages for cardiac patients.',
      'Conduct comprehensive cardiac assessment for new patients.',
      'Update and revise patient treatment plans based on progress.',
      'Review diagnostic reports and ensure proper documentation.',
      'Compile and analyze cardiac department statistics.',
      'Update emergency cardiac care procedures.',
      'Review and maintain equipment maintenance logs.'
    ],
    department: 'Cardiology'
  },
  // Emergency Medicine tasks
  {
    titles: [
      'Review emergency protocols',
      'Update triage procedures',
      'Prepare emergency response plan',
      'Review patient flow process',
      'Update emergency equipment checklist',
      'Conduct emergency drill',
      'Review incident reports',
      'Update staff training materials',
      'Prepare emergency statistics',
      'Review medication stock levels'
    ],
    descriptions: [
      'Review and update emergency department protocols.',
      'Update and document triage procedures and guidelines.',
      'Prepare comprehensive emergency response plan.',
      'Review and optimize patient flow process in emergency.',
      'Update emergency equipment checklist and verify availability.',
      'Organize and conduct emergency response drill.',
      'Review and analyze incident reports for improvement.',
      'Update staff training materials for emergency procedures.',
      'Compile and analyze emergency department statistics.',
      'Review and restock emergency medication inventory.'
    ],
    department: 'Emergency Medicine'
  },
  // Orthopedics tasks
  {
    titles: [
      'Review orthopedic patient cases',
      'Update surgical procedures',
      'Prepare rehabilitation plan',
      'Review X-ray reports',
      'Update patient discharge protocols',
      'Conduct equipment inspection',
      'Review patient follow-up schedule',
      'Update treatment guidelines',
      'Prepare surgical statistics',
      'Review patient satisfaction surveys'
    ],
    descriptions: [
      'Review and analyze orthopedic patient cases.',
      'Update and document surgical procedures and protocols.',
      'Prepare comprehensive rehabilitation plan for patients.',
      'Review and verify X-ray reports for accuracy.',
      'Update patient discharge protocols and documentation.',
      'Conduct thorough inspection of orthopedic equipment.',
      'Review and update patient follow-up appointment schedule.',
      'Update treatment guidelines based on latest research.',
      'Compile and analyze surgical statistics.',
      'Review patient satisfaction surveys and identify improvements.'
    ],
    department: 'Orthopedics'
  }
];

const priorities = ['LOW', 'MEDIUM', 'HIGH'];
const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Main function to seed tasks
const seedTasks = async () => {
  try {
    await connectDB();

    // Get Director (assignedBy)
    const director = await User.findOne({ role: 'DIRECTOR', isActive: true });
    if (!director) {
      console.error('No active Director found. Please create a Director first.');
      process.exit(1);
    }

    // Get all active HODs and Employees
    const hods = await User.find({ role: 'HOD', isActive: true });
    const employees = await User.find({ role: 'EMPLOYEE', isActive: true });

    if (hods.length === 0 && employees.length === 0) {
      console.error('No active HODs or Employees found. Please seed users first.');
      process.exit(1);
    }

    console.log(`Found ${hods.length} HODs and ${employees.length} Employees`);

    // Clear existing tasks (optional - comment out if you want to keep existing tasks)
    // await Task.deleteMany({});
    // console.log('Cleared existing tasks');

    const tasksToCreate = [];
    const now = new Date();
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Create tasks for each department template
    for (const template of taskTemplates) {
      // Find users in this department
      const deptHods = hods.filter(hod => hod.department === template.department);
      const deptEmployees = employees.filter(emp => emp.department === template.department);

      // Create 3-5 tasks per department
      const numTasks = Math.floor(Math.random() * 3) + 3; // 3-5 tasks

      for (let i = 0; i < numTasks; i++) {
        const titleIndex = Math.floor(Math.random() * template.titles.length);
        const title = template.titles[titleIndex];
        const description = template.descriptions[titleIndex];

        // Randomly assign to HOD or Employee
        let assignedTo;
        let assigneeRole;
        
        if (deptHods.length > 0 && deptEmployees.length > 0) {
          // Randomly choose between HOD and Employee
          assigneeRole = Math.random() > 0.5 ? 'HOD' : 'EMPLOYEE';
        } else if (deptHods.length > 0) {
          assigneeRole = 'HOD';
        } else if (deptEmployees.length > 0) {
          assigneeRole = 'EMPLOYEE';
        } else {
          // Skip if no users in this department
          continue;
        }

        if (assigneeRole === 'HOD') {
          assignedTo = deptHods[Math.floor(Math.random() * deptHods.length)];
        } else {
          assignedTo = deptEmployees[Math.floor(Math.random() * deptEmployees.length)];
        }

        // Random priority
        const priority = priorities[Math.floor(Math.random() * priorities.length)];

        // Random status (weighted towards PENDING and IN_PROGRESS)
        const statusWeights = [0.3, 0.3, 0.25, 0.15]; // PENDING, IN_PROGRESS, COMPLETED, BLOCKED
        const rand = Math.random();
        let status;
        if (rand < statusWeights[0]) status = 'PENDING';
        else if (rand < statusWeights[0] + statusWeights[1]) status = 'IN_PROGRESS';
        else if (rand < statusWeights[0] + statusWeights[1] + statusWeights[2]) status = 'COMPLETED';
        else status = 'BLOCKED';

        // Random dates
        const startDate = randomDate(pastDate, now);
        const dueDate = randomDate(now, futureDate);

        // Create task object
        const taskData = {
          title: title,
          description: description,
          assignedTo: assignedTo._id,
          assignedBy: director._id,
          department: template.department,
          priority: priority,
          status: status,
          startDate: startDate,
          dueDate: dueDate
        };

        // Add completedAt if status is COMPLETED
        if (status === 'COMPLETED') {
          taskData.completedAt = randomDate(startDate, now);
        }

        tasksToCreate.push(taskData);
      }
    }

    // Insert all tasks
    const createdTasks = await Task.insertMany(tasksToCreate);
    console.log(`\n✅ Successfully created ${createdTasks.length} tasks!`);
    console.log('\nTask Summary:');
    
    // Count by status
    const statusCounts = {};
    statuses.forEach(s => statusCounts[s] = 0);
    createdTasks.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    
    console.log('By Status:');
    Object.keys(statusCounts).forEach(status => {
      console.log(`  ${status}: ${statusCounts[status]}`);
    });

    // Count by priority
    const priorityCounts = {};
    priorities.forEach(p => priorityCounts[p] = 0);
    createdTasks.forEach(t => {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    });
    
    console.log('\nBy Priority:');
    Object.keys(priorityCounts).forEach(priority => {
      console.log(`  ${priority}: ${priorityCounts[priority]}`);
    });

    // Count by department
    const deptCounts = {};
    createdTasks.forEach(t => {
      deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
    });
    
    console.log('\nBy Department:');
    Object.keys(deptCounts).forEach(dept => {
      console.log(`  ${dept}: ${deptCounts[dept]}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding tasks:', error);
    process.exit(1);
  }
};

// Run the seed function
seedTasks();

