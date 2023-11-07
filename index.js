require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth2").Strategy;

const app = express();
const port = 3000;

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(
  session({
    secret: "Our little Secret!",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect("mongodb://0.0.0.0:27017/newUserDb")
  .then(() => {
    console.log("connected to database");
  })
  .catch((err) => {
    console.log(err);
  });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  secret:String
});

//   adding plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return done(err, user);
      });
    }
  )
);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/secrets", (req, res) => {
  User.find({"secret":{$ne:null}}).then((foundUser)=>{
    res.render('secrets',{usersWithSecrets:foundUser})
  })
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("login");
  }
});
app.post('/submit',(req,res)=>{
    const  submittedSecret=req.body.secrets;
   console.log(req.user._id)
   User.findById(req.user._id).then((foundUser)=>{
    if(foundUser){
        foundUser.secret=submittedSecret;
        foundUser.save().then(()=>{
            res.redirect('/secrets')
        }).catch((err)=>{
            console.log(err)
        })
    }
   }).catch((err)=>{
    console.log(err)
   })

})


app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        console.log("im here");
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});
app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/auth/failure",
  })
);
app.get("/auth/failure", (req, res) => {
  res.send("something went wrong");
});
app.get("/success", (req, res) => {
  let name = req.user.displayName;
  res.send(`hello ${name}`);
});

app.listen(port, () => {
  console.log("logged in to port 3000");
});
