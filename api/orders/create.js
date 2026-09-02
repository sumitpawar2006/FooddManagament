import { buildOrder, publicOrder } from "../../server/catalog.js";
import { allowMethods, publicError, readBody, send } from "../../server/http.js";
import { createPaymentOrder, paymentPublicKey } from "../../server/razorpay.js";
import { database } from "../../server/supabase.js";

export default async function handler(request, response) {
  if (!allowMethods(request, response, ["POST"])) return;

  try {
    const order = buildOrder(readBody(request));
    let checkout = null;

    if (order.payment_method === "razorpay") {
      const providerOrder = await createPaymentOrder(order);
      order.razorpay_order_id = providerOrder.id;
      checkout = {
        key: paymentPublicKey(),
        orderId: providerOrder.id,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
        name: process.env.BUSINESS_NAME || "FoodOG",
        description: `${order.meal_name} · ${order.frequency_label}`
      };
    }

    const rows = await database("orders", { method: "POST", body: order });
    const storedOrder = rows?.[0];
    return send(response, 201, {
      order: publicOrder(storedOrder || order),
      checkout
    });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
