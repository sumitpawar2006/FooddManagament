import { randomBytes } from "node:crypto";
import { HttpError } from "./http.js";

export const meals = Object.freeze([
  {
    id: "ghar-ka-veg",
    name: "Ghar Ka Veg",
    pricePaisa: 9900,
    type: "Vegetarian",
    description: "Two rotis, seasonal sabzi, dal, rice, salad, and a little something sweet.",
    image: "/assets/web/ghar-ka-veg-v2.webp",
    tags: ["Balanced", "Everyday"]
  },
  {
    id: "homestyle-non-veg",
    name: "Homestyle Non-Veg",
    pricePaisa: 14900,
    type: "Non-vegetarian",
    description: "Chicken curry, dal, rice, two rotis, fresh salad, and the day’s accompaniment.",
    image: "/assets/web/non-veg-thali-v2.webp",
    tags: ["High protein", "Comfort food"]
  },
  {
    id: "south-indian-box",
    name: "South Indian Box",
    pricePaisa: 11900,
    type: "Vegetarian",
    description: "A rotating combination of dosa, idli, vada, sambar, chutney, and rice.",
    image: "/assets/web/south-indian-v2.webp",
    tags: ["Regional", "Light"]
  },
  {
    id: "light-and-fit",
    name: "Light & Fit",
    pricePaisa: 12900,
    type: "Vegetarian",
    description: "Less oil, more greens: two rotis, dal, a dry sabzi, salad, and brown rice.",
    image: "/assets/web/light-fit-v2.webp",
    tags: ["Less oil", "Wholesome"]
  }
]);

export const frequencies = Object.freeze({
  "one-time": { label: "One-time", mealCount: 1 },
  weekly: { label: "Weekly", mealCount: 6 },
  monthly: { label: "Monthly", mealCount: 26 }
});

export const deliveryWindows = Object.freeze({
  lunch: "Lunch · 12:00–2:00 PM",
  dinner: "Dinner · 7:00–9:00 PM"
});

function requiredText(value, field, maxLength) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) throw new HttpError(400, `${field} is required.`);
  if (text.length > maxLength) throw new HttpError(400, `${field} is too long.`);
  return text;
}

export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const normalized = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (normalized.length !== 10) throw new HttpError(400, "Enter a valid 10-digit mobile number.");
  return normalized;
}

export function buildOrder(payload) {
  const meal = meals.find((item) => item.id === payload.mealId);
  if (!meal) throw new HttpError(400, "Choose a valid meal.");

  const frequency = frequencies[payload.frequency];
  if (!frequency) throw new HttpError(400, "Choose a valid order frequency.");

  const deliveryWindow = deliveryWindows[payload.deliveryWindow];
  if (!deliveryWindow) throw new HttpError(400, "Choose a valid delivery window.");

  const quantity = Number(payload.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new HttpError(400, "Quantity must be between 1 and 10.");
  }

  const paymentMethod = payload.paymentMethod === "razorpay" ? "razorpay" : payload.paymentMethod === "cod" ? "cod" : null;
  if (!paymentMethod) throw new HttpError(400, "Choose a valid payment method.");

  const reference = `FOG-${randomBytes(4).toString("hex").toUpperCase()}`;
  const amountPaisa = meal.pricePaisa * frequency.mealCount * quantity;

  return {
    reference,
    customer_name: requiredText(payload.customerName, "Full name", 100),
    phone: normalizePhone(payload.phone),
    address: requiredText(payload.address, "Delivery address", 500),
    meal_id: meal.id,
    meal_name: meal.name,
    unit_price_paisa: meal.pricePaisa,
    quantity,
    frequency: payload.frequency,
    frequency_label: frequency.label,
    meal_count: frequency.mealCount,
    delivery_window: payload.deliveryWindow,
    delivery_window_label: deliveryWindow,
    amount_paisa: amountPaisa,
    currency: "INR",
    payment_method: paymentMethod,
    payment_status: paymentMethod === "cod" ? "cod_pending" : "pending",
    order_status: paymentMethod === "cod" ? "confirmed" : "payment_pending"
  };
}

export function publicOrder(order) {
  return {
    reference: order.reference,
    customerName: order.customer_name,
    phoneLast4: order.phone?.slice(-4),
    mealId: order.meal_id,
    mealName: order.meal_name,
    quantity: order.quantity,
    frequency: order.frequency,
    frequencyLabel: order.frequency_label,
    mealCount: order.meal_count,
    deliveryWindow: order.delivery_window,
    deliveryWindowLabel: order.delivery_window_label,
    amountPaisa: order.amount_paisa,
    currency: order.currency,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    createdAt: order.created_at
  };
}
