//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
const port = 3000;
const findOrCreate=require('mongoose-findorcreate')

const GoogleStrategy = require('passport-google-oauth20').Strategy;

// requiring session passport passport local and passport
const session = require('express-session')
const passport=require('passport')
const passportLocalMongoose=require('passport-local-mongoose')

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.set("view engine", "ejs");
app.use(express.static("public"));

// session is added

app.use(session({
  secret:"Our little Secret!",
  resave:false,
  saveUninitialized:false
}))

// passport middle ware
app.use(passport.initialize());
app.use(passport.session())

mongoose
  .connect("mongodb://0.0.0.0:27017/userDB")
  .then(() => {
    console.log("DB connection established");
  })
  .catch((err) => {
    console.log("failed to connect" + err);
  });

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
  done(null,user.id)
})

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL:"http://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", passport.authenticate("google", {
  successRedirect: "/secrets",
  failureRedirect: "/login" // Redirect to login page if authentication fails
}));



app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});
app.get('/secrets',(req,res)=>{
 if(req.isAuthenticated()){
  res.render('secrets')
 }
 else{
  res.redirect('login')
 }
})

app.get('/logout',(req,res)=>{
  req.logOut(function(err){
    if(err){
      console.log(err)
    }
    else{
      res.redirect('/')
    }
  })

})

app.post("/register", (req, res) => {

  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect('/register')
    }
    else{
      console.log('here')
      passport.authenticate('local')(req,res,function(){
        res.redirect('/secrets')
      })
    }
  })
});

app.post('/login',(req,res)=>{
  const user= new User({
    username:req.body.username,
    password:req.body.password
  })
   req.logIn(user,function(err){
    if(err){
      console.log(err)
    }
    else{
      passport.authenticate('local')(req,res,function(){
        res.redirect('/secrets')
      })
    }
   })
})
// server configuration
app.listen(port, () => {
  console.log("welcome");
});
