const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

module.exports = (app) => {
  // Initialize Passport BEFORE configuring strategies
  app.use(passport.initialize());

  // JWT Strategy for API authentication - MUST BE FIRST
  passport.use('jwt', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    passReqToCallback: false // Changed to false as we don't need req in this strategy
  }, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id).select('-password');
      
      if (user && user.isActive) {
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
    passport.use('github', new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // FIXED: Use correct callback URL with /api prefix
      callbackURL: "/api/auth/github/callback",
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
  } else {
    console.warn('GitHub OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use('google', new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // FIXED: Use correct callback URL with /api prefix
      callbackURL: "/api/auth/google/callback",
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
  } else {
    console.warn('Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
  }

  // Serialize/Deserialize user for session (though we're using stateless JWT)
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

  console.log('Passport strategies configured successfully:', {
    jwt: true,
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
};