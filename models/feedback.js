const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  message: { type: String, required: true },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
