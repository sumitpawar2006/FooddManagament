import test from "node:test";
import assert from "node:assert/strict";
import { buildOrder, normalizePhone } from "../server/catalog.js";

const validOrder = {
  mealId: "ghar-ka-veg",
  frequency: "weekly",
  deliveryWindow: "lunch",
  quantity: 2,
  paymentMethod: "razorpay",
  customerName: "Sumit Pawar",
  phone: "+91 98765 43210",
  address: "123 Test Street, Pune"
};

test("server calculates amount from the trusted catalog", () => {
  const order = buildOrder(validOrder);
  assert.equal(order.unit_price_paisa, 9900);
  assert.equal(order.meal_count, 6);
  assert.equal(order.amount_paisa, 118800);
  assert.equal(order.phone, "9876543210");
  assert.match(order.reference, /^FOG-[A-F0-9]{8}$/);
});

test("client-supplied prices are ignored", () => {
  const order = buildOrder({ ...validOrder, amountPaisa: 1, unitPrice: 1 });
  assert.equal(order.amount_paisa, 118800);
});

test("invalid quantities and phone numbers are rejected", () => {
  assert.throws(() => buildOrder({ ...validOrder, quantity: 99 }), /Quantity/);
  assert.throws(() => normalizePhone("123"), /10-digit/);
});

test("COD orders start confirmed without being marked paid", () => {
  const order = buildOrder({ ...validOrder, paymentMethod: "cod", frequency: "one-time", quantity: 1 });
  assert.equal(order.payment_status, "cod_pending");
  assert.equal(order.order_status, "confirmed");
  assert.equal(order.amount_paisa, 9900);
});
