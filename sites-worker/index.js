const HTML_FALLBACK_PATH = "/index.html";

const withHeaders = (response) => {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return withHeaders(response);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return withHeaders(response);
    }

    const accept = request.headers.get("Accept") || "";
    if (!accept.includes("text/html")) {
      return withHeaders(response);
    }

    const url = new URL(request.url);
    url.pathname = HTML_FALLBACK_PATH;
    url.search = "";

    return withHeaders(await env.ASSETS.fetch(new Request(url, request)));
  },
};
