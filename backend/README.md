# Todo Backend API

A Node.js + Express backend API with MongoDB, JWT authentication, and role-based access control.

## Features

- **Authentication**: JWT-based authentication with secure password hashing
- **Role-Based Access Control**: Three roles - DIRECTOR, HOD, EMPLOYEE
- **Department-Based Data Scoping**: Users can only access data within their department scope
- **RESTful APIs**: Clean REST API endpoints for all operations
- **Security**: Helmet, CORS, rate limiting, and input validation
- **MongoDB**: Mongoose ODM for database operations

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT (jsonwebtoken)
- bcrypt for password hashing
- Security middleware (helmet, cors, express-rate-limit)
- Morgan for logging

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/todo-app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:19006
```

5. Make sure MongoDB is running on your system. If not, install and start MongoDB:
   - **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - **macOS**: `brew install mongodb-community` and `brew services start mongodb-community`
   - **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires authentication)
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - Get all users (with department scoping)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (DIRECTOR only)

### Tasks
- `GET /api/tasks` - Get all tasks (with department scoping)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Approvals
- `GET /api/approvals/pending` - Get pending approvals (HOD/DIRECTOR)
- `POST /api/approvals/:id/approve` - Approve task
- `POST /api/approvals/:id/reject` - Reject task

### Reports
- `GET /api/reports/stats` - Get task statistics
- `GET /api/reports/by-department` - Get tasks by department (DIRECTOR only)
- `GET /api/reports/user-performance` - Get user performance metrics (HOD/DIRECTOR)

### Diary
- `GET /api/diary` - Get diary entries (tasks) with optional date range
- `GET /api/diary/today` - Get today's tasks

## Role-Based Access Control

### DIRECTOR
- Full access to all departments and data
- Can create, read, update, and delete any user or task
- Can view all reports and statistics

### HOD (Head of Department)
- Access limited to their own department
- Can manage users and tasks within their department
- Can approve/reject tasks in their department
- Can view department-specific reports

### EMPLOYEE
- Limited access to their own tasks
- Can view and update tasks assigned to them
- Can create tasks (assigned to themselves or others in same department)
- Cannot access user management or approval features

## Department-Based Data Scoping

The API automatically filters data based on the user's role and department:

- **DIRECTOR**: No filtering - sees all data
- **HOD**: Sees only data from their department
- **EMPLOYEE**: Sees only their own tasks and tasks in their department

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Example API Usage

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "EMPLOYEE",
    "department": "Engineering"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Tasks (with authentication)
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Health Check

Check if the server is running:
```bash
curl http://localhost:3000/health
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error message here"
}
```

Success responses:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

