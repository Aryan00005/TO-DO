# GitHub Codespaces Deployment (FREE)

## What is GitHub Codespaces?
GitHub provides free cloud development environment with 120 hours/month.

## Steps:

### 1. Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/todo-app.git
git push -u origin main
```

### 2. Create Codespace
1. Go to your GitHub repository
2. Click "Code" → "Codespaces" → "Create codespace"
3. Wait for environment to load

### 3. Setup in Codespace
```bash
# Install dependencies
cd todo-multiuser-backend
npm install

# Start MongoDB (if needed)
sudo service mongodb start

# Start backend
npm start

# In another terminal
cd todo-multiuser-frontend
npm install
npm run dev
```

### 4. Make Ports Public
1. In Codespace, go to "Ports" tab
2. Make port 5500 (backend) public
3. Make port 5173 (frontend) public
4. Copy the public URLs

### 5. Update Configuration
Update your frontend axios.ts with the public backend URL

## Pros:
- ✅ Completely FREE (120 hours/month)
- ✅ Full Linux environment
- ✅ MongoDB included
- ✅ Public URLs provided
- ✅ No local setup needed

## Cons:
- ❌ Limited hours per month
- ❌ Temporary URLs