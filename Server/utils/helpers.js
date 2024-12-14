const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };
  
  const formatPrice = (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };
  
  module.exports = { validateEmail, formatPrice };
  