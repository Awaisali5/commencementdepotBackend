require("dotenv").config();
const createPaymentIntent =  async (req, res) => {
    try {
      const { items } = req.body;
  
      if (!items || !items.length) {
        return res.status(400).json({ error: "No items provided" });
      }
  
      const amount = Math.round(items[0].amount * 100);
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          description: items[0].description || "Order payment",
        },
      });
  
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: error.message });
    }
  };

  module.exports= {createPaymentIntent}