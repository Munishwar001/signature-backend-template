import mongoose from 'mongoose';
const OtpSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Template" 
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL

const model  = mongoose.model("Otp", OtpSchema);
export default model ; 