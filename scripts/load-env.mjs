/* Reads apps/accounts/.env.local into the environment, then hands back one
   variable at a time with a message when it is not there.

   These smoke tests run as `node scripts/<name>.mjs` — no shell gymnastics, no
   dotenv dependency — so the file is loaded here rather than by the runner.
   `requireEnv` exists because the alternative was what these scripts used to
   do: the live Pusher channel secrets and the Beams primary key pasted into the
   source, where they were committed and readable by anyone who cloned the repo.
   A missing variable now stops the run with a line that says which one and
   where it belongs, instead of signing a request the service rejects twenty
   lines later. */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of ['.env.local', '.env']) {
  const path = join(root, file);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

/** A variable that must be present, or the run stops naming it. */
export function requireEnv(name) {
  const value = process.env[name];
  if (value) return value;
  console.error(
    `${name} is not set. Put it in apps/accounts/.env.local — apps/accounts/.env.example lists every one this repo expects.`,
  );
  process.exit(1);
}

/* The five Channels apps this repo publishes to, as one table the callers read.
   The label is the only thing left in the source: which app is which is public,
   but the credentials that address it are not, so all four of those come from
   the environment. Order matches PUSHER_*_<NAME> so a missing variable names
   itself in the error above. */
const APP_NAMES = ['PRIMARY', 'SECONDARY', 'TERTIARY', 'AP2', 'AP4'];

/** @returns {Array<[string, string, string, string, string]>} label, id, key, secret, cluster */
export const pusherApps = () =>
  APP_NAMES.map((suffix) => [
    suffix.toLowerCase(),
    requireEnv(`PUSHER_APP_ID_${suffix}`),
    requireEnv(`PUSHER_KEY_${suffix}`),
    requireEnv(`PUSHER_SECRET_${suffix}`),
    requireEnv(`PUSHER_CLUSTER_${suffix}`),
  ]);

/** Beams publishes web-push with the instance id in the URL and the primary key
    in a header. Neither is guessable and both were in the source. */
export const beams = () => ({
  instanceId: requireEnv('BEAMS_INSTANCE_ID'),
  primaryKey: requireEnv('BEAMS_PRIMARY_KEY'),
});