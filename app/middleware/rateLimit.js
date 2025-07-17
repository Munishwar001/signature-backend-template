import rateLimit from "express-rate-limit";
import express from "express";
const router = express.Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 429,
    message: "Too many requests from this IP. Please try again later.",
  },
});

export default apiLimiter;
