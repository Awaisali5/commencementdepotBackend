const express = require("express");
const { testEmail } = require("../controllers/testEmail");
const {createPaymentIntent} = require('../controllers/paymentIntent');
const {webhook} = require('../controllers/webhook');
const {confirmOrder} = require('../controllers/confirmOrder');



const router = express.Router();

router.get("/test-email", testEmail);
router.post("/confirm-order", confirmOrder);
router.post("/create-payment-intent", createPaymentIntent)
router.post("/webhook",webhook)



module.exports = router;
