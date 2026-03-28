export function GET(request: Request) {
  const iconUrl = new URL("/icon", request.url);
  return Response.redirect(iconUrl, 307);
}
