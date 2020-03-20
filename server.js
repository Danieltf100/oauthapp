require('dotenv').config();
var path = require('path');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var express = require('express');

// Passport Config
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.DNS + '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    return done(null, { accessToken, refreshToken, profile });
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
})

// Server
var app = express();

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({
    secret: process.env.GOOGLE_CLIENT_SECRET,
    resave: true,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(passport.initialize());
app.use(passport.session());

// Logger Middleware
app.use((req, res, next) => {
    console.log(`Receiving request at`, (new Date()).toISOString());
    next();
});

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/userinfo.profile']
    })
);

app.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login'
    }),
    (req, res) => {
        var hour = 3600000;
        req.session.cookie.expires = new Date(Date.now() + hour);
        req.session.cookie.maxAge = hour;
        res.redirect(`/profile/${req.user.profile.id}`);
    }
);

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/profile/:id', (req, res) => {
    if (req.params.id === undefined || req.user === undefined || req.user.accessToken === undefined) {
        res.redirect('/login');
        return;
    }
    res.render('profile', {
        name: req.user.profile.displayName,
        givenName: req.user.profile.name.givenName,
        picture: req.user.profile._json.picture,
        provider: req.user.profile.provider
    });
});

app.get('/api/me', (req, res) => {
    if (req.user.accessToken === undefined) {
        res.status(401).send({ message: 'Unauthorized' });
        return;
    }
    res.send(req.user.profile);
});

var port = 80 | process.env.PORT;
app.listen(port);
console.log(`Server listen on port ${port}`);
