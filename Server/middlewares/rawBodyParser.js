const rawBodyParser = (req, res, buf) => {
    if (req.originalUrl.startsWith("/webhook")) {
      req.rawBody = buf.toString();
    }
  };
  
  module.exports = rawBodyParser;
  