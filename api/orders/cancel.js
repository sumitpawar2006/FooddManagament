import { normalizePhone, publicOrder } from "../../server/catalog.js";
import { allowMethods, HttpError, publicError, readBody, send } from "../../server/http.js";
import { database } from "../../server/supabase.js";

const finalStatuses = new Set(["delivered", "cancelled"]);

export default async function handler(request, response) {
  if (!allowMethods(request, response, ["POST"])) return;
  try {
    const body = readBody(request);
    const reference = String(body.reference || "").trim().toUpperCase();
    if (!/^FOG-[A-F0-9]{8}$/.test(reference)) throw new HttpError(400, "Enter a valid FoodOG order ID.");
    const phone = normalizePhone(body.phone);
    const filter = `reference=eq.${encodeURIComponent(reference)}&phone=eq.${encodeURIComponent(phone)}`;
    const rows = await database(`orders?select=*&${filter}&limit=1`);
    const order = rows?.[0];
    if (!order) throw new HttpError(404, "No order matched that ID and mobile number.");
    if (finalStatuses.has(order.order_status)) throw new HttpError(409, `This order is already ${order.order_status}.`);

    const orderStatus = order.payment_status === "paid" ? "cancellation_requested" : "cancelled";
    const updated = await database(`orders?${filter}`, {
      method: "PATCH",
      body: { order_status: orderStatus, updated_at: new Date().toISOString() }
    });
    return send(response, 200, {
      order: publicOrder(updated?.[0] || { ...order, order_status: orderStatus }),
      message: orderStatus === "cancellation_requested"
        ? "Cancellation requested. The admin must process the payment refund."
        : "Order cancelled."
    });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
