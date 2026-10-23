import { createClient } from "@supabase/supabase-js";

export function resolveSupabaseConfig(env = {}, development = false) {
  const url = env.VITE_SUPABASE_URL?.trim() || "";
  const key =
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.VITE_SUPABASE_ANON_KEY?.trim() ||
    "";
  const isDemo = development && env.VITE_DEMO_MODE === "true" && !url && !key;
  if (isDemo) return { url, key, isDemo: true, isCloud: false, error: "" };

  let error = "";
  if (!url || !key)
    error = "Configure a Project URL e a chave pública do Supabase.";
  else {
    try {
      const parsed = new URL(url);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(
        parsed.hostname,
      );
      if (
        (parsed.protocol !== "https:" &&
          !(local && parsed.protocol === "http:")) ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        !["", "/"].includes(parsed.pathname)
      )
        throw Error();
    } catch {
      error = "A Project URL do Supabase é inválida.";
    }
    if (key.startsWith("sb_secret_")) {
      error = "Use apenas a chave pública publishable ou anon no aplicativo.";
    } else if (!key.startsWith("sb_publishable_")) {
      try {
        const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(
          atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")),
        );
        if (decoded.role !== "anon") throw Error();
      } catch {
        error = "Chave inválida: use a publishable key ou a antiga anon key.";
      }
    }
  }
  return { url, key, isDemo: false, isCloud: !error, error };
}

const config = resolveSupabaseConfig(import.meta.env, import.meta.env?.DEV);
export const isCloud = config.isCloud;
export const isDemo = config.isDemo;
export const configurationError = config.error;
export const supabase = isCloud
  ? createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;