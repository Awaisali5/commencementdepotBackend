require("dotenv").config();
const testEmail= async (req, res) => {
    try {
      await transporter.sendMail({
        from: {
          name: "Commencement Depot",
          address: process.env.EMAIL_USER,
        },
        to: process.env.EMAIL_USER,
        subject: "Test Email",
        html: "<h1>Test Email</h1><p>This is a test email from your server.</p>",
      });
      res.json({ success: true, message: "Test email sent successfully" });
    } catch (error) {
      console.error("Test email error:", error);
      res
        .status(500)
        .json({ error: "Failed to send test email", details: error.message });
    }
  };

  module.exports = {testEmail}