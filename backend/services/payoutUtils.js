import axios from "axios";

const consumerKey = process.env.MPESA_CONSUMER_KEY || process.env.CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET || process.env.CONSUMER_SECRET;
const baseUrl = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";

export const getAccessTokenForPayout = async () => {
  if (!consumerKey || !consumerSecret) {
    const err = new Error("Missing M-Pesa consumer key/secret");
    err.code = "MPESA_MISSING_KEYS";
    throw err;
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 15_000,
  });
  return response.data.access_token;
};

