require("dotenv").config();
const path = require("path");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));


app.use(express.urlencoded({ extended: true }))



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Create sample array of products
const products = [
  { id: 1, name: "T-shirt", price: 10000 },
  { id: 2, name: "shirt", price: 20000 },
  { id: 3, name: "pants", price: 30000 },
];

// Helper function to calculate the total price
function calculateTotalPrice(items) {
  let totalPrice = 0;
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (product) {
      totalPrice += product.price * item.quantity;
    }
  }
  return totalPrice;
}


const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhooks', express.raw({type: 'application/json'}), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    // Verify the webhook signature using the endpoint secret
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    // Invalid signature
    console.error('Webhook signature verification failed.', err.message);
    return response.status(400).end();
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.async_payment_failed':
      const checkoutSessionAsyncPaymentFailed = event.data.object;
      // Define and call a function to handle the event checkout.session.async_payment_failed
      console.log(checkoutSessionAsyncPaymentFailed);
      break;
    case 'checkout.session.async_payment_succeeded':
      const checkoutSessionAsyncPaymentSucceeded = event.data.object;
      // Define and call a function to handle the event checkout.session.async_payment_succeeded
      console.log(checkoutSessionAsyncPaymentSucceeded);
      break;
    case 'checkout.session.completed':
      const checkoutSessionCompleted = event.data.object;
      // Define and call a function to handle the event checkout.session.completed
      console.log(checkoutSessionCompleted);
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Define and call a function to handle the event payment_intent.succeeded
      console.log(paymentIntent);
      break;
    // Add more cases to handle other event types as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.json({ received: true });
})
app.use(express.json());


app.get("/amount/:amount", async (req, res) => {
  const amount = req.params.amount;

  try {
    const response = await fetch(`${process.env.DOMAIN}/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const { url } = await response.json();
    res.redirect(url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  const { amount } = req.body;

  // Calculate the total price on the server
console.log(amount);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items:[{
      price_data: {
        currency: "inr",
        unit_amount:amount*100,
        product_data: {
          name: "Donation",
          description: 'Donation',
        },
      },
      quantity: 1,
    }] ,
    mode: "payment",
    success_url: `${process.env.DOMAIN}/success`,
    success_url: `${process.env.DOMAIN}/cancel`,
  });

  res.json({url: session.url});
});
app.get("/success", (req, res) => {

  res.send("success");
});

app.get("/cancel", (req, res) => {
  res.send("cancel");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
