import axios from "axios";
import { getAccessTokenForPayout } from "./payoutUtils.js";

const baseUrl = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";

export const executePayout = async ({ method, amount, currency, destination, payoutRequestId }) => {
  if (method === "manual" || method === "bank") {
    return {
      status: "paid",
      provider: method,
      providerRef: `manual:${String(payoutRequestId)}:${Date.now()}`,
      providerMeta: { destination, currency },
    };
  }

  if (method === "mpesa") {
    const phone = destination?.phone;
    if (!phone) {
      const err = new Error("Missing destination.phone for M-Pesa payout");
      err.code = "MISSING_DESTINATION";
      throw err;
    }

    const initiatorName = process.env.MPESA_B2C_INITIATOR_NAME;
    const securityCredential = process.env.MPESA_B2C_SECURITY_CREDENTIAL;
    const shortcode = process.env.MPESA_B2C_SHORTCODE || process.env.MPESA_SHORTCODE;

    if (!initiatorName || !securityCredential || !shortcode) {
      const err = new Error("M-Pesa B2C payout is not configured (set MPESA_B2C_INITIATOR_NAME, MPESA_B2C_SECURITY_CREDENTIAL, MPESA_B2C_SHORTCODE)");
      err.code = "MPESA_B2C_NOT_CONFIGURED";
      throw err;
    }

    const callbackBaseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    const resultUrl = process.env.MPESA_B2C_RESULT_URL || `${callbackBaseUrl}/api/webhooks/mpesa-b2c`;
    const timeoutUrl = process.env.MPESA_B2C_TIMEOUT_URL || `${callbackBaseUrl}/api/webhooks/mpesa-b2c`;
    const commandId = process.env.MPESA_B2C_COMMAND_ID || "BusinessPayment";

    const token = await getAccessTokenForPayout();

    const payload = {
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: commandId,
      Amount: amount,
      PartyA: shortcode,
      PartyB: phone,
      Remarks: `Payout ${String(payoutRequestId)}`,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
      Occasion: `Payout ${String(payoutRequestId)}`,
    };

    const resp = await axios.post(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20_000,
    });

    const providerRef = resp.data?.OriginatorConversationID || resp.data?.ConversationID || "";

    return {
      status: "processing",
      provider: "mpesa",
      providerRef,
      providerMeta: resp.data || {},
    };
  }

  const err = new Error(`Payout method not implemented: ${method}`);
  err.code = "METHOD_NOT_IMPLEMENTED";
  throw err;
};

