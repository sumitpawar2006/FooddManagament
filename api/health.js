import { allowMethods, send } from "../server/http.js";
import { hasDatabaseConfig } from "../server/supabase.js";
import { hasRazorpayConfig } from "../server/razorpay.js";

export default function handler(request, response) {
  if (!allowMethods(request, response, ["GET"])) return;
  const database = hasDatabaseConfig();
  return send(response, 200, {
    ok: true,
    database,
    onlinePayments: database && hasRazorpayConfig(),
    paymentMode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ? "live" : "test",
    businessName: process.env.BUSINESS_NAME || "FoodOG"
  });
}
