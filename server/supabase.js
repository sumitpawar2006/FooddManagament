import { HttpError } from "./http.js";

function environment(name) {
  const value = process.env[name];
  if (!value) throw new HttpError(503, `Server configuration is missing ${name}.`);
  return value;
}

function baseUrl() {
  return environment("SUPABASE_URL").replace(/\/$/, "");
}

async function parseResponse(response) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_error) {
    payload = text;
  }
  if (!response.ok) {
    const message = payload?.message || payload?.msg || payload?.error_description || payload?.error || "Database request failed.";
    throw new HttpError(response.status >= 500 ? 502 : response.status, message);
  }
  return payload;
}

export async function database(path, { method = "GET", body, prefer = "return=representation" } = {}) {
  const serviceKey = environment("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${baseUrl()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return parseResponse(response);
}

export async function passwordLogin(email, password) {
  const anonKey = environment("SUPABASE_ANON_KEY");
  const response = await fetch(`${baseUrl()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return parseResponse(response);
}

export async function authUser(accessToken) {
  const anonKey = environment("SUPABASE_ANON_KEY");
  const response = await fetch(`${baseUrl()}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
  });
  return parseResponse(response);
}

export async function requireAdmin(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Admin sign-in required.");

  const user = await authUser(token);
  const query = `admin_profiles?select=user_id,email,role&user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&limit=1`;
  const profiles = await database(query);
  if (!profiles?.length) throw new HttpError(403, "This account is not an administrator.");
  return { user, profile: profiles[0] };
}

export function hasDatabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
