# Quick Start - Testing Your TODO System

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Start the Server
In one terminal:
```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

## Step 3: Run Tests

### Option A: Run All Tests at Once
```bash
npm test
```

### Option B: Run Tests Phase by Phase

**Phase 1 - Health Check:**
```bash
npm run test:phase1
```
This tests if your server is running and database is connected.

**Phase 2 - Authentication:**
```bash
npm run test:phase2
```
This tests user/admin registration and login.

**Phase 3 - Task Operations:**
```bash
npm run test:phase3
```
This tests creating, reading, updating, and deleting tasks.

**Phase 4 - Admin Features:**
```bash
npm run test:phase4
```
This tests admin privileges and role-based access.

**Phase 5 - Security:**
```bash
npm run test:phase5
```
This tests security measures and notifications.

## What to Expect

Each test will show:
```
🧪 PHASE X: Test Name

1️⃣ Testing Feature...
✅ Feature working correctly

═══════════════════════════════════════════════════════
📊 PHASE X RESULTS:
   Feature 1: ✅ PASS
   Feature 2: ✅ PASS
   
   Overall: ✅ PHASE X PASSED
═══════════════════════════════════════════════════════
```

## Common Issues

### "Error: connect ECONNREFUSED"
**Problem:** Server is not running
**Solution:** Start the server with `npm start`

### "Database connection failed"
**Problem:** Database credentials are incorrect
**Solution:** Check your `.env` file

### "User already exists"
**Problem:** Test users already in database (this is OK!)
**Solution:** Tests will continue normally

## Tips

1. **Run tests in order** - Each phase builds on the previous one
2. **Check server logs** - They provide additional debugging info
3. **Clean database** - If tests fail, you may need to clean test data
4. **Environment** - Make sure `.env` file is properly configured

## Next Steps

After all tests pass:
1. Review any warnings in the output
2. Check server logs for any errors
3. Test the frontend application
4. Deploy to production

## Need Help?

- Check `tests/README.md` for detailed documentation
- Review individual test files in `tests/` folder
- Check server logs for detailed error messages
