// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for parsing raw body (needed for webhook)
app.use(
  express.json({
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith("/webhook")) {
        req.rawBody = buf.toString();
      }
    },
  })
);

// CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("Server is ready to send emails");
  }
});

// Helper functions
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const formatPrice = (price) => Number(price || 0).toFixed(2);

const getPaymentStatusStyle = (status) => {
  const styles = {
    Paid: { color: "#059669", bg: "#dcfce7", border: "#86efac" },
    Pending: { color: "#ca8a04", bg: "#fef9c3", border: "#fde047" },
    Failed: { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  };
  return styles[status] || styles["Pending"];
};

// Create order confirmation email template
const createOrderEmailTemplate = (orderDetails) => {
  const items = orderDetails.items || [];
  const shippingAddress = orderDetails.shippingAddress || {};
  const paymentStatus = orderDetails.paymentStatus || "Cash on Delivery";

  // Get payment status styles
  const getStatusStyle = (status) => {
    const styles = {
      Paid: { bg: "#dcfce7", color: "#059669", border: "#86efac", icon: "✓" },
      "Cash on Delivery": {
        bg: "#dbeafe",
        color: "#2563eb",
        border: "#93c5fd",
        icon: "💵",
      },
      Failed: { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", icon: "✕" },
    };
    return styles[status] || styles["Cash on Delivery"];
  };

  const statusStyle = getStatusStyle(paymentStatus);

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f3f4f6; padding: 20px;">
      <!-- Header Section -->
      <div style="background-color: #3b82f6; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 28px;">Order Confirmation</h1>
        <p style="margin: 5px 0 0; font-size: 16px; color: #ffffff;">Thank you for your purchase!</p>
      </div>

      <!-- Order Details -->
      <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="margin-top: 0; font-size: 20px; color: #1f2937;">Order Details</h2>
        
        <!-- Order Summary Box -->
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div>
              <p style="color: #4b5563; font-size: 14px; margin: 0;">Order ID</p>
              <p style="font-family: monospace; font-size: 16px; color: #111827; margin: 4px 0;">${
                orderDetails.orderId
              }</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #4b5563; font-size: 14px; margin: 0;">Total Amount</p>
              <p style="font-size: 18px; font-weight: bold; color: #059669; margin: 4px 0;">$${
                orderDetails.totalAmount
              }</p>
            </div>
          </div>
          
          <!-- Payment Status -->
          <div style="border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #4b5563; font-size: 14px;">Payment Method:</span>
              <span style="
                background-color: ${statusStyle.bg};
                color: ${statusStyle.color};
                border: 1px solid ${statusStyle.border};
                padding: 4px 12px;
                border-radius: 9999px;
                font-size: 14px;
                font-weight: 500;
              ">${statusStyle.icon} ${paymentStatus}</span>
            </div>
            ${
              paymentStatus === "Cash on Delivery"
                ? `
              <div style="margin-top: 10px; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 10px;">
                <p style="margin: 0; color: #4338ca; font-size: 14px;">
                  💡 Please have the exact amount ready at the time of delivery.
                </p>
              </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Items Section -->
        <h3 style="font-size: 18px; color: #1f2937; margin: 20px 0 10px;">Items Ordered</h3>
        ${items
          .map(
            (item) => `
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 5px; font-size: 16px; color: #111827;">${
                item.name
              }</h4>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Quantity: ${item.quantity}
                ${item.selectedSize ? ` • Size: ${item.selectedSize}` : ""}
              </p>
            </div>
            <div style="text-align: right; font-size: 16px; font-weight: bold; color: #111827;">
              $${(item.price * item.quantity).toFixed(2)}
            </div>
          </div>
        `
          )
          .join("")}

        <!-- Shipping Address -->
        <h3 style="font-size: 18px; color: #1f2937; margin: 20px 0 10px;">Shipping Address</h3>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 16px; color: #111827; font-weight: bold;">${
            shippingAddress.fullName
          }</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${
            shippingAddress.addressLine1
          }</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${
            shippingAddress.city
          }, ${shippingAddress.state} ${shippingAddress.zip}</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${
            shippingAddress.country
          }</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">Phone: ${
            shippingAddress.phone
          }</p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:support@example.com" style="color: #2563eb; text-decoration: none;">support@example.com</a></p>
          <p style="margin: 5px 0;">Estimated Delivery Time: 3-5 Business Days</p>
        </div>
      </div>
    </div>
  `;
};



// Order confirmation endpoint
app.post("/confirm-order", async (req, res) => {
  try {
    const { orderDetails, customerEmail } = req.body;

    if (!validateEmail(customerEmail)) {
      console.log("Invalid email:", customerEmail);
      return res.status(400).json({ error: "Invalid email address" });
    }

    console.log("Attempting to send email to:", customerEmail);

    const mailOptions = {
      from: {
        name: "Commencement Depot",
        address: process.env.EMAIL_USER,
      },
      to: customerEmail,
      subject: `Order Confirmation - Order #${orderDetails.orderId} (${
        orderDetails.paymentStatus || "Pending"
      })`,
      html: createOrderEmailTemplate(orderDetails),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(
        "Order confirmation email sent successfully to:",
        customerEmail
      );
      res.json({
        success: true,
        message: "Order confirmation sent",
        paymentStatus: orderDetails.paymentStatus,
      });
    } catch (emailError) {
      console.error("Detailed email error:", {
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        responseCode: emailError.responseCode,
        stack: emailError.stack,
      });
      throw emailError;
    }
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    res.status(500).json({
      error: "Failed to send confirmation email",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Stripe payment intent endpoint
app.post("/create-payment-intent", async (req, res) => {
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
});

// Webhook endpoint
app.post("/webhook", async (req, res) => {
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

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("💰 Payment succeeded:", paymentIntent.id);

        // Send updated confirmation email with paid status
        if (paymentIntent.receipt_email) {
          const updatedOrderDetails = {
            orderId: paymentIntent.metadata.orderId,
            paymentStatus: "Paid",
            paymentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            paymentDate: new Date().toISOString(),
          };

          try {
            await transporter.sendMail({
              from: {
                name: "Commencement Depot",
                address: process.env.EMAIL_USER,
              },
              to: paymentIntent.receipt_email,
              subject: `Payment Confirmed - Order #${updatedOrderDetails.orderId}`,
              html: createOrderEmailTemplate(updatedOrderDetails),
            });
          } catch (emailError) {
            console.error(
              "Error sending payment confirmation email:",
              emailError
            );
          }
        }
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.error("❌ Payment failed:", failedPayment.id);

        // Send payment failed notification
        if (failedPayment.receipt_email) {
          try {
            await transporter.sendMail({
              from: {
                name: "Commencement Depot",
                address: process.env.EMAIL_USER,
              },
              to: failedPayment.receipt_email,
              subject: `Payment Failed - Order #${failedPayment.metadata.orderId}`,
              html: createOrderEmailTemplate({
                ...failedPayment.metadata,
                paymentStatus: "Failed",
              }),
            });
          } catch (emailError) {
            console.error("Error sending payment failure email:", emailError);
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook: ${err.message}`);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Test email endpoint
app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: {
        name: "Commencement Depot",
        address: process.env.EMAIL_USER,
      },
      to: process.env.EMAIL_USER,
      subject: "Test Email",
      html: createOrderEmailTemplate({
        orderId: "TEST-123",
        paymentStatus: "Pending",
        totalAmount: "99.99",
        items: [
          {
            name: "Test Item",
            quantity: 1,
            price: 99.99,
            selectedSize: "M",
          },
        ],
        shippingAddress: {
          fullName: "Test User",
          addressLine1: "123 Test St",
          city: "Test City",
          state: "TS",
          zip: "12345",
          country: "Test Country",
          phone: "123-456-7890",
        },
      }),
    });
    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      error: "Failed to send test email",
      details: error.message,
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Environment check:", {
    STRIPE_KEY: process.env.STRIPE_SECRET_KEY ? "✅ Connected" : "❌ Missing",
    EMAIL: process.env.EMAIL_USER ? "✅ Connected" : "❌ Missing",
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
      ? "✅ Connected"
      : "❌ Missing",
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = app;
