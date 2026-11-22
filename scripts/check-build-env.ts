import { loadEnv } from "vite";

const requiredVariables = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
] as const;

const env = loadEnv("production", process.cwd(), "VITE_");
const missingVariables = requiredVariables.filter((name) => !env[name]?.trim());

if (missingVariables.length > 0) {
  console.error(`Missing required Vite build variables: ${missingVariables.join(", ")}`);
  console.error("Configure the variables for the active build environment without committing their values.");
  process.exit(1);
}

try {
  const url = new URL(env.VITE_SUPABASE_URL);
  const hostedProject = url.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1];

  if (hostedProject && hostedProject !== env.VITE_SUPABASE_PROJECT_ID) {
    console.error("VITE_SUPABASE_URL and VITE_SUPABASE_PROJECT_ID must identify the same Supabase project.");
    process.exit(1);
  }
} catch {
  console.error("VITE_SUPABASE_URL must be a valid URL.");
  process.exit(1);
}

console.log("Supabase build configuration check passed.");
