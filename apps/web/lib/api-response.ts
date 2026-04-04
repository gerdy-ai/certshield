export function success<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function error(message: string, code: string, status = 400): Response {
  return Response.json({ error: message, code }, { status });
}
