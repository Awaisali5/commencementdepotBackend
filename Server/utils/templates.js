const createOrderEmailTemplate = (orderDetails) => {
  const items = orderDetails.items || [];
  const shippingAddress = orderDetails.shippingAddress || {};

  const getValue = (value, defaultValue = "") => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f3f4f6; padding: 20px;">
      <!-- Header Section -->
      <div style="background-color: #2563eb; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 28px;">Order Confirmation</h1>
        <p style="margin: 5px 0 0; font-size: 16px; color: #ffffff; ">Thank you for your purchase!</p>
      </div>

      <!-- Order Details -->
      <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="margin-top: 0; font-size: 20px; color: #1f2937;">Order Details</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="color: #4b5563; font-size: 14px; padding: 10px 0;">Order ID</td>
            <td style="text-align: right; font-size: 16px; font-weight: bold; color: #111827;">${getValue(
              orderDetails.orderId,
              "N/A"
            )}</td>
          </tr>
          <tr>
            <td style="color: #4b5563; font-size: 14px; padding: 10px 0;">Total Amount</td>
            <td style="text-align: right; font-size: 16px; font-weight: bold; color: #2563eb;">$${getValue(
              orderDetails.totalAmount,
              "0.00"
            )}</td>
          </tr>
        </table>

        <!-- Items Section -->
        <h3 style="font-size: 18px; color: #1f2937; margin: 20px 0 10px;">Items Ordered</h3>
        ${items
          .map(
            (item) => `
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 5px; font-size: 16px; color: #111827;">${getValue(
                item.name
              )}</h4>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Quantity: ${getValue(
                item.quantity
              )} ${item.selectedSize ? `• Size: ${item.selectedSize}` : ""}</p>
            </div>
            <div style="text-align: right; font-size: 16px; font-weight: bold; color: #111827;">$${getValue(
              item.price * item.quantity,
              "0.00"
            )}</div>
          </div>`
          )
          .join("")}

        <!-- Shipping Address -->
        <h3 style="font-size: 18px; color: #1f2937; margin: 20px 0 10px;">Shipping Address</h3>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 16px; color: #111827; font-weight: bold;">${getValue(
            shippingAddress.fullName
          )}</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${getValue(
            shippingAddress.addressLine1
          )}</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${getValue(
            shippingAddress.city
          )}, ${getValue(shippingAddress.state)} ${getValue(
    shippingAddress.zip
  )}</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">${getValue(
            shippingAddress.country
          )}</p>
          <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">Phone: ${getValue(
            shippingAddress.phone
          )}</p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #6b7280;">
          <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:support@example.com" style="color: #2563eb; text-decoration: none;">support@example.com</a></p>
          <p style="margin: 5px 0;">Estimated Delivery Time: 3-5 Business Days</p>
        </div>
      </div>
    </div>
  `;
};

module.exports= {createOrderEmailTemplate}