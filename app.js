require('dotenv').config(); // make sure this is at the top
const express = require("express");
const app = express();
const path = require("path");
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const Doctor = require("./models/doctor.js");
const Appointment = require("./models/appointment.js");
const methodOverride = require("method-override");
const Patient = require("./models/patient.js");
const bcrypt = require('bcrypt');
const Feedback = require('./models/feedback.js'); // adjust path as needed

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
const ejsMate = require("ejs-mate");
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`)
});


const MONGO_URL = "mongodb://127.0.0.1:27017/HealthCarePlusCom";

main()
.then(() => {
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}


// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));


// Middleware to make patient available in all views
app.use((req, res, next) => {
  res.locals.loggedIn  = !!req.session.patient;
  res.locals.patient   = req.session.patient || {};
  next();
});


// Home
app.get('/', async (req, res) => {
  try {
    // Check if a patient is logged in (from session)
    if (req.session.patientId) {
      const patient = await Patient.findById(req.session.patientId);
      if (patient) {
        return res.render('listings/home.ejs', { patient });
      }
    }

    // If not logged in, render home without patient info
    res.render('listings/home.ejs');
  } catch (err) {
    res.status(500).render('listings/serverError.ejs');
  }
});



// Feedback
app.get("/footer/feedback", (req, res) => {
  res.render("listings/feedback.ejs");
})

// Register
app.get("/register", (req, res) => {
  res.render("listings/register.ejs");
})

app.post('/register', async (req, res) => {
  const { name, email, phone, dob, password} = req.body;

  try {
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(409).render('listings/patientExists.ejs');
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const newPatient = new Patient({
      name,
      email,
      phone,
      dob,
      password: hashedPassword
    });

    await newPatient.save();

    req.session.patient = { name, email };
    res.render('listings/registrationSuccessful.ejs', { patient: req.session.patient });
  } catch (err) {
    res.status(500).render('listings/registrationFailed.ejs');
  }
});


// Login
app.get("/login", (req, res) => {
  res.render("listings/login.ejs");
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(404).render('listings/noPatientFound.ejs');
    }

    // ✅ Compare entered password with hashed password
    const isMatch = await bcrypt.compare(password, patient.password);
    // Simple string comparison (replace with bcrypt for real security)
    if (!isMatch) {
      req.session.patient = { id:patient.id, email: patient.email, name: patient.name };
       return res.render('listings/loginSuccess.ejs', { patient: req.session.patient });
    } else {
      return res.render('listings/loginFail.ejs');
    }
  } catch (err) {
    console.error(err);
    res.status(500).render('listings/serverError.ejs');
  }
});


// Doctor Route
app.get("/doctor", async (req, res) => {
  const allDoctors = await Doctor.find({});
  res.render("listings/doctor.ejs", {allDoctors});
});


let isPatientLoggedIn = function (req, res, next) {
  if (req.session.patient) {
    next(); // Patient is logged in, continue
  } else {
    // Store original URL to redirect after login
    req.session.redirectTo = req.originalUrl;
    res.redirect('/login');
  }
}

// Book Appointment Route (GET)
app.get('/book/:_id', isPatientLoggedIn, async (req, res) => {
  const doctor = await Doctor.findById(req.params._id);
   res.render('listings/bookAppointment.ejs', { doctor, patient: req.session.patient });
});

// POST: Handle form submission
app.post('/book', async (req, res) => {
  const { _id, patientName, email, date, time } = req.body;

  const appointment = new Appointment({
    doctor: _id,
    patientName,
    email,
    date,
    time
  });

  await appointment.save();
  res.render('listings/success.ejs', { patientName });
});


// Your Appointments
// Assuming patient email is passed via query or session (simplified here)
app.get('/your-appointments', async (req, res) => {
  const appointments = await Appointment.find({  }).populate('doctor'); 
  res.render('listings/yourAppointments.ejs', { appointments });
});


app.post('/cancel-appointment/:id', async (req, res) => {
  const appointment = await Appointment.findByIdAndDelete(req.params.id);
  res.render('listings/cancelled.ejs', { patientName: appointment.patientName });
});


// Profile Route
// Middleware to check if patient is logged in
function isAuthenticated(req, res, next) {
  if (req.session && req.session.patient) {
    return next();
  }
  res.redirect('/login');
}

// GET Patient Profile Page
app.get('/profile', isAuthenticated, async (req, res) => {
  const patient = await Patient.findById(req.session.patientId);
  res.render('listings/profile.ejs', { patient: req.session.patient });
});

// POST Logout
app.post('/logout', isAuthenticated, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
      return res.redirect('/profile');
    }
    res.clearCookie('connect.sid'); // Clear cookie if using default express-session cookie name
    res.redirect('/login');
  });
});


// Feedback
app.get('/feedback', isPatientLoggedIn, (req, res) => {
  res.render('listings/feedback.ejs', {
    patient: req.session.patient
  }); // render feedback.ejs
});

app.post('/feedback', async (req, res) => {
  console.log(`Checking if user is a patient ${req.session.patient}`)
  if (!req.session.patient) {
    return res.redirect('/login');
  }

  const { message } = req.body;

  try {
    console.log(req.session.patient)
    await Feedback.create({
      patientId: req.session.patient.id,
      name: req.session.patient.name,
      message: message
    });

    res.render('listings/thankyouFeedback.ejs', { patient: req.session.patient });

  } catch (error) {
    console.log(error);
    res.status(500).render("listings/serverError.ejs");
  }
});
