/// <reference types="vite/client" />

// Node process shim — tool files under src/lib/mcp/ execute inside the
// generated Supabase Edge Function (Deno) at runtime; this declaration only
// keeps the Vite typecheck happy.
declare const process: { env: Record<string, string | undefined> };
