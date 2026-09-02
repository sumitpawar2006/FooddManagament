import { allowMethods, publicError, send } from "../../server/http.js";
import { database, requireAdmin } from "../../server/supabase.js";

const allowedStatuses = new Set(["", "payment_pending", "payment_failed", "confirmed", "preparing", "out_for_delivery", "delivered", "cancellation_requested", "cancelled"]);

export default async function handler(request, response) {
  if (!allowMethods(request, response, ["GET"])) return;
  try {
    await requireAdmin(request);
    const status = String(request.query.status || "");
    const selectedStatus = allowedStatuses.has(status) ? status : "";
    const statusFilter = selectedStatus ? `&order_status=eq.${encodeURIComponent(selectedStatus)}` : "";
    const rows = await database(`orders?select=*&order=created_at.desc&limit=100${statusFilter}`);
    return send(response, 200, { orders: rows || [] });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
