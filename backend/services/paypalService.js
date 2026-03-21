import paypal from "@paypal/checkout-server-sdk";

const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
);

const client =  new paypal.core.PayPalHttpClient(environment);

export const payWithPaypal = async (amount) => {

    const request = new paypal.orders.OrdersCreateRequest();

    request.prefer("return=representation");
    request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
            {
                amount: {
                    currency_code: "USD",
                    value: amount,
                },
            },
        ],
    });

    const order = await client.execute(request);

   
    return {
        status : "pending",
        transactionId: order.result.id,
        approvalUrl: order.result.links.find((link) => link.rel === "approve")?.href
    };
};

export const capturePaypalOrder = async (paypalOrderId) => {
  const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
  request.requestBody({});
  const capture = await client.execute(request);
  return capture.result;
};
