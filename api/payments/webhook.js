import { publicError, send } from "../../server/http.js";
import { verifyWebhookSignature } from "../../server/razorpay.js";
import { database } from "../../server/supabase.js";

export const config = { api: { bodyParser: false } };

function rawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return send(response, 405, { error: "Method not allowed." });
  }

  try {
    const raw = await rawBody(request);
    const signature = request.headers["x-razorpay-signature"];
    if (!verifyWebhookSignature(raw, signature)) return send(response, 401, { error: "Invalid webhook signature." });

    const event = JSON.parse(raw.toString("utf8"));
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id) return send(response, 200, { received: true });

    if (event.event === "payment.captured") {
      await database(`orders?razorpay_order_id=eq.${encodeURIComponent(payment.order_id)}`, {
        method: "PATCH",
        body: {
          razorpay_payment_id: payment.id,
          payment_status: "paid",
          order_status: "confirmed",
          updated_at: new Date().toISOString()
        }
      });
    }

    if (event.event === "payment.failed") {
      await database(`orders?razorpay_order_id=eq.${encodeURIComponent(payment.order_id)}`, {
        method: "PATCH",
        body: {
          razorpay_payment_id: payment.id,
          payment_status: "failed",
          order_status: "payment_failed",
          updated_at: new Date().toISOString()
        }
      });
    }
    return send(response, 200, { received: true });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
