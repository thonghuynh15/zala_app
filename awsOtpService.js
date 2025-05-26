import { baseUrl } from "../utils/config";

export const sendOtpToEmail = async (email) => {
  const response = await fetch(`${baseUrl}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error("Send OTP failed");
  return response.json();
};
