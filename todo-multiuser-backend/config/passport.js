const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? `${process.env.BACKEND_URL || 'https://todo-backend-app-skml.onrender.com'}/api/auth/google/callback`
    : `http://localhost:${process.env.PORT || 5500}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google OAuth callback - Profile:', {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName
    });
    
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;
    const name = profile.displayName;

    if (!email) {
      console.error('❌ No email in Google profile');
      return done(new Error('Email is required'), null);
    }

    // Check if user exists by email
    let user = await User.findByEmail(email);
    console.log('🔍 Existing user found:', !!user);

    if (user) {
      // Update Google ID if not set
      if (!user.google_id) {
        await User.updateById(user.id, { google_id: googleId });
      }
      
      // Existing user - check if needs completion
      if (!user.user_id || !user.password || user.account_status === 'incomplete') {
        console.log('🔄 User needs completion');
        return done(null, { ...user, requiresCompletion: true });
      }
      
      // Active user - proceed with login
      console.log('✅ User is active, proceeding with login');
      return done(null, user);
    } else {
      // New user - create incomplete account
      console.log('🆕 Creating new Google user');
      user = await User.create({
        name,
        email,
        userId: null,
        password: null,
        authProvider: 'google',
        accountStatus: 'incomplete',
        googleId: googleId
      });
      
      console.log('✅ New user created:', user.id);
      return done(null, { ...user, requiresCompletion: true });
    }
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    return done(error, null);
  }
}));

// Required for passport
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, id));

module.exports = passport;