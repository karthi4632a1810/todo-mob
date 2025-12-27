# Sample Users Credentials

This document contains the login credentials for the sample users created in MongoDB.

## HODs (Heads of Department) - 5 users

### 1. Dr. Sarah Johnson
- **Email:** `hod.medicine@mapims.org`
- **Password:** `hod123`
- **Role:** HOD
- **Department:** General Medicine

### 2. Dr. Michael Chen
- **Email:** `hod.pediatrics@mapims.org`
- **Password:** `hod123`
- **Role:** HOD
- **Department:** Pediatrics

### 3. Dr. Priya Sharma
- **Email:** `hod.ortho@mapims.org`
- **Password:** `hod123`
- **Role:** HOD
- **Department:** Orthopedics

### 4. Dr. James Anderson
- **Email:** `hod.cardio@mapims.org`
- **Password:** `hod123`
- **Role:** HOD
- **Department:** Cardiology

## Employees - 9 users

### 1. John Smith
- **Email:** `john.smith@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** General Medicine

### 2. Emily Davis
- **Email:** `emily.davis@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** Pediatrics

### 3. Robert Wilson
- **Email:** `robert.wilson@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** General Medicine

### 4. Lisa Martinez
- **Email:** `lisa.martinez@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** Orthopedics

### 5. David Brown
- **Email:** `david.brown@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** Cardiology

### 6. Maria Garcia
- **Email:** `maria.garcia@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** Emergency Medicine

### 7. Kevin Lee
- **Email:** `kevin.lee@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** Radiology

### 8. Jennifer Taylor
- **Email:** `jennifer.taylor@mapims.org`
- **Password:** `emp123`
- **Role:** EMPLOYEE
- **Department:** Pathology

## Director (Admin)

### Admin Director
- **Email:** `admin@mapims.org`
- **Password:** `admin@123`
- **Role:** DIRECTOR
- **Department:** Information Technology

---

## Quick Reference

| Role | Email | Password |
|------|-------|----------|
| DIRECTOR | admin@mapims.org | admin@123 |
| HOD | hod.medicine@mapims.org | hod123 |
| HOD | hod.pediatrics@mapims.org | hod123 |
| HOD | hod.ortho@mapims.org | hod123 |
| HOD | hod.cardio@mapims.org | hod123 |
| EMPLOYEE | john.smith@mapims.org | emp123 |
| EMPLOYEE | emily.davis@mapims.org | emp123 |
| EMPLOYEE | robert.wilson@mapims.org | emp123 |
| EMPLOYEE | lisa.martinez@mapims.org | emp123 |
| EMPLOYEE | david.brown@mapims.org | emp123 |
| EMPLOYEE | maria.garcia@mapims.org | emp123 |
| EMPLOYEE | kevin.lee@mapims.org | emp123 |
| EMPLOYEE | jennifer.taylor@mapims.org | emp123 |

---

## Notes

- All passwords are hashed in the database using bcrypt
- **IMPORTANT:** Change passwords after first login for security
- To recreate sample users, run: `npm run seed-users`
- To add more users, run: `npm run add-more-users`
- To clear all users, run: `npm run clear-db`

## Current Database Statistics

- **Directors:** 1
- **HODs:** 5
- **Employees:** 9
- **Total Users:** 15

