require("dotenv").config();
const webhook =  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  
    // Handle the event
    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log("💰 Payment succeeded:", paymentIntent.id);
  
          // Send success email if we have customer email
          if (paymentIntent.receipt_email) {
            try {
              await transporter.sendMail({
                from: {
                  name: "UniStore",
                  address: process.env.EMAIL_USER,
                },
                to: paymentIntent.receipt_email,
                subject: "Payment Successful!",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #1e293b; text-align: center;">Payment Successful!</h1>
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
                      <p style="margin: 10px 0;">Your payment has been processed successfully.</p>
                      <p style="margin: 10px 0;"><strong>Payment ID:</strong> ${
                        paymentIntent.id
                      }</p>
                      <p style="margin: 10px 0;"><strong>Amount:</strong> $${(
                        paymentIntent.amount / 100
                      ).toFixed(2)}</p>
                      <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    <p style="color: #64748b; text-align: center; margin-top: 20px;">
                      Thank you for your business!
                    </p>
                  </div>
                `,
              });
            } catch (emailError) {
              console.error("Error sending success email:", emailError);
            }
          }
          break;
  
        case "payment_intent.payment_failed":
          const failedPayment = event.data.object;
          console.error("❌ Payment failed:", failedPayment.id);
          break;
  
        case "charge.succeeded":
          const charge = event.data.object;
          console.log("🔋 Charge succeeded:", charge.id);
          break;
  
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
  
      res.json({ received: true });
    } catch (err) {
      console.error(`Error processing webhook: ${err.message}`);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  };
  


module.exports = {webhook}