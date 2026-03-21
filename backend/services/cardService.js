import Stripe from "stripe";

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRETE_KEY;
const stripe = new Stripe(stripeSecret);

export const payWithCard = async (amount) => {
    
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(Number(amount)),
        currency : "usd",
        automatic_payment_methods : {
            enabled : true
        }
    })
    return {
        status: "pending",
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
    };
};
