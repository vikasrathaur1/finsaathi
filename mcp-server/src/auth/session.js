import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET      = process.env.JWT_SECRET || "finsaathi-dev-secret";
const TTL_MINUTES     = parseInt(process.env.SESSION_TTL_MINUTES || "30");
const SANDBOX_OTP     = process.env.SANDBOX_OTP || "123456";

// In-memory OTP store: { mobile → { otp, expiresAt } }
const pendingOtps = new Map();

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(mobile) {
  const otp       = process.env.NODE_ENV === "test" ? SANDBOX_OTP : generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

  pendingOtps.set(mobile, { otp, expiresAt });

  // In production: send via SMS provider. In sandbox: log it.
  console.log(`[OTP] mobile=${mobile} otp=${otp} (sandbox: use ${SANDBOX_OTP})`);

  // TODO: integrate real SMS here
  // await smsProvider.send(mobile, `Your FinSaathi OTP is ${otp}. Valid for 10 minutes.`);

  return { sent: true, sandbox: otp === SANDBOX_OTP };
}

export function verifyOtp(mobile, otp) {
  const record = pendingOtps.get(mobile);
  if (!record) return { valid: false, reason: "No OTP sent for this number" };
  if (Date.now() > record.expiresAt) {
    pendingOtps.delete(mobile);
    return { valid: false, reason: "OTP has expired" };
  }
  // Accept sandbox OTP always
  const matches = otp === record.otp || otp === SANDBOX_OTP;
  if (!matches) return { valid: false, reason: "Incorrect OTP" };

  pendingOtps.delete(mobile);
  return { valid: true };
}

export function issueToken(mobile) {
  const payload = { sub: mobile, jti: uuidv4() };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: `${TTL_MINUTES}m` });
  return token;
}

export function validateToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, mobile: decoded.sub };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}
