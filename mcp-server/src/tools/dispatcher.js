/**
 * Routes MCP tool calls to the right handler:
 * - send_otp / verify_otp → auth handlers
 * - everything else → executor (registry-driven)
 */

import { sendOtp, verifyOtp, issueToken } from "../auth/session.js";
import { executeTool }                    from "./executor.js";
import { success, failure }               from "../helpers.js";

export async function dispatch(toolName, args) {
  try {
    switch (toolName) {
      case "send_otp":   return await handleSendOtp(args);
      case "verify_otp": return await handleVerifyOtp(args);
      default:           return await executeTool(toolName, args);
    }
  } catch (err) {
    console.error(`[Dispatch] Error in ${toolName}:`, err);
    return failure(`Unexpected error: ${err.message}`);
  }
}

async function handleSendOtp({ mobile }) {
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return failure("Please provide a valid 10-digit mobile number.");
  }
  const result = await sendOtp(mobile);
  return success({
    "Status":  "OTP sent successfully",
    "Mobile":  mobile.replace(/(\d{6})(\d{4})/, "XXXXXX$2"),
    ...(result.sandbox ? { "Sandbox OTP": process.env.SANDBOX_OTP || "123456" } : {}),
  });
}

async function handleVerifyOtp({ mobile, otp }) {
  if (!mobile || !otp) {
    return failure("Both mobile number and OTP are required.");
  }
  const result = verifyOtp(mobile, otp);
  if (!result.valid) {
    return failure(result.reason);
  }
  const token = issueToken(mobile);
  return success({
    "Status":  "Authentication successful",
    "Session": token,
    "Note":    "Use this session token for all subsequent tool calls.",
  });
}
