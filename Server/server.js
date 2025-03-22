// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

// Log: Starting server configuration
console.log("Initializing server...");

// Middleware for parsing raw body (needed for webhook)
app.use(
    express.json({
        verify: function(req, res, buf) {
            if (req.originalUrl.startsWith("/webhook")) {
                req.rawBody = buf.toString();
                console.log("Raw body received for webhook:", req.rawBody);
            }
        },
    })
);
console.log("Express JSON middleware configured for webhooks.");

// CORS middleware
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"],
//     credentials: true,
//   })
// );

app.use(
    cors({
        origin: ["http://localhost:3000", "https://commencementdepot.com"],
        methods: ["GET", "POST", "UPDATE", "DELETE", "PUT"],
        credentials: true,
    })
);
console.log("CORS middleware initialized with origin: http://localhost:3000");

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

// Log: Verify transporter connection
transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP connection error:", error);
    } else {
        console.log("Server is ready to send emails");
    }
});

// Helper function: Validate email format
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = re.test(String(email).toLowerCase());
    console.log(`Validating email: ${email} -> ${isValid ? "Valid" : "Invalid"}`);
    return isValid;
};

// Test email validation (optional demo)
console.log("Testing email validation:");
validateEmail("test@example.com");
validateEmail("invalid-email");
console.log("Server setup complete.");

// Format price to two decimal places
const formatPrice = (price) => {
    const formattedPrice = Number(price || 0).toFixed(2);
    console.log(`Formatting price: Input = ${price}, Output = ${formattedPrice}`);
    return formattedPrice;
};

// Get styles for payment status
const getPaymentStatusStyle = (status) => {
    const styles = {
        Paid: { color: "#059669", bg: "#dcfce7", border: "#86efac" },
        Pending: { color: "#ca8a04", bg: "#fef9c3", border: "#fde047" },
        Failed: { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
    };
    console.log(`Getting payment style for status: ${status}`);
    return styles[status] || styles["Pending"];
};

// Create order confirmation email template
const createOrderEmailTemplate = (orderDetails) => {
        console.log("Creating order confirmation email template...");
        const items = orderDetails.items || [];
        const shippingAddress = orderDetails.shippingAddress || {};
        const billingAddress = orderDetails.billingAddress || shippingAddress || {};
        const paymentStatus = orderDetails.paymentStatus || "Cash on Delivery";
        const deliveryMethod = orderDetails.deliveryMethod || "home";
        const donation = Number(orderDetails.donation || 0);
        const tax = Number(orderDetails.tax || 0);
        const discount = Number(orderDetails.discount || 0);
        const shippingFee = Number(orderDetails.shippingFee || 0);
        const subtotal = Number(orderDetails.subtotal || 0);
        const actualTotal =
            Number(subtotal) +
            Number(tax) +
            Number(shippingFee) +
            Number(donation) -
            Number(discount);

        console.log("Order Details Received:", JSON.stringify(orderDetails, null, 2));

        // Get payment status styles
        const getStatusStyle = (status) => {
            const styles = {
                Paid: { bg: "#FFEBDA", color: "#E65300", border: "#FF8A3D", icon: "✓" },
                "CARD PAYMENT": {
                    bg: "#FFEBDA",
                    color: "#E65300",
                    border: "#FF8A3D",
                    icon: "💳",
                },
                "Cash on Delivery": {
                    bg: "#FFF4E5",
                    color: "#CC4A00",
                    border: "#FFB27D",
                    icon: "💵",
                },
                "CASH ON DELIVERY": {
                    bg: "#FFF4E5",
                    color: "#CC4A00",
                    border: "#FFB27D",
                    icon: "💵",
                },
                "IN-STORE CASH": {
                    bg: "#FFF9EC",
                    color: "#B54300",
                    border: "#FFD2AD",
                    icon: "💵",
                },
                "IN-STORE CARD": {
                    bg: "#FFF0E0",
                    color: "#D94C00",
                    border: "#FFC299",
                    icon: "💳",
                },
                Failed: { bg: "#FEE2E2", color: "#DC2626", border: "#FCA5A5", icon: "✕" },
            };

            console.log(`Getting status style for: ${status}`);
            return (
                styles[status] || {
                    bg: "#FFF0E0",
                    color: "#D94C00",
                    border: "#FFC299",
                    icon: "📦",
                }
            );
        };

        const statusStyle = getStatusStyle(paymentStatus);
        console.log("Payment status style:", statusStyle);

        const formatPrice = (price) => {
            return typeof price === "number" ?
                price.toFixed(2) :
                Number(price || 0).toFixed(2);
        };

        // Enhanced delivery method function with detailed information
        const getDeliveryMethod = (method) => {
            if (method === "store") {
                return {
                    text: "In-Store Pickup",
                    icon: "🏪",
                    info: "Ready for pickup within 24 hours",
                };
            } else if (method === "uspsground") {
                return {
                    text: "USPS Ground (3-7 Days)",
                    icon: "🚚",
                    info: "Estimated delivery: 3-7 business days",
                };
            } else if (method === "usps2day") {
                return {
                    text: "USPS 2-Day Air",
                    icon: "✈️",
                    info: "Estimated delivery: 2-3 business days",
                };
            } else if (method === "uspsnextday") {
                return {
                    text: "USPS Next Day Air",
                    icon: "🛫",
                    info: "Estimated delivery: 1-2 business days",
                };
            } else {
                return {
                    text: "Home Delivery",
                    icon: "🚚",
                    info: "Estimated delivery: 3-5 business days",
                };
            }
        };

        const deliveryInfo = getDeliveryMethod(deliveryMethod);

        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse: collapse; border-spacing: 0; margin: 0;}
        div, td {padding: 0;}
        div {margin: 0 !important;}
      </style>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:'Segoe UI', Arial, sans-serif;">
      <!-- Email Container -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:650px; margin:0 auto; background-color:#f3f4f6;">
        <tr>
          <td style="padding:20px;">
            <!-- Header Section -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FF6B00; border-radius:8px 8px 0 0;">
              <tr>
                <td align="center" style="padding:30px 20px;">
                  <h1 style="margin:0; font-size:28px; color:#ffffff; font-weight:600;">Order Successfully Placed!</h1>
                  <p style="margin:5px 0 0; font-size:16px; color:#ffffff;">Thank you for your purchase!</p>
                </td>
              </tr>
            </table>

            <!-- Order Details -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#ffffff; border-radius:0 0 8px 8px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding:25px;">
                  <h2 style="margin-top:0; font-size:20px; color:#1f2937;">Order Details</h2>
                  
                  <!-- Order Summary Box -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb; border-radius:6px; border:1px solid #e5e7eb; margin-bottom:20px;">
                    <tr>
                      <td style="padding:20px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
                          <tr>
                            <td width="50%" valign="top">
                              <p style="color:#4b5563; font-size:14px; margin:0;">Order ID</p>
                              <p style="font-family:monospace; font-size:16px; color:#111827; margin:4px 0;">${
                                orderDetails.orderId
                              }</p>
                            </td>
                            <td width="50%" valign="top" align="right">
                              <p style="color:#4b5563; font-size:14px; margin:0;">Total Amount</p>
                              <p style="font-size:18px; font-weight:bold; color:#FF6B00; margin:4px 0;">$${formatPrice(
                                actualTotal
                              )}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Delivery Method - Enhanced with more detailed options -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e5e7eb; margin-top:15px; padding-top:15px;">
                          <tr>
                            <td>
                              <p style="color:#4b5563; font-size:14px; margin:0;">Delivery Method</p>
                            </td>
                            <td align="right">
                              <span style="display:inline-block; background-color:#FFF0E0; color:#E65300; border:1px solid #FFB27D; padding:4px 12px; border-radius:9999px; font-size:14px; font-weight:500;">${
                                deliveryInfo.icon
                              } ${deliveryInfo.text}</span>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding-top:8px;">
                              <p style="margin:0; color:#FF6B00; font-size:14px;">${
                                deliveryInfo.info
                              }</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Payment Status -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e5e7eb; margin-top:15px; padding-top:15px;">
                          <tr>
                            <td>
                              <p style="color:#4b5563; font-size:14px; margin:0;">Payment Method:</p>
                            </td>
                            <td align="right">
                              <span style="display:inline-block; background-color:${
                                statusStyle.bg
                              }; color:${statusStyle.color}; border:1px solid ${
    statusStyle.border
  }; padding:4px 12px; border-radius:9999px; font-size:14px; font-weight:500;">${
    statusStyle.icon
  } ${paymentStatus}</span>
                            </td>
                          </tr>
                        </table>
                        ${
                          paymentStatus === "Cash on Delivery" ||
                          paymentStatus === "CASH ON DELIVERY"
                            ? `
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px;">
                            <tr>
                              <td style="background-color:#FFF4E5; border:1px solid #FFB27D; border-radius:4px; padding:10px;">
                                <p style="margin:0; color:#E65300; font-size:14px;">
                                  💡 Please have the payment ready when your order arrives.
                                </p>
                              </td>
                            </tr>
                          </table>
                        `
                            : ""
                        }
                        ${
                          paymentStatus === "IN-STORE CASH"
                            ? `
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px;">
                            <tr>
                              <td style="background-color:#FFF9EC; border:1px solid #FFD2AD; border-radius:4px; padding:10px;">
                                <p style="margin:0; color:#B54300; font-size:14px;">
                                  💡 Please have the exact amount ready when you pick up your order.
                                </p>
                              </td>
                            </tr>
                          </table>
                        `
                            : ""
                        }
                        
                        <!-- Price Details (matches order success page) -->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e5e7eb; margin-top:15px; padding-top:15px;">
                          <tr>
                            <td colspan="2">
                              <h3 style="margin:0 0 10px 0; font-size:15px; color:#1f2937;">Price Details</h3>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:3px 0; color:#4b5563; font-size:14px;">Subtotal</td>
                            <td align="right" style="padding:3px 0; color:#111827; font-size:14px;">$${formatPrice(
                              subtotal || actualTotal - tax - donation
                            )}</td>
                          </tr>
                          <tr>
                            <td style="padding:3px 0; color:#4b5563; font-size:14px;">Tax</td>
                            <td align="right" style="padding:3px 0; color:#111827; font-size:14px;">$${formatPrice(
                              tax
                            )}</td>
                          </tr>
                          ${
                            shippingFee > 0
                              ? `
                            <tr>
                              <td style="padding:3px 0; color:#4b5563; font-size:14px;">Shipping Fee</td>
                              <td align="right" style="padding:3px 0; color:#111827; font-size:14px;">$${formatPrice(
                                shippingFee
                              )}</td>
                            </tr>
                          `
                              : ""
                          }
                          ${
                            discount > 0
                              ? `
                            <tr>
                              <td style="padding:3px 0; color:#4b5563; font-size:14px;">Discount</td>
                              <td align="right" style="padding:3px 0; color:#FF0000; font-size:14px;">-$${formatPrice(
                                discount
                              )}</td>
                            </tr>
                          `
                              : ""
                          }
                          ${
                            donation > 0
                              ? `
                            <tr>
                              <td style="padding:3px 0; color:#4b5563; font-size:14px;">Donation</td>
                              <td align="right" style="padding:3px 0; color:#3B82F6; font-size:14px;">$${formatPrice(
                                donation
                              )}</td>
                            </tr>
                          `
                              : ""
                          }
                          <tr>
                            <td colspan="2" style="padding-top:8px; margin-top:8px; border-top:1px solid #e5e7eb;"></td>
                          </tr>
                          <tr>
                            <td style="padding:3px 0; color:#111827; font-size:14px; font-weight:bold;">Total</td>
                            <td align="right" style="padding:3px 0; color:#FF6B00; font-size:14px; font-weight:bold;">$${formatPrice(
                              actualTotal
                            )}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Items Section -->
                  <h3 style="font-size:18px; color:#1f2937; margin:20px 0 10px;">Order Summary</h3>
                  ${items
                    .map(
                      (item) => `
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:15px; border:1px solid #e5e7eb; border-radius:6px; background-color:#f9fafb;">
                      <tr>
                        <td style="padding:15px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="80px" valign="top">
                                ${
                                  item.image
                                    ? `<img src="${item.image}" alt="${item.name}" width="80" height="80" style="border-radius:4px; object-fit:cover;">`
                                    : `<div style="width:80px; height:80px; background-color:#e5e7eb; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:10px; text-align:center;">No Image</div>`
                                }
                              </td>
                              <td width="10px"></td>
                              <td valign="top">
                                <h4 style="margin:0 0 5px; font-size:16px; color:#111827;">${
                                  item.name
                                }</h4>
                                <div style="margin-top:8px;">
                                  <p style="margin:0; color:#6b7280; font-size:14px;">
                                    Quantity: ${item.quantity}
                                  </p>
                                  ${
                                    item.selectedSize
                                      ? `<p style="margin:0; color:#6b7280; font-size:14px;">Size: ${item.selectedSize}</p>`
                                      : ""
                                  }
                                </div>
                              </td>
                              <td width="100px" align="right" valign="top">
                                <p style="margin:0; font-size:16px; font-weight:bold; color:#111827;">
                                  $${formatPrice(item.price * item.quantity)}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  `
                    )
                    .join("")}

                  <!-- Shipping Address -->
                  <h3 style="font-size:18px; color:#1f2937; margin:20px 0 10px;">Shipping Address</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb; border-radius:6px; border:1px solid #e5e7eb;">
                    <tr>
                      <td style="padding:15px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td width="50%" valign="top">
                              <p style="margin:0; font-size:16px; color:#111827; font-weight:bold;">${
                                shippingAddress.fullName
                              }</p>
                              <p style="margin:5px 0; color:#4b5563; font-size:14px;">${
                                shippingAddress.addressLine1 || ""
                              }</p>
                              <p style="margin:5px 0; color:#4b5563; font-size:14px;">${
                                shippingAddress.city || ""
                              }${
    shippingAddress.city && shippingAddress.state ? ", " : ""
  }${shippingAddress.state || ""} ${shippingAddress.zip || ""}</p>
                              <p style="margin:5px 0; color:#4b5563; font-size:14px;">${
                                shippingAddress.country || ""
                              }</p>
                            </td>
                            <td width="50%" valign="top" align="right">
                              <p style="margin:0; color:#4b5563; font-size:14px;"><span style="font-weight:bold;">Contact: </span>${
                                shippingAddress.phone || ""
                              }</p>
                              <p style="margin:5px 0; color:#4b5563; font-size:14px;"><span style="font-weight:bold;">Email: </span>${
                                shippingAddress.email || ""
                              }</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Billing Address -->
                  ${
                    billingAddress && Object.keys(billingAddress).length > 0
                      ? `
                    <h3 style="font-size:18px; color:#1f2937; margin:20px 0 10px;">Billing Address</h3>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb; border-radius:6px; border:1px solid #e5e7eb;">
                      <tr>
                        <td style="padding:15px;">
                          ${
                            shippingAddress === billingAddress ||
                            (shippingAddress.fullName ===
                              billingAddress.fullName &&
                              shippingAddress.addressLine1 ===
                                billingAddress.addressLine1 &&
                              shippingAddress.city === billingAddress.city)
                              ? `
                              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                  <td>
                                    <div style="display:flex; align-items:center;">
                                      <span style="display:inline-block; width:16px; height:16px; background-color:#FF6B00; border-radius:4px; margin-right:8px;"></span>
                                      <span style="color:#4b5563; font-size:14px; font-style:italic;">Same as shipping address</span>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              `
                              : `
                              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                  <td width="50%" valign="top">
                                    <p style="margin:0; font-size:16px; color:#111827; font-weight:bold;">${
                                      billingAddress.fullName || ""
                                    }</p>
                                    <p style="margin:5px 0; color:#4b5563; font-size:14px;">${
                                      billingAddress.addressLine1 || ""
                                    }</p>
                                    <p style="margin:5px 0; color:#4b5563; font-size:14px;">${
                                      billingAddress.city || ""
                                    }${
                                  billingAddress.city && billingAddress.state
                                    ? ", "
                                    : ""
                                }${billingAddress.state || ""} ${
                                  billingAddress.zip || ""
                                }</p>
                                    <p style="margin:5px 0; color:#4b5563; font-size:14px;">${
                                      billingAddress.country || ""
                                    }</p>
                                  </td>
                                  <td width="50%" valign="top" align="right">
                                    <p style="margin:0; color:#4b5563; font-size:14px;"><span style="font-weight:bold;">Contact: </span>${
                                      billingAddress.phone || ""
                                    }</p>
                                    <p style="margin:5px 0; color:#4b5563; font-size:14px;"><span style="font-weight:bold;">Email: </span>${
                                      billingAddress.email || ""
                                    }</p>
                                  </td>
                                </tr>
                              </table>
                            `
                          }
                        </td>
                      </tr>
                    </table>
                  `
                      : ""
                  }

                  <!-- Action Buttons -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
                    <tr>
                      <td>
                        <a href="http://localhost:3000/" style="display:block; background-color:#f3f4f6; color:#1f2937; padding:12px 0; border-radius:6px; text-align:center; text-decoration:none; font-weight:500; font-size:16px;">Continue Shopping</a>
                      </td>
                      <td width="20px"></td>
                      <td>
                        <a href="http://localhost:3000/profile/${
                          shippingAddress.email
                        }" style="display:block; background-color:#FF6B00; color:#ffffff; padding:12px 0; border-radius:6px; text-align:center; text-decoration:none; font-weight:500; font-size:16px;">View Orders</a>
                      </td>
                    </tr>
                  </table>

                  <!-- Additional Information -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:30px; border-top:1px solid #e5e7eb; padding-top:20px;">
                    <tr>
                      <td>
                        <p style="margin:0; color:#4b5563; font-size:14px;">Estimated delivery time:</p>
                        <p style="margin:0; color:#FF6B00; font-size:14px; font-weight:500;">${
                          deliveryInfo.info
                        }</p>
                      </td>
                      <td align="right">
                        <p style="margin:0; color:#4b5563; font-size:14px;">Need help?</p>
                        <a href="mailto:info@commencementdepot.com" style="color:#FF6B00; text-decoration:none; font-size:14px; font-weight:500;">info@commencementdepot.com</a>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:30px; border-top:1px solid #e5e7eb; padding-top:20px;">
                    <tr>
                      <td align="center">
                        <p style="margin:5px 0; font-size:14px; color:#6b7280;">Thank you for shopping with Commencement Depot!</p>
                        <p style="margin:15px 0 5px 0; font-size:14px; color:#6b7280;">© 2025 Commencement Depot. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Order confirmation endpoint
app.post("/confirm-order", async (req, res) => {
  try {
    console.log("[INFO] /confirm-order endpoint hit.");
    console.log("Request Body:", JSON.stringify(req.body, null, 2));

    const { orderDetails, customerEmail, emailType } = req.body;

    // Make sure all required properties exist even if they weren't sent
    const enhancedOrderDetails = {
      ...orderDetails,
      donation: orderDetails.donation || 0,
      tax: orderDetails.tax || 0,
      discount: orderDetails.discount || 0,
      shippingFee: orderDetails.shippingFee || 0,
      subtotal:
        orderDetails.subtotal ||
        orderDetails.totalAmount - (orderDetails.tax || 0),
      deliveryMethod: orderDetails.deliveryMethod || "home",
    };

    if (!validateEmail(customerEmail)) {
      console.warn("[WARN] Invalid email provided:", customerEmail);
      return res.status(400).json({ error: "Invalid email address" });
    }

    console.log(
      "[INFO] Valid email detected. Attempting to send email to:",
      customerEmail
    );
    console.log(
      "Enhanced Order Details:",
      JSON.stringify(enhancedOrderDetails, null, 2)
    );

    const mailOptions = {
      from: {
        name: "Commencement Depot",
        address: process.env.EMAIL_USER,
      },
      to: customerEmail,
      subject: `${
        emailType === "seller" ? "[New Order] " : ""
      }Order Confirmation - Order #${enhancedOrderDetails.orderId} (${
        enhancedOrderDetails.paymentStatus || "Pending"
      })`,
      html: createOrderEmailTemplate(enhancedOrderDetails),
    };

    console.log(
      "[DEBUG] Constructed mailOptions:",
      JSON.stringify(mailOptions, null, 2)
    );

    try {
      await transporter.sendMail(mailOptions);
      console.log(
        "[INFO] Order confirmation email sent successfully to:",
        customerEmail
      );
      res.json({
        success: true,
        message: "Order confirmation sent",
        paymentStatus: enhancedOrderDetails.paymentStatus,
      });
    } catch (emailError) {
      console.error("[ERROR] Failed to send email. Detailed email error:", {
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        responseCode: emailError.responseCode,
        stack: emailError.stack,
      });
      throw emailError;
    }
  } catch (error) {
    console.error(
      "[ERROR] Exception in /confirm-order endpoint:",
      error.message
    );
    console.error("[DEBUG] Stack Trace:", error.stack);

    res.status(500).json({
      error: "Failed to send confirmation email",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Add a new endpoint to update order records with donation information
app.post("/update-order", async (req, res) => {
  try {
    console.log("[INFO] /update-order endpoint hit.");
    console.log("Request Body:", JSON.stringify(req.body, null, 2));

    const { orderId, updates } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Here you would add the logic to update the order in your database
    // This is a placeholder - the actual implementation would depend on your database solution
    console.log(`[INFO] Updating order ${orderId} with:`, updates);

    // Simulate a successful update
    res.json({
      success: true,
      message: "Order updated successfully",
      orderId,
      updatedFields: Object.keys(updates),
    });
  } catch (error) {
    console.error(
      "[ERROR] Exception in /update-order endpoint:",
      error.message
    );
    console.error("[DEBUG] Stack Trace:", error.stack);

    res.status(500).json({
      error: "Failed to update order",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Stripe payment intent endpoint - FIXED VERSION
app.post("/create-payment-intent", async (req, res) => {
  console.log("Received request at /create-payment-intent");

  try {
    const { items } = req.body;
    console.log("Request body:", req.body);

    // Validate input
    if (!items || !items.length) {
      console.warn("No items provided in the request");
      return res.status(400).json({ error: "No items provided" });
    }

    const amount = Math.round(items[0].amount * 100);
    console.log(`Calculated amount (in cents): ${amount}`);

    // Create payment intent with IMPORTANT CHANGES
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      // This is the important change - specify capture method as automatic
      capture_method: "automatic",
      // Use payment method types array instead of automatic_payment_methods
      payment_method_types: ["card"],
      // Store description in metadata
      metadata: {
        description: items[0].description || "Order payment",
        source: "COMMENCEMENT DEPOT",
      },
      // Add statement descriptor to help customers recognize the charge
      statement_descriptor: "Commencement Depot",
      // This is what you'll see in your Stripe dashboard
      description:
        "COMMENCEMENT DEPOT - " + (items[0].description || "Order payment"),
      // Set confirm to false to let client handle confirmation
      confirm: false,
    });

    console.log("Payment intent created successfully:", {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      capture_method: paymentIntent.capture_method, // Log this for debugging
    });

    // Send response
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id, // Include ID for tracking
    });
    console.log("Response sent with clientSecret");
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  console.log("🔔 Incoming webhook received");

  try {
    console.log("🔍 Verifying Stripe signature...");
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("✅ Stripe signature verified.");
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📢 Received event type: ${event.type}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("💰 Payment succeeded:", paymentIntent.id);
        console.log("🧾 Payment details:", {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          orderId: paymentIntent.metadata.orderId,
        });

        // Send updated confirmation email with paid status
        if (paymentIntent.receipt_email) {
          console.log(
            "📧 Sending payment confirmation email to:",
            paymentIntent.receipt_email
          );
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
            console.log("✅ Payment confirmation email sent successfully.");
          } catch (emailError) {
            console.error(
              "❌ Error sending payment confirmation email:",
              emailError
            );
          }
        } else {
          console.warn(
            "⚠️ No receipt email found for paymentIntent:",
            paymentIntent.id
          );
        }
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.error("❌ Payment failed:", failedPayment.id);
        console.log("🧾 Failed payment details:", {
          id: failedPayment.id,
          amount: failedPayment.amount / 100,
          orderId: failedPayment.metadata?.orderId,
        });

        // Send payment failed notification
        if (failedPayment.receipt_email) {
          console.log(
            "📧 Sending payment failure email to:",
            failedPayment.receipt_email
          );
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
            console.log("✅ Payment failure email sent successfully.");
          } catch (emailError) {
            console.error(
              "❌ Error sending payment failure email:",
              emailError
            );
          }
        } else {
          console.warn(
            "⚠️ No receipt email found for failed payment:",
            failedPayment.id
          );
        }
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
    console.log("✅ Webhook processing completed successfully.");
  } catch (err) {
    console.error(`❌ Error processing webhook: ${err.message}`);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  console.log(`[Health Check] Request received at ${new Date().toISOString()}`);
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
  console.log(`[Health Check] Response sent successfully`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[Global Error Handler] Error: ${err.message}`);
  console.error(`[Global Error Handler] Stack trace: ${err.stack}`);
  res.status(500).json({
    error: "Something went wrong!",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Test email endpoint
app.get("/test-email", async (req, res) => {
  console.log(
    `[Test Email] Test email request initiated at ${new Date().toISOString()}`
  );
  try {
    console.log(`[Test Email] Sending email to ${process.env.EMAIL_USER}...`);

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
          email: "test@example.com",
        },
        donation: 5.0,
        tax: 8.25,
        discount: 10.0,
        shippingFee: 15.99,
        subtotal: 99.99,
        deliveryMethod: "uspsground",
      }),
    });

    console.log(
      `[Test Email] Email successfully sent to ${process.env.EMAIL_USER}`
    );
    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error(`[Test Email Error] Failed to send email: ${error.message}`);
    res.status(500).json({
      error: "Failed to send test email",
      details: error.message,
    });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `[Request] ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`
  );
  res.on("finish", () => {
    console.log(
      `[Response] ${req.method} ${req.originalUrl} - Status: ${
        res.statusCode
      } - ${new Date().toISOString()}`
    );
  });
  next();
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