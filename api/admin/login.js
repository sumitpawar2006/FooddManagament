import { allowMethods, HttpError, publicError, readBody, send } from "../../server/http.js";
import { database, passwordLogin } from "../../server/supabase.js";

export default async function handler(request, response) {
  if (!allowMethods(request, response, ["POST"])) return;
  try {
    const body = readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) throw new HttpError(400, "Email and password are required.");

    const session = await passwordLogin(email, password);
    const query = `admin_profiles?select=user_id,email,role&user_id=eq.${encodeURIComponent(session.user.id)}&role=eq.admin&limit=1`;
    const profiles = await database(query);
    if (!profiles?.length) throw new HttpError(403, "This account is not an administrator.");

    return send(response, 200, {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      user: { id: session.user.id, email: session.user.email }
    });
  } catch (error) {
    const result = publicError(error);
    return send(response, result.status, { error: result.message });
  }
}
