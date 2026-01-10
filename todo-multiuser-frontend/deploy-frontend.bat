@echo off
echo Committing frontend changes...
cd /d "c:\Users\vrund\OneDrive\Desktop\TO-DO\todo-multiuser-backend\todo-multiuser-frontend"
git add .
git commit -m "Fix API URL to point to Render backend"
git push origin main
echo Done! Frontend changes pushed to GitHub.
pause