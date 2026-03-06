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
