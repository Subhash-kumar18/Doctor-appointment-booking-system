const mongoose = require("mongoose");
const doctorData = require("./doctorData.js");
const Doctor = require("../models/doctor.js");
// const paitentData = require("./patientData.js");
//const Patient = require("../models/patientSchema.js");
// const appointmentData = require("./appointmentData.js");
//const Appointment = require("../models/appointmentSchema.js");

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

const initDB = async () => {
    await Doctor.deleteMany({});
    await Doctor.insertMany(doctorData.data);
    console.log("data was initialized");
};

initDB();