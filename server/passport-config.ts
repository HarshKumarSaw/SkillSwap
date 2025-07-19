import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as AppleStrategy } from 'passport-apple';
import { storage } from './storage';

// Local environment URLs (will work for both local and deployed)
const getCallbackURL = (provider: string) => {
  const baseURL = process.env.NODE_ENV === 'production' 
    ? `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`
    : 'http://localhost:5000';
  return `${baseURL}/api/auth/${provider}/callback`;
};

export function setupPassport() {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: getCallbackURL('google'),
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth callback received for:', profile.emails?.[0]?.value);
        
        const googleProfile = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          profilePicture: profile.photos?.[0]?.value,
          verified: profile.emails?.[0]?.verified || false
        };

        // Try to find existing user by Google ID or email
        let user = await storage.getUserByGoogleId(profile.id);
        
        if (!user && googleProfile.email) {
          // Check if user exists with this email
          user = await storage.getUserByEmail(googleProfile.email);
          
          if (user) {
            // Link Google account to existing user
            await storage.linkGoogleAccount(user.id, googleProfile);
          }
        }

        if (!user) {
          // Create new user with Google account
          user = await storage.createUserWithGoogle(googleProfile);
          
          // Create welcome notification
          await storage.createNotification({
            userId: user.id,
            type: "system",
            title: "Welcome to SkillSwap!",
            content: "Welcome to SkillSwap! You've signed up with Google. Start by adding your skills and browsing other users to find skill exchange opportunities.",
            relatedId: null
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: getCallbackURL('facebook'),
      profileFields: ['id', 'displayName', 'emails', 'photos']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Facebook OAuth callback received for:', profile.emails?.[0]?.value);
        
        const facebookProfile = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          profilePicture: profile.photos?.[0]?.value
        };

        // Try to find existing user by Facebook ID or email
        let user = await storage.getUserByFacebookId(profile.id);
        
        if (!user && facebookProfile.email) {
          // Check if user exists with this email
          user = await storage.getUserByEmail(facebookProfile.email);
          
          if (user) {
            // Link Facebook account to existing user
            await storage.linkFacebookAccount(user.id, facebookProfile);
          }
        }

        if (!user) {
          // Create new user with Facebook account
          user = await storage.createUserWithFacebook(facebookProfile);
          
          // Create welcome notification
          await storage.createNotification({
            userId: user.id,
            type: "system", 
            title: "Welcome to SkillSwap!",
            content: "Welcome to SkillSwap! You've signed up with Facebook. Start by adding your skills and browsing other users to find skill exchange opportunities.",
            relatedId: null
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Facebook OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Apple OAuth Strategy
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID || '',
      callbackURL: getCallbackURL('apple'),
      keyID: process.env.APPLE_KEY_ID || '',
      privateKeyString: process.env.APPLE_PRIVATE_KEY
    }, async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        console.log('Apple OAuth callback received for:', profile.email);
        
        const appleProfile = {
          id: profile.id,
          email: profile.email,
          name: profile.name?.firstName && profile.name?.lastName 
            ? `${profile.name.firstName} ${profile.name.lastName}`
            : 'Apple User'
        };

        // Try to find existing user by Apple ID or email
        let user = await storage.getUserByAppleId(profile.id);
        
        if (!user && appleProfile.email) {
          // Check if user exists with this email
          user = await storage.getUserByEmail(appleProfile.email);
          
          if (user) {
            // Link Apple account to existing user
            await storage.linkAppleAccount(user.id, appleProfile);
          }
        }

        if (!user) {
          // Create new user with Apple account
          user = await storage.createUserWithApple(appleProfile);
          
          // Create welcome notification
          await storage.createNotification({
            userId: user.id,
            type: "system",
            title: "Welcome to SkillSwap!",
            content: "Welcome to SkillSwap! You've signed up with Apple. Start by adding your skills and browsing other users to find skill exchange opportunities.",
            relatedId: null
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Apple OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  return passport;
}