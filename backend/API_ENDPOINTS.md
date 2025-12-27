# API Endpoints Summary

All endpoints return consistent JSON format:
```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "errors": array | null
}
```

## Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user (restricted for Director)
- `POST /api/auth/login` - Login user (returns JWT and user profile)
- `POST /api/auth/forgot-password` - Request password reset (stub)
- `POST /api/auth/reset-password` - Reset password (stub)
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

**Rate Limiting:** 5 requests per 15 minutes

## Departments (`/api/departments`)
- `GET /api/departments` - Get all active departments (public for registration)
- `POST /api/departments` - Create department (DIRECTOR only)
- `PATCH /api/departments/:id` - Update department (DIRECTOR only)

## Users (`/api/users`)
- `GET /api/users` - Get users (RBAC: Director=all, HOD=department, Employee=self)
- `GET /api/users/:id` - Get user by ID (RBAC applied)
- `POST /api/users` - Create user (RBAC: Director=any, HOD=department employees, Employee=no)
- `PATCH /api/users/:id` - Update user (RBAC applied)
- `DELETE /api/users/:id` - Delete user (DIRECTOR only)

## Tasks (`/api/tasks`)
- `POST /api/tasks` - Create task (with department scope checks)
- `GET /api/tasks` - Get tasks with filters:
  - `status` - Filter by status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
  - `priority` - Filter by priority (LOW, MEDIUM, HIGH)
  - `assignedTo` - Filter by assigned user ID
  - `departmentId` - Filter by department
  - `parentTaskId` - Filter by parent task
  - `startDate` / `endDate` - Date range filter
  - `dueDateStart` / `dueDateEnd` - Due date range filter
  - `overdueOnly` - Only overdue tasks (true/false)
  - `myTasksOnly` - Only user's tasks (true/false)
- `GET /api/tasks/:id` - Get task by ID (with department scope)
- `PATCH /api/tasks/:id` - Update task (with permissions check)
- `POST /api/tasks/:id/updates` - Add task update/comment
- `POST /api/tasks/:id/approve-hod` - HOD approval (HOD/DIRECTOR)
- `POST /api/tasks/:id/approve-director` - Director approval (DIRECTOR)
- `POST /api/tasks/:id/reopen` - Reopen completed/cancelled task

## Approvals (`/api/approvals`)
- `GET /api/approvals/pending` - Get pending approvals (HOD/DIRECTOR)
- `POST /api/approvals/:id/approve` - Approve task (HOD/DIRECTOR)
- `POST /api/approvals/:id/reject` - Reject task (HOD/DIRECTOR)

## Reports (`/api/reports`)
- `GET /api/reports/stats` - Get task statistics (all roles, department scoped)
- `GET /api/reports/by-department` - Get tasks by department (DIRECTOR only)
- `GET /api/reports/user-performance` - Get user performance metrics (HOD/DIRECTOR)
- `GET /api/reports/summary` - Get summary report:
  - Query params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)
  - Returns: overall task counts, department completion %, overdue count, top pending tasks
  - RBAC: Director=all, HOD=department, Employee=own tasks

## Diary (`/api/diary`)
- `POST /api/diary` - Create diary entry (owner = current user)
- `GET /api/diary` - Get all diary entries (only owner's entries):
  - Query params: `search` (text search on title/content), `startDate`, `endDate`
- `GET /api/diary/:id` - Get specific diary entry (only if owner)
- `PATCH /api/diary/:id` - Update diary entry (only if owner)
- `DELETE /api/diary/:id` - Delete diary entry (only if owner)

**Privacy:** Strict - only owner can access their diary entries

## Daily Plan (`/api/daily-plan`)
- `POST /api/daily-plan` - Create daily plan task:
  - Automatically sets: `priority=HIGH`, `isDailyPlan=true`, `startDate=selected date`
- `GET /api/daily-plan` - Get daily plan tasks:
  - Query param: `date` (YYYY-MM-DD, defaults to today)
  - Returns: grouped by department and status

## RBAC Rules

### DIRECTOR
- Full access to all departments and data
- Can create, read, update, and delete any user or task
- Can view all reports and statistics
- Can approve/reject any task

### HOD (Head of Department)
- Access limited to their own department
- Can manage users and tasks within their department
- Can approve/reject tasks in their department
- Can view department-specific reports
- Cannot change user roles or departments

### EMPLOYEE
- Limited access to their own tasks
- Can view and update tasks assigned to them
- Can create tasks (assigned to themselves or others in same department)
- Cannot access user management or approval features
- Can only access their own diary entries

## Error Handling

All endpoints return consistent error format:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

