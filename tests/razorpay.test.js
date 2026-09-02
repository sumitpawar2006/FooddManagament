import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.RAZORPAY_KEY_ID = "rzp_test_example";
process.env.RAZORPAY_KEY_SECRET = "test_secret_value";
process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret_value";

const { verifyPaymentSignature, verifyWebhookSignature } = await import("../server/razorpay.js");

test("valid Razorpay payment signature is accepted", () => {
  const orderId = "order_example";
  const paymentId = "pay_example";
  const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  assert.equal(verifyPaymentSignature({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, signature }), true);
});

test("tampered payment signature is rejected", () => {
  assert.equal(verifyPaymentSignature({ razorpayOrderId: "order_example", razorpayPaymentId: "pay_example", signature: "wrong" }), false);
});

test("valid webhook signature is accepted", () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, signature), true);
});
