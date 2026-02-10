# Testing Guide for TODO Multiuser System

## Overview
This testing suite provides comprehensive phase-by-phase testing for the TODO multiuser backend system.

## Prerequisites
1. Ensure the server is running: `npm start` or `npm run dev`
2. Database should be properly configured and connected
3. All environment variables should be set in `.env` file

## Test Phases

### Phase 1: Health & Database Connectivity
Tests basic server health and database connection.
```bash
node tests/phase1-health.js
```

**Tests:**
- ✅ Health endpoint responds correctly
- ✅ Database connection is established
- ✅ CORS configuration is working

### Phase 2: Authentication
Tests user and admin authentication flows.
```bash
node tests/phase2-auth.js
```

**Tests:**
- ✅ User registration
- ✅ User login with JWT token
- ✅ Admin registration
- ✅ Admin login with JWT token
- ✅ Invalid login attempts are rejected

### Phase 3: Task CRUD Operations
Tests all task-related operations.
```bash
node tests/phase3-tasks.js
```

**Tests:**
- ✅ Create new task
- ✅ Get all tasks
- ✅ Get single task by ID
- ✅ Update task
- ✅ Delete task
- ✅ Unauthorized access is blocked

### Phase 4: Admin & Role-Based Access
Tests admin privileges and role-based access control.
```bash
node tests/phase4-admin.js
```

**Tests:**
- ✅ Admin can get all users
- ✅ Regular users cannot access admin routes
- ✅ Admin can view all organization tasks
- ✅ Admin can update user roles
- ✅ Rate limiting is working

### Phase 5: Security & Notifications
Tests security measures and notification system.
```bash
node tests/phase5-security.js
```

**Tests:**
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ Security headers are present
- ✅ Get notifications
- ✅ Mark notifications as read
- ✅ JWT token validation

## Running All Tests

To run all phases sequentially:
```bash
npm test
```

Or:
```bash
node tests/run-all-tests.js
```

## Test Configuration

Edit `tests/test-config.js` to customize test credentials:
```javascript
{
  baseURL: 'http://localhost:5500',
  testUser: { email, password, name },
  testAdmin: { email, password, name }
}
```

## Expected Output

Each phase will show:
- Individual test results (✅ PASS / ❌ FAIL)
- Overall phase status
- Detailed error messages if tests fail

## Troubleshooting

### Server Not Running
```
Error: connect ECONNREFUSED
```
**Solution:** Start the server with `npm start`

### Authentication Failures
```
❌ User login failed: Invalid credentials
```
**Solution:** Check if user exists or adjust test credentials

### Database Connection Issues
```
❌ PostgreSQL connection failed
```
**Solution:** Verify database credentials in `.env` file

## Notes

- Tests create test users/admins automatically
- Some tests may skip if prerequisites aren't met
- Security tests are non-destructive
- Rate limiting tests may need adjustment based on your configuration

## CI/CD Integration

These tests can be integrated into your CI/CD pipeline:
```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test
```
