const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

const configurePassport = (app) => {
  // Initialize Passport
  app.use(passport.initialize());

  // JWT Strategy for API authentication
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    passReqToCallback: true
  }, async (req, jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id).select('-password');
      
      if (user) {
        // Update last active
        user.updateLastActive();
        return done(null, user);
      }
      
      return done(null, false);
    } catch (error) {
      console.error('JWT Strategy error:', error);
      return done(error, false);
    }
  }));

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/callback",
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this GitHub ID
        let user = await User.findByOAuth('github', profile.id);
        
        if (user) {
          // Update user info from GitHub
          user.avatar = profile.photos?.[0]?.value || user.avatar;
          user.displayName = profile.displayName || user.displayName;
          await user.save();
          return done(null, user);
        }

        // Check if user exists with the same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link GitHub account to existing user
            user.githubId = profile.id;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user
        const username = profile.username || 
          profile.displayName?.replace(/\s+/g, '').toLowerCase() ||
          `user_${profile.id}`;

        user = await User.createFromOAuth('github', {
          id: profile.id,
          username,
          emails: profile.emails,
          displayName: profile.displayName,
          photos: profile.photos
        });

        return done(null, user);
      } catch (error) {
        console.error('GitHub OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findByOAuth('google', profile.id);
        
        if (user) {
          // Update user info from Google
          user.avatar = profile.photos?.[0]?.value || user.avatar;
          user.displayName = profile.displayName || user.displayName;
          await user.save();
          return done(null, user);
        }

        // Check if user exists with the same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user
        const username = profile.emails?.[0]?.value?.split('@')[0] ||
          profile.displayName?.replace(/\s+/g, '').toLowerCase() ||
          `user_${profile.id}`;

        user = await User.createFromOAuth('google', {
          id: profile.id,
          username,
          emails: profile.emails,
          displayName: profile.displayName,
          photos: profile.photos
        });

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Serialize/Deserialize user for session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

module.exports = configurePassport;