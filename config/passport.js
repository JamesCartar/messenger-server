require('dotenv').config();

var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
const passport = require('passport');
const userModel = require('../models/User.js');
const googleSettingModel = require('../models/Google.js');


const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;



passport.use(new GoogleStrategy({
    clientID: '926975252781-lga15dega0ek15g2sglfad9g137vktp9.apps.googleusercontent.com',//GOOGLE_CLIENT_ID,
    clientSecret: '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',//GOOGLE_CLIENT_SECRET,
    callbackURL: "https://aptm-b.ethical-digit.com/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    const userData = {
        name: profile._json.name,
        email: profile._json.email,
        profileImage: profile._json.picture ? profile._json.picture : null,
        thirdPartyId: profile._json.sub,
        status: 'active',
        thirdParty: 'google'
    };
  
    const userExist = await userModel.findOne({ thirdPartyId: userData.thirdPartyId });
    if(userExist) return done(null, {data: userExist, token: accessToken});
    
    const newUser = new userModel(userData);
    const user = await newUser.save();
    done(null, {data: user, token: accessToken});
  }
));



passport.use(
  new FacebookStrategy(
    {
      clientID: '1110396312866112',
      clientSecret: '36fe8f649be38be22cec5d24da6bf745',
      callbackURL: "https://aptm-b.ethical-digit.com/auth/facebook/callback",
      profileFields: ['id', 'displayName', 'name', 'gender', 'photos', 'email']
    },
    async function (accessToken, refreshToken, profile, done) {
        const userData = {
            name: profile._json.name,
            email: profile._json.email,
            profileImage: profile._json.picture ? profile._json.picture.data.url : null,
            thirdPartyId: profile._json.id,
            status: 'active',
            thirdParty: 'facebook'
        };
        const userExist = await userModel.findOne({ thirdPartyId: userData.thirdPartyId });
        if(userExist) return done(null, {data: userExist, token: accessToken});
        const newUser = new userModel(userData);
        const user = await newUser.save();
        done(null, {data: userData, token: accessToken});
    }
  )
);

// passport.serializeUser((user, done) => {
//   done(null, user);
// });


// passport.deserializeUser(function(data, done) {
//   userModel.findOne({ thirdPartyId: data.thirdPartyId }, function (err, user) { 
//       done(err, user); 
//   });
//   done(null)
// });

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});