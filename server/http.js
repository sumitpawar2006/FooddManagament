export function setCommonHeaders(response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

export function send(response, status, payload) {
  setCommonHeaders(response);
  return response.status(status).json(payload);
}

export function allowMethods(request, response, methods) {
  if (methods.includes(request.method)) return true;
  response.setHeader("Allow", methods.join(", "));
  send(response, 405, { error: "Method not allowed." });
  return false;
}

export function readBody(request) {
  if (!request.body) return {};
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch (_error) {
      return {};
    }
  }
  return request.body;
}

export function publicError(error) {
  if (error?.statusCode && error.statusCode < 500) {
    return { status: error.statusCode, message: error.message };
  }
  console.error(error);
  return { status: 500, message: "Something went wrong. Please try again." };
}

export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
