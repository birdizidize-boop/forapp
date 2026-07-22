import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const target = resolve(root, "dist", "server", "index.js");
const apiRuntime = resolve(root, "sites-worker", "api-runtime.js");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const files = {};

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    const distRelative = relative(dist, fullPath).split(sep).join("/");

    if (distRelative === "server" || distRelative.startsWith("server/")) continue;
    if (distRelative === ".openai" || distRelative.startsWith(".openai/")) continue;

    if (entry.isDirectory()) {
      await collectFiles(fullPath);
      continue;
    }

    const urlPath = `/${distRelative}`;
    files[urlPath] = {
      contentType: contentTypes[extname(entry.name).toLowerCase()] || "application/octet-stream",
      body: (await readFile(fullPath)).toString("base64"),
    };
  }
}

await collectFiles(dist);
const apiRuntimeSource = await readFile(apiRuntime, "utf8");
await mkdir(dirname(target), { recursive: true });
await writeFile(
  target,
  `const files = ${JSON.stringify(files)};\n\n` +
    `${apiRuntimeSource}\n\n` +
    `const notFound = () => new Response("Not found", { status: 404 });\n\n` +
    `const bytes = (base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));\n\n` +
    `const serve = (path, request) => {\n` +
    `  const file = files[path];\n` +
    `  if (!file) return notFound();\n` +
    `  const headers = new Headers({\n` +
    `    "Content-Type": file.contentType,\n` +
    `    "X-Content-Type-Options": "nosniff",\n` +
    `    "Referrer-Policy": "strict-origin-when-cross-origin",\n` +
    `    "Cache-Control": path === "/index.html" ? "no-cache" : "public, max-age=31536000, immutable",\n` +
    `  });\n` +
    `  return new Response(request.method === "HEAD" ? null : bytes(file.body), { headers });\n` +
    `};\n\n` +
    `export default {\n` +
    `  async fetch(request) {\n` +
    `    const url = new URL(request.url);\n` +
    `    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return handleApiRequest(request);\n` +
    `    const path = url.pathname === "/" ? "/index.html" : url.pathname;\n` +
    `    if (files[path]) return serve(path, request);\n` +
    `    const accept = request.headers.get("Accept") || "";\n` +
    `    if ((request.method === "GET" || request.method === "HEAD") && accept.includes("text/html")) {\n` +
    `      return serve("/index.html", request);\n` +
    `    }\n` +
    `    return notFound();\n` +
    `  },\n` +
    `};\n`,
);
