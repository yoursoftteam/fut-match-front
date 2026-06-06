import { writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const openNextDir = join(root, ".open-next")
const assetsDir = join(openNextDir, "assets")

// Create _worker.js that imports from parent directory (OpenNext worker structure)
const worker = `import { handleCdnCgiImageRequest, handleImageRequest } from "../cloudflare/images.js";
import { runWithCloudflareRequestContext } from "../cloudflare/init.js";
import { maybeGetSkewProtectionResponse } from "../cloudflare/skew-protection.js";
import { handler as middlewareHandler } from "../middleware/handler.mjs";

export default {
  async fetch(request, env, ctx) {
    try {
      return await runWithCloudflareRequestContext(request, env, ctx, async () => {
        const response = maybeGetSkewProtectionResponse(request);
        if (response) return response;
        const url = new URL(request.url);
        if (url.pathname.startsWith("/cdn-cgi/image/")) {
          return handleCdnCgiImageRequest(url, env);
        }
        if (url.pathname === \`\${globalThis.__NEXT_BASE_PATH__}/_next/image\${globalThis.__TRAILING_SLASH__ ? "/" : ""}\`) {
          return await handleImageRequest(url, request.headers, env);
        }
        const reqOrResp = await middlewareHandler(request, env, ctx);
        if (reqOrResp instanceof Response) return reqOrResp;
        const { handler } = await import("../server-functions/default/handler.mjs");
        return handler(reqOrResp, env, ctx, request.signal);
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message, stack: (err.stack || "").split("\\\\n").slice(0, 30).join("\\\\n") }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
`

writeFileSync(join(assetsDir, "_worker.js"), worker, "utf-8")
console.log("✓ Created _worker.js that imports from parent directory")
