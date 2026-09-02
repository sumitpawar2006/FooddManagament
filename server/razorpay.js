import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new HttpError(503, "Online payments are not configured yet.");
  return { keyId, keySecret };
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function razorpayRequest(path, options = {}) {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, payload?.error?.description || "The payment provider could not process this request.");
  }
  return payload;
}

export async function createPaymentOrder(order) {
  return razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: order.amount_paisa,
      currency: order.currency,
      receipt: order.reference,
      notes: {
        foodog_reference: order.reference,
        meal: order.meal_name,
        customer_phone: order.phone
      }
    })
  });
}

export async function fetchPayment(paymentId) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
}

export function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return secureEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "Payment webhook secret is not configured.");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return secureEqual(expected, signature);
}

export function paymentPublicKey() {
  return credentials().keyId;
}

export function hasRazorpayConfig() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
