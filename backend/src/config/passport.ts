import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        console.log(process.env.GOOGLE_CLIENT_ID);
        console.log(process.env.GOOGLE_CLIENT_SECRET);

        if (!email) {
          return done(new Error("No email found"));
        }

        // Allow only VIT-AP students
        if (!email.endsWith("@vitap.ac.in") && !email.endsWith("@vitapstudent.ac.in")) {
          return done(new Error("Only VIT-AP students can login"));
        }

        let user = await User.findOne({ email });
        const isAdmin = email.toLowerCase() === 'sai.23mic7189@vitapstudent.ac.in';

        if (!user) {
          user = await User.create({
            email,
            name: profile.displayName,
            profileImage: profile.photos?.[0]?.value,
            role: isAdmin ? 'admin' : 'student',
            isVerified: true,
            verifiedStudent: true,
          });
        } else {
          // Update profile image and name if changed
          user.name = profile.displayName;
          user.profileImage = profile.photos?.[0]?.value || user.profileImage;
          if (isAdmin && user.role !== 'admin') {
            user.role = 'admin';
          }
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Serialize user into session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error as Error, null);
  }
});

export default passport;