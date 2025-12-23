const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `http://localhost:${process.env.PORT || 9000}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const name = profile.displayName;

    if (!email) {
      return done(new Error('Email is required'), null);
    }

    // Check if user exists by email
    let user = await User.findByEmail(email);

    if (user) {
      // Existing user - check if needs completion
      if (!user.user_id || !user.password || user.account_status === 'incomplete') {
        return done(null, { ...user, requiresCompletion: true });
      }
      
      // Active user - proceed with login
      return done(null, user);
    } else {
      // New user - create incomplete account
      user = await User.create({
        name,
        email,
        userId: null,
        password: null,
        authProvider: 'google',
        accountStatus: 'incomplete'
      });
      
      return done(null, { ...user, requiresCompletion: true });
    }
  } catch (error) {
    return done(error, null);
  }
}));

// Required for passport
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, id));

module.exports = passport;