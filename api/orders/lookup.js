import { normalizePhone, publicOrder } from "../../server/catalog.js";
import { allowMethods, HttpError, publicError, readBody, send } from "../../server/http.js";
import { database } from "../../server/supabase.js";

function normalizeReference(value) {
  const reference = String(value || "").trim().toUpperCase();
  if (!/^FOG-[A-F0-9]{8}$/.test(reference)) throw new HttpError(400, "Enter a valid FoodOG order ID.");
  return reference;
}

export default async function handler(request, response) {
  if (!allowMethods(request, response, ["POST"])) return;
  try {
    const body = readBody(request);
    const reference = normalizeReference(body.reference);
    const phone = normalizePhone(body.phone);
    const path = `orders?select=*&reference=eq.${encodeURIComponent(reference)}&phone=eq.${encodeURIComponent(phone)}&limit=1`;
    const rows = await database(path);
    if (!rows?.length) throw new HttpError(404, "No order matched that ID and mobile number.");
    return send(response, 200, { order: publicOrder(rows[0]) });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
