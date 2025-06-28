// src/config/passport.js
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const authService = require('../auth/service');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "https://collab.ytech.space/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await authService.findOrCreateUser(profile, accessToken);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await authService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;