import { publicOrder } from "../../server/catalog.js";
import { allowMethods, HttpError, publicError, readBody, send } from "../../server/http.js";
import { fetchPayment, verifyPaymentSignature } from "../../server/razorpay.js";
import { database } from "../../server/supabase.js";

export default async function handler(request, response) {
  if (!allowMethods(request, response, ["POST"])) return;
  try {
    const body = readBody(request);
    const reference = String(body.reference || "").trim().toUpperCase();
    const rows = await database(`orders?select=*&reference=eq.${encodeURIComponent(reference)}&limit=1`);
    const order = rows?.[0];
    if (!order || !order.razorpay_order_id) throw new HttpError(404, "Payment order not found.");

    const valid = verifyPaymentSignature({
      razorpayOrderId: order.razorpay_order_id,
      razorpayPaymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature
    });
    if (!valid) throw new HttpError(400, "Payment verification failed.");

    const payment = await fetchPayment(body.razorpayPaymentId);
    if (payment.order_id !== order.razorpay_order_id || payment.amount !== order.amount_paisa) {
      throw new HttpError(400, "Payment details did not match the order.");
    }
    if (payment.status !== "captured") {
      throw new HttpError(409, "Payment is not captured yet. Please wait for confirmation before fulfilment.");
    }

    const updated = await database(`orders?reference=eq.${encodeURIComponent(reference)}`, {
      method: "PATCH",
      body: {
        razorpay_payment_id: payment.id,
        payment_status: "paid",
        order_status: "confirmed",
        updated_at: new Date().toISOString()
      }
    });
    return send(response, 200, { order: publicOrder(updated?.[0] || order) });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
