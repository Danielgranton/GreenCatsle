import axios from "axios";

const formatTimestamp = (date = new Date()) => {
  const pad2 = (n) => String(n).padStart(2, "0");
  return (
    String(date.getFullYear()) +
    pad2(date.getMonth() + 1) +
    pad2(date.getDate()) +
    pad2(date.getHours()) +
    pad2(date.getMinutes()) +
    pad2(date.getSeconds())
  );
};

const consumerKey = process.env.MPESA_CONSUMER_KEY || process.env.CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET || process.env.CONSUMER_SECRET;
const shortcode = process.env.MPESA_SHORTCODE;
const passkey = process.env.MPESA_PASSKEY;
const baseUrl = "https://sandbox.safaricom.co.ke";

const getAccessToken = async () => {

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data.access_token;
}

export const payWithMpesa = async (amount, phone) => {
  try {

    const formatPhone = (phone) => {
  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+254")) return phone.replace("+", "");
  return phone;
};


const formattedPhone = formatPhone(phone);
    const token = await getAccessToken();
    const timestamp = formatTimestamp();

    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

    const callbackBaseUrl =
      process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

    const response = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${callbackBaseUrl}/api/webhooks/mpesa`,
        AccountReference: "FoodOrder",
        TransactionDesc: "Payment",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("MPESA RESPONSE:", response.data);

    return {
      status: "pending",
      transactionId: response.data.CheckoutRequestID,
    };
  } catch (error) {
    console.error("MPESA ERROR:", error.response?.data || error.message);

    return {
      status: "failed",
      transactionId: null,
    };
  }
};


export const stkQuery = async (checkoutRequestId) => {
  const token = await getAccessToken();
  const timestamp = formatTimestamp();
  const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

  const response = await axios.post(
    `${baseUrl}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    }
  );

  return response.data;
};
