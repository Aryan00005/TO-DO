# 🔐 AUTHENTICATION SYSTEM - COMPLETE DETAILS

## 📋 Authentication Methods Used

Your system uses **3 authentication methods**:

1. ✅ **JWT (JSON Web Token)** - Primary authentication
2. ✅ **bcrypt** - Password hashing
3. ✅ **Google OAuth 2.0** - Social login (via Passport.js)

---

## 1️⃣ JWT Authentication

### **What is JWT?**
JSON Web Token - A secure way to transmit information between client and server as a JSON object.

### **How it works in your system:**

**Code Location:** `todo-multiuser-backend/routes/auth.js` (Line 16-20)

```javascript
const generateToken = (user) => {
  const tokenPayload = { id: user.id };
  return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
};
```

### **Token Structure:**
```
Header.Payload.Signature
```

**Payload contains:**
- User ID
- Expiration time (1 day)

### **Token Verification:**

**Code Location:** `todo-multiuser-backend/middleware/auth.js` (Line 1-37)

```javascript
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};
```

### **How JWT is used:**

1. **Login** → Server generates JWT token
2. **Client stores** token in sessionStorage
3. **Every API request** → Client sends token in Authorization header
4. **Server verifies** token using middleware
5. **Access granted** if token is valid

---

## 2️⃣ Password Hashing (bcrypt)

### **What is bcrypt?**
A password hashing library that uses one-way encryption. Cannot be reversed to get original password.

### **How it works:**

**Code Location:** `todo-multiuser-backend/models/user.js`

```javascript
const bcrypt = require('bcryptjs');

// Hash password before saving
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password during login
const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
```

### **Password Verification:**

**Code Location:** `todo-multiuser-backend/routes/auth.js` (Line 220-230)

```javascript
// Login Route
const isMatch = await User.verifyPassword(password, user.password);
if (!isMatch) {
  return res.status(400).json({ message: 'Invalid credentials.' });
}
```

### **Why bcrypt?**
- ✅ One-way encryption (cannot decrypt)
- ✅ Salt rounds (10) make it slow to crack
- ✅ Industry standard for password security
- ✅ Protects against rainbow table attacks

---

## 3️⃣ Google OAuth 2.0

### **What is OAuth?**
Open Authorization - Allows users to login using their Google account without sharing password.

### **How it works:**

**Code Location:** `todo-multiuser-backend/routes/auth.js` (Line 50-140)

```javascript
// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    const user = req.user;
    const loginData = await handleLoginSuccess(user, res);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${loginData.token}`);
  }
);
```

### **OAuth Flow:**

```
1. User clicks "Login with Google"
   ↓
2. Redirected to Google login page
   ↓
3. User enters Google credentials
   ↓
4. Google verifies and sends user data to our server
   ↓
5. Server creates/finds user in database
   ↓
6. Server generates JWT token
   ↓
7. User redirected back to our app with token
   ↓
8. User is logged in
```

---

## 🔒 Complete Authentication Flow

### **Registration Flow:**

**Code Location:** `todo-multiuser-backend/routes/auth.js` (Line 250-300)

```javascript
router.post('/register', async (req, res) => {
  const { name, userId, email, password, companyCode } = req.body;
  
  // 1. Validate input
  if (!name || !userId || !email || !password || !companyCode) {
    return res.status(400).json({ message: 'All fields required.' });
  }
  
  // 2. Check if user exists
  const existingUser = await User.findByUserId(userId);
  if (existingUser) {
    return res.status(400).json({ message: 'User ID already in use.' });
  }
  
  // 3. Verify company code
  const companyExists = await verifyCompanyCode(companyCode);
  if (!companyExists) {
    return res.status(400).json({ message: 'Invalid company code.' });
  }
  
  // 4. Hash password with bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // 5. Create user (status: pending)
  const user = await User.create({ 
    name, userId, email, 
    password: hashedPassword,
    company: companyCode,
    accountStatus: 'pending'
  });
  
  res.status(201).json({ 
    message: 'Registration successful! Awaiting admin approval.'
  });
});
```

### **Login Flow:**

**Code Location:** `todo-multiuser-backend/routes/auth.js` (Line 310-370)

```javascript
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  
  // 1. Find user by userId or email
  let user = await User.findByUserId(userId);
  if (!user) {
    user = await User.findByEmail(userId);
  }
  
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials.' });
  }
  
  // 2. Verify password using bcrypt
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials.' });
  }
  
  // 3. Check account status
  if (user.account_status !== 'active') {
    return res.status(403).json({ 
      message: 'Account pending approval.' 
    });
  }
  
  // 4. Generate JWT token
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  
  // 5. Return token and user data
  res.json({
    token,
    user: {
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company
    }
  });
});
```

### **Protected Route Access:**

**Code Location:** `todo-multiuser-backend/routes/task.js` (Line 10)

```javascript
const auth = require('../middleware/auth');

// Protected route - requires JWT token
router.post('/', auth, async (req, res) => {
  // req.user is available here (set by auth middleware)
  const task = await Task.create({
    assignedBy: req.user.id,
    ...req.body
  });
  res.json(task);
});
```

---

## 📊 Authentication Summary Table

| Feature | Technology | File Location |
|---------|-----------|---------------|
| Token Generation | JWT | `routes/auth.js` (Line 16-20) |
| Token Verification | JWT | `middleware/auth.js` (Line 1-37) |
| Password Hashing | bcrypt | `models/user.js` |
| Password Verification | bcrypt | `routes/auth.js` (Line 220-230) |
| Google Login | Passport.js + OAuth 2.0 | `routes/auth.js` (Line 50-140) |
| Protected Routes | JWT Middleware | `middleware/auth.js` |

---

## 🎯 VIVA ANSWER

**Professor asks: "What authentication have you used?"**

**Your Answer:**

> "We use **3 authentication methods**:
> 
> **1. JWT (JSON Web Token)** - Our primary authentication. When a user logs in, we generate a JWT token containing their user ID, signed with a secret key, valid for 1 day. This token is sent with every API request in the Authorization header. Our middleware verifies the token before allowing access to protected routes.
> 
> Code: `routes/auth.js` line 16-20 for token generation, `middleware/auth.js` for verification.
> 
> **2. bcrypt** - For password security. We hash all passwords using bcrypt with 10 salt rounds before storing in database. During login, we use bcrypt.compare() to verify the password without ever storing plain text passwords.
> 
> Code: `models/user.js` for hashing, `routes/auth.js` line 220-230 for verification.
> 
> **3. Google OAuth 2.0** - For social login using Passport.js. Users can login with their Google account. Google verifies their identity and sends us their profile data. We then create/find the user in our database and generate a JWT token for them.
> 
> Code: `routes/auth.js` line 50-140 for OAuth flow.
> 
> This multi-layered approach ensures security while providing flexibility for users to choose their preferred login method."

---

## 🔑 Key Security Features

1. ✅ **JWT tokens expire** after 1 day
2. ✅ **Passwords are hashed** with bcrypt (never stored as plain text)
3. ✅ **Salt rounds (10)** make password cracking extremely slow
4. ✅ **Authorization header** with Bearer token
5. ✅ **Middleware protection** on all sensitive routes
6. ✅ **Account status checks** (pending/active/rejected)
7. ✅ **Company isolation** - users only see their company data
8. ✅ **Role-based access** - admin vs user permissions

---

## 📁 Quick Reference

**JWT Token Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Password Hash Example:**
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**Environment Variables:**
```
JWT_SECRET=your_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

**Good luck with your viva! 🚀**
