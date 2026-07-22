import http from "node:http";

const port = Number(process.env.PORT || 5177);
const host = process.env.HOST || "127.0.0.1";
const worker = (await import("../dist/server/index.js")).default;

const readRequestBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
};

const toFetchHeaders = (incomingHeaders) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incomingHeaders)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(name, entry);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
};

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url || "/", `http://${incoming.headers.host || `${host}:${port}`}`);
    const method = incoming.method || "GET";
    const request = new Request(url, {
      method,
      headers: toFetchHeaders(incoming.headers),
      body: method === "GET" || method === "HEAD" ? undefined : await readRequestBody(incoming),
    });
    const response = await worker.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (method === "HEAD" || !response.body) {
      outgoing.end();
      return;
    }
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      outgoing.write(Buffer.from(value));
    }
    outgoing.end();
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end(error instanceof Error ? error.stack || error.message : "Internal server error");
  }
});

server.listen(port, host, () => {
  console.log(`FORA CMP panel running at http://${host}:${port}`);
});
