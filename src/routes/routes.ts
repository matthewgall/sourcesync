/*
 * MIT License
 *
 * Copyright (c) 2026 Matthew Gall <me@matthewgall.dev>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import type { Hono } from "hono";
import type { Env } from "../types";

type RouteHandlers = {
  requireAuth: (request: Request, env: Env) => Response | null;
  handleStatus: (env: Env) => Promise<Response>;
  handleData: (env: Env, url: string, keyOverride: string) => Promise<Response>;
  handleRefresh: (request: Request, env: Env) => Promise<Response>;
};

export function registerRoutes(
  app: Hono<{ Bindings: Env }>,
  handlers: RouteHandlers,
): void {
  app.get("/", (c) =>
    c.json({
      ok: true,
      endpoints: {
        status: "GET /status",
        refresh: "POST /refresh",
      },
    }),
  );

  app.get("/status", (c) => handlers.handleStatus(c.env));

  app.get("/data", (c) => {
    const url = c.req.query("url");
    const key = c.req.query("key");
    return handlers.handleData(c.env, url ?? "", key ?? "");
  });

  app.post("/refresh", async (c) => {
    const authResponse = handlers.requireAuth(c.req.raw, c.env);
    if (authResponse) return authResponse;
    return handlers.handleRefresh(c.req.raw, c.env);
  });
}
