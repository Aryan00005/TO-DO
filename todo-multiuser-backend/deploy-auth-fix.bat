@echo off
echo 🚀 Deploying authentication fixes...
echo.

echo 📝 Step 1: Update environment variables on Render dashboard:
echo    - BACKEND_URL=https://todo-backend-app-skml.onrender.com
echo    - FRONTEND_URL=https://dulcet-custard-82202d.netlify.app
echo    - GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
echo    - GOOGLE_CLIENT_SECRET=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
echo    - JWT_SECRET=your-production-jwt-secret-key-here-make-it-long-and-secure-2024
echo.

echo 📊 Step 2: Run database migration in Supabase SQL editor:
echo    Copy and run the contents of fix-database.sql
echo.

echo 🔄 Step 3: Trigger Render deployment...
echo    Push changes to your Git repository to trigger auto-deployment
echo.

echo 🧪 Step 4: Test authentication:
echo    1. Try registering a new user
echo    2. Try logging in with the new user
echo    3. Try Google OAuth login
echo.

echo ✅ Deployment checklist complete!
echo.
echo 🔧 If issues persist, check Render logs for detailed error messages.
pause