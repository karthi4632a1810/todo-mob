# Todo Application Monorepo

A full-stack todo application with a Node.js/Express backend and React Native mobile app, featuring role-based access control and department-based data scoping.

## Project Structure

```
todo/
├── backend/          # Node.js + Express API
└── mobile/          # React Native + Expo mobile app
```

## Features

### Backend
- Node.js + Express (JavaScript)
- MongoDB with Mongoose
- JWT authentication
- Role-based access control (DIRECTOR, HOD, EMPLOYEE)
- Department-based data scoping
- RESTful APIs
- Security middleware (helmet, cors, rate limiting)

### Mobile
- React Native with Expo
- Redux Toolkit for state management
- JWT authentication with secure storage
- Role-based navigation
- Feature-based folder structure
- Common UI components and theme

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration (MongoDB URI, JWT secret, etc.)

5. Make sure MongoDB is running

6. Start the server:
```bash
npm run dev  # Development mode with auto-reload
# or
npm start    # Production mode
```

The backend API will be available at `http://localhost:3000`

### Mobile Setup

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create `.env` file:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For physical device testing, use your computer's IP address:
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000/api
```

4. Start the Expo development server:
```bash
npm start
```

5. Use Expo Go app to scan QR code or press `a` for Android / `i` for iOS

## Role-Based Access Control

### DIRECTOR
- Full access to all departments and data
- Can manage all users and tasks
- Can view all reports and statistics

### HOD (Head of Department)
- Access limited to their department
- Can manage users and tasks within their department
- Can approve/reject tasks in their department
- Can view department-specific reports

### EMPLOYEE
- Limited access to their own tasks
- Can view and update tasks assigned to them
- Can create tasks
- Cannot access user management or approval features

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Tasks
- `GET /api/tasks` - Get all tasks (with department scoping)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Approvals (HOD/DIRECTOR)
- `GET /api/approvals/pending` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve task
- `POST /api/approvals/:id/reject` - Reject task

### Reports
- `GET /api/reports/stats` - Get task statistics
- `GET /api/reports/by-department` - Get tasks by department (DIRECTOR only)
- `GET /api/reports/user-performance` - Get user performance metrics

### Diary
- `GET /api/diary` - Get diary entries with optional date range
- `GET /api/diary/today` - Get today's tasks

## Documentation

- [Backend README](./backend/README.md) - Detailed backend documentation
- [Mobile README](./mobile/README.md) - Detailed mobile app documentation

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT (jsonwebtoken)
- bcrypt
- Security: helmet, cors, express-rate-limit

### Mobile
- React Native
- Expo
- Redux Toolkit
- React Navigation
- Axios
- Expo Secure Store

## Development

### Backend Development
- Uses nodemon for auto-reload in development
- Environment variables in `.env` file
- MongoDB connection required

### Mobile Development
- Expo development server with hot reload
- Redux DevTools for state debugging
- Platform-specific testing (iOS/Android)

## License

ISC

