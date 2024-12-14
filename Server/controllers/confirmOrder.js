require("dotenv").config();
const confirmOrder = async (req, res) => {
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
        subject: "Order Confirmation - Your Order #" + orderDetails.orderId,
        html: createOrderEmailTemplate(orderDetails),
      };
  
      try {
        await transporter.sendMail(mailOptions);
        console.log(
          "Order confirmation email sent successfully to:",
          customerEmail
        );
        res.json({ success: true, message: "Order confirmation sent" });
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
  };

  module.exports = {confirmOrder}