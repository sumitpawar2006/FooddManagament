import { allowMethods, HttpError, publicError, readBody, send } from "../../server/http.js";
import { database, requireAdmin } from "../../server/supabase.js";

const allowedStatuses = new Set(["confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]);

export default async function handler(request, response) {
  if (!allowMethods(request, response, ["PATCH"])) return;
  try {
    await requireAdmin(request);
    const body = readBody(request);
    const reference = String(body.reference || "").trim().toUpperCase();
    if (!/^FOG-[A-F0-9]{8}$/.test(reference)) throw new HttpError(400, "Invalid order reference.");
    if (!allowedStatuses.has(body.orderStatus)) throw new HttpError(400, "Invalid order status.");

    const rows = await database(`orders?reference=eq.${encodeURIComponent(reference)}`, {
      method: "PATCH",
      body: { order_status: body.orderStatus, updated_at: new Date().toISOString() }
    });
    if (!rows?.length) throw new HttpError(404, "Order not found.");
    return send(response, 200, { order: rows[0] });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
