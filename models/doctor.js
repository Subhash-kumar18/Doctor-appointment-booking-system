const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const doctorSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    specialization: String,
    image: {
       type: String,
       required: true
    },
    experience: {
        type: String,
        required: true
    },
    fee: {
        type: String,
        required: true
    }
});

const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;