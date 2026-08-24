import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APPROVED_PROJECT_REF = "rzosrvenlvhijeckmwyc";
const FORBIDDEN_PROJECT_REFS = new Set(["jlbsoraqnlricbyagxdk", "gwgrwwvaiizfsqaacnhf"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_PATH_PATTERN = /^listings\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.webp$/i;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const DELETE_VERIFY_ATTEMPTS = 20;
const DELETE_VERIFY_DELAY_MS = 500;

const projectRef = process.env.HOSTED_RC_PROJECT_REF?.trim();
const dbUrl = process.env.HOSTED_RC_DB_URL?.trim();
const s3Endpoint = process.env.HOSTED_RC_S3_ENDPOINT?.trim();
const s3Region = process.env.HOSTED_RC_S3_REGION?.trim();
const s3AccessKey = process.env.HOSTED_RC_S3_ACCESS_KEY_ID?.trim();
const s3SecretKey = process.env.HOSTED_RC_S3_SECRET_ACCESS_KEY?.trim();
const shimToken = process.env.HOSTED_RC_SHIM_TOKEN?.trim();
const port = Number(process.env.HOSTED_RC_SHIM_PORT ?? "54329");
const listDelayMs = Number(process.env.HOSTED_RC_LIST_DELAY_MS ?? "0");

if (
  !projectRef ||
  !dbUrl ||
  !s3Endpoint ||
  !s3Region ||
  !s3AccessKey ||
  !s3SecretKey ||
  !shimToken
) {
  throw new Error("Hosted RC shim configuration is incomplete.");
}
if (projectRef !== APPROVED_PROJECT_REF || FORBIDDEN_PROJECT_REFS.has(projectRef)) {
  throw new Error("Hosted RC shim refused a non-dedicated project ref.");
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Hosted RC shim port is invalid.");
}
if (!Number.isFinite(listDelayMs) || listDelayMs < 0 || listDelayMs > 5_000) {
  throw new Error("Hosted RC shim list delay is invalid.");
}

const parsedDbUrl = new URL(dbUrl);
const dbHost = parsedDbUrl.hostname.toLowerCase();
const dbUser = decodeURIComponent(parsedDbUrl.username);
if (!["postgres:", "postgresql:"].includes(parsedDbUrl.protocol)) {
  throw new Error("Hosted RC DB URL must use PostgreSQL.");
}
if (dbHost === `db.${projectRef}.supabase.co`) {
  if (dbUser !== "postgres") throw new Error("Hosted RC direct DB username is invalid.");
} else if (dbHost.endsWith(".pooler.supabase.com")) {
  if (dbUser !== `postgres.${projectRef}`) throw new Error("Hosted RC pooler username is invalid.");
} else {
  throw new Error("Hosted RC DB host is outside the approved Supabase project boundary.");
}

const allowedS3Endpoints = new Set([
  `https://${projectRef}.supabase.co/storage/v1/s3`,
  `https://${projectRef}.storage.supabase.co/storage/v1/s3`,
]);
if (!allowedS3Endpoints.has(s3Endpoint)) {
  throw new Error("Hosted RC S3 endpoint is outside the approved project boundary.");
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function requireServerCredential(request: Request): Response | null {
  const apikey = request.headers.get("apikey");
  const authorization = request.headers.get("authorization");
  if (apikey !== shimToken || authorization !== `Bearer ${shimToken}`) {
    return json({ message: "Forbidden" }, 403);
  }
  if (request.headers.has("origin")) {
    return json({ message: "Browser-origin requests are forbidden." }, 403);
  }
  return null;
}

async function runPsql(sql: string, variables: Record<string, string> = {}): Promise<string> {
  const args = ["psql", dbUrl, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"];
  for (const [key, value] of Object.entries(variables)) {
    args.push("-v", `${key}=${value}`);
  }
  args.push("-f", "-");

  const child = Bun.spawn(args, {
    env: { ...process.env, PGSSLMODE: "require" },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  child.stdin.write(sql);
  child.stdin.end();
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) {
    console.error("Hosted RC shim DB command failed:", stderr.trim().slice(0, 1000));
    throw new Error("Hosted RC shim DB command failed.");
  }
  return stdout.trim();
}

function sourceRcloneEnv(): Record<string, string | undefined> {
  return {
    ...process.env,
    RCLONE_CONFIG_SOURCE_TYPE: "s3",
    RCLONE_CONFIG_SOURCE_PROVIDER: "Other",
    RCLONE_CONFIG_SOURCE_ENDPOINT: s3Endpoint,
    RCLONE_CONFIG_SOURCE_REGION: s3Region,
    RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID: s3AccessKey,
    RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY: s3SecretKey,
    RCLONE_CONFIG_SOURCE_FORCE_PATH_STYLE: "true",
  };
}

async function runRclone(
  args: string[],
): Promise<{ code: number; stdout: Uint8Array; stderr: string }> {
  const child = Bun.spawn(["rclone", ...args], {
    env: sourceRcloneEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdoutBuffer, stderr, code] = await Promise.all([
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, stdout: new Uint8Array(stdoutBuffer), stderr };
}

async function objectExists(objectPath: string): Promise<boolean> {
  const separatorIndex = objectPath.lastIndexOf("/");
  if (separatorIndex <= 0 || separatorIndex === objectPath.length - 1) {
    throw new Error("Hosted RC object path could not be split for verification.");
  }
  const parent = objectPath.slice(0, separatorIndex);
  const basename = objectPath.slice(separatorIndex + 1);
  const result = await runRclone(["lsf", `source:listing_photos/${parent}`, "--files-only"]);
  if (result.code !== 0) {
    throw new Error(`S3 object verification failed: ${result.stderr.slice(0, 500)}`);
  }
  const names = new TextDecoder()
    .decode(result.stdout)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  return names.includes(basename);
}

function requireUuid(value: string | null, context: string): string {
  if (!value || !UUID_PATTERN.test(value)) throw new Error(`${context} is not a UUID.`);
  return value.toLowerCase();
}

function listingIdFromUrl(url: URL): string | null {
  const filter = url.searchParams.get("id");
  if (!filter) return null;
  if (!filter.startsWith("eq.")) throw new Error("Only exact listing id filters are allowed.");
  return requireUuid(filter.slice(3), "listing id");
}

function requireObjectPath(value: string): string {
  const match = OBJECT_PATH_PATTERN.exec(value);
  if (!match) throw new Error("Storage object path is outside the canonical listing path.");
  requireUuid(match[1] ?? null, "object listing id");
  requireUuid(match[2] ?? null, "object photo id");
  return value.toLowerCase();
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const parsed = await request.json();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected JSON object body.");
  }
  return parsed as Record<string, unknown>;
}

function stringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${key} is required.`);
  return value;
}

async function getListings(url: URL): Promise<Response> {
  const listingId = listingIdFromUrl(url);
  if (!listingId && listDelayMs > 0) await Bun.sleep(listDelayMs);
  const where = listingId ? "where id = :'listing_id'::uuid" : "";
  const variables = listingId ? { listing_id: listingId } : {};
  const result = await runPsql(
    `begin;\nset local role service_role;\nselect coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.id desc), '[]'::jsonb)::text\nfrom (\n  select id, title, seller_display_name, status, contact_channel, contact_e164, created_at, published_at, expires_at, unpublished_at\n  from public.listings\n  ${where}\n  order by created_at desc, id desc\n  limit 20\n) x;\ncommit;`,
    variables,
  );
  return new Response(result || "[]", { headers: { "content-type": "application/json" } });
}

async function createListing(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const id = requireUuid(stringField(body, "id"), "listing id");
  const title = stringField(body, "title");
  const description = stringField(body, "description");
  const province = stringField(body, "province");
  const district = stringField(body, "district");
  const seller = stringField(body, "seller_display_name");
  const channel = stringField(body, "contact_channel");
  const contact = stringField(body, "contact_e164");
  const status = stringField(body, "status");
  const price = body.price_amount;
  if ((channel !== "whatsapp" && channel !== "phone") || status !== "pending") {
    throw new Error("Hosted RC shim rejected an unexpected create contract.");
  }
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    throw new Error("Hosted RC listing price is invalid.");
  }
  if (!Array.isArray(body.search_keywords) || body.search_keywords.length !== 0) {
    throw new Error("Hosted RC operator create must use an empty keyword array.");
  }

  const result = await runPsql(
    `begin;\nset local role service_role;\nwith inserted as (\n  insert into public.listings (\n    id, title, description, price_amount, province, district, seller_display_name, search_keywords, contact_channel, contact_e164, status\n  ) values (\n    :'id'::uuid, :'title', :'description', :'price'::numeric, :'province', :'district', :'seller', array[]::text[], :'channel', :'contact', 'pending'\n  ) returning id\n)\nselect jsonb_agg(jsonb_build_object('id', id))::text from inserted;\ncommit;`,
    { id, title, description, price: String(price), province, district, seller, channel, contact },
  );
  return new Response(result || "[]", { headers: { "content-type": "application/json" } });
}

const PATCH_COLUMNS = new Map<string, "timestamp" | "text" | "status">([
  ["contact_verified_at", "timestamp"],
  ["contact_verification_method", "text"],
  ["publication_instruction_at", "timestamp"],
  ["status", "status"],
  ["published_at", "timestamp"],
  ["expires_at", "timestamp"],
  ["unpublished_at", "timestamp"],
]);

async function patchListing(request: Request, url: URL): Promise<Response> {
  const listingId = listingIdFromUrl(url);
  if (!listingId) throw new Error("Listing patch requires an exact id.");
  const body = await readJsonBody(request);
  const clauses: string[] = [];
  const variables: Record<string, string> = { listing_id: listingId };
  let index = 0;

  for (const [key, value] of Object.entries(body)) {
    const type = PATCH_COLUMNS.get(key);
    if (!type) throw new Error(`Unexpected listing patch column: ${key}`);
    if (value === null) {
      if (key !== "unpublished_at") throw new Error(`Null is not allowed for ${key}.`);
      clauses.push(`${key} = null`);
      continue;
    }
    if (typeof value !== "string") throw new Error(`Patch value for ${key} must be a string.`);
    if (type === "status" && !["published", "unpublished", "rejected"].includes(value)) {
      throw new Error("Unexpected listing status transition.");
    }
    if (
      key === "contact_verification_method" &&
      !["whatsapp_same_number", "manual_callback"].includes(value)
    ) {
      throw new Error("Unexpected contact verification method.");
    }
    if (type === "timestamp" && Number.isNaN(Date.parse(value))) {
      throw new Error(`Invalid timestamp for ${key}.`);
    }
    const variable = `v${index++}`;
    variables[variable] = value;
    clauses.push(`${key} = :'${variable}'${type === "timestamp" ? "::timestamptz" : ""}`);
  }
  if (clauses.length === 0) throw new Error("Empty listing patch is not allowed.");

  const result = await runPsql(
    `begin;\nset local role service_role;\nwith updated as (\n  update public.listings set ${clauses.join(", ")}\n  where id = :'listing_id'::uuid\n  returning id\n)\nselect coalesce(jsonb_agg(jsonb_build_object('id', id)), '[]'::jsonb)::text from updated;\ncommit;`,
    variables,
  );
  return new Response(result || "[]", { headers: { "content-type": "application/json" } });
}

async function deleteListing(url: URL): Promise<Response> {
  const listingId = listingIdFromUrl(url);
  if (!listingId) throw new Error("Listing delete requires an exact id.");
  const result = await runPsql(
    `begin;\nset local role service_role;\nwith deleted as (delete from public.listings where id = :'listing_id'::uuid returning id)\nselect coalesce(jsonb_agg(jsonb_build_object('id', id)), '[]'::jsonb)::text from deleted;\ncommit;`,
    { listing_id: listingId },
  );
  return new Response(result || "[]", { headers: { "content-type": "application/json" } });
}

async function registerPhoto(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const listingId = requireUuid(stringField(body, "p_listing_id"), "photo listing id");
  const photoId = requireUuid(stringField(body, "p_photo_id"), "photo id");
  const objectPath = requireObjectPath(stringField(body, "p_object_path"));
  const byteSize = body.p_byte_size;
  const sortOrder = body.p_sort_order;
  if (!Number.isInteger(byteSize) || Number(byteSize) < 1 || Number(byteSize) > MAX_PHOTO_BYTES) {
    throw new Error("Photo byte size is invalid.");
  }
  if (!Number.isInteger(sortOrder) || Number(sortOrder) < 0 || Number(sortOrder) > 32_767) {
    throw new Error("Photo sort order is invalid.");
  }
  await runPsql(
    `begin;\nset local role service_role;\nselect public.register_sanitized_listing_photo(:'listing_id'::uuid, :'photo_id'::uuid, :'object_path', :'byte_size'::bigint, :'sort_order'::smallint);\ncommit;`,
    {
      listing_id: listingId,
      photo_id: photoId,
      object_path: objectPath,
      byte_size: String(byteSize),
      sort_order: String(sortOrder),
    },
  );
  return json(null);
}

async function photoInventory(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const listingId = requireUuid(stringField(body, "p_listing_id"), "inventory listing id");
  const result = await runPsql(
    `begin;\nset local role service_role;\nselect coalesce(jsonb_agg(to_jsonb(x) order by x.sort_order, x.photo_id), '[]'::jsonb)::text\nfrom (\n  select id as photo_id, object_path, mime_type, byte_size, sort_order\n  from private.listing_photos\n  where listing_id = :'listing_id'::uuid\n) x;\ncommit;`,
    { listing_id: listingId },
  );
  return new Response(result || "[]", { headers: { "content-type": "application/json" } });
}

async function uploadObject(request: Request, objectPath: string): Promise<Response> {
  requireObjectPath(objectPath);
  if (request.headers.get("x-upsert") !== "false") {
    throw new Error("Hosted RC upload must be immutable.");
  }
  if (!request.headers.get("content-type")?.startsWith("image/webp")) {
    throw new Error("Hosted RC upload must be image/webp.");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new Error("Hosted RC upload byte size is invalid.");
  }
  const tempFile = path.join(os.tmpdir(), `arar-hosted-rc-${crypto.randomUUID()}.webp`);
  try {
    fs.writeFileSync(tempFile, bytes);
    const result = await runRclone([
      "copyto",
      tempFile,
      `source:listing_photos/${objectPath}`,
      "--immutable",
    ]);
    if (result.code !== 0) throw new Error(`S3 upload failed: ${result.stderr.slice(0, 500)}`);
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
  return json({ Key: objectPath });
}

async function deleteObjects(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const prefixes = body.prefixes;
  if (!Array.isArray(prefixes) || prefixes.length < 1 || prefixes.length > 8) {
    throw new Error("Hosted RC delete prefixes are invalid.");
  }
  for (const prefix of prefixes) {
    if (typeof prefix !== "string") throw new Error("Hosted RC delete prefix must be a string.");
    const objectPath = requireObjectPath(prefix);
    const result = await runRclone(["deletefile", `source:listing_photos/${objectPath}`]);
    if (result.code !== 0) throw new Error(`S3 delete failed: ${result.stderr.slice(0, 500)}`);

    let deleted = false;
    for (let attempt = 0; attempt < DELETE_VERIFY_ATTEMPTS; attempt += 1) {
      if (!(await objectExists(objectPath))) {
        deleted = true;
        break;
      }
      await Bun.sleep(DELETE_VERIFY_DELAY_MS);
    }
    if (!deleted) {
      throw new Error(`S3 delete verification timed out for ${objectPath}.`);
    }
  }
  return json({ message: "Successfully deleted" });
}

async function readObject(objectPath: string): Promise<Response> {
  requireObjectPath(objectPath);
  if (!(await objectExists(objectPath))) return json({ message: "Not found" }, 404);
  const result = await runRclone(["cat", `source:listing_photos/${objectPath}`]);
  if (result.code !== 0) {
    throw new Error(`S3 read failed after existence verification: ${result.stderr.slice(0, 500)}`);
  }
  return new Response(result.stdout, {
    status: 200,
    headers: { "content-type": "image/webp", "cache-control": "no-store" },
  });
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/__health") {
        return json({ ok: true, projectRef: APPROVED_PROJECT_REF });
      }
      const credentialError = requireServerCredential(request);
      if (credentialError) return credentialError;

      if (url.pathname === "/rest/v1/listings") {
        if (request.method === "GET") return await getListings(url);
        if (request.method === "POST") return await createListing(request);
        if (request.method === "PATCH") return await patchListing(request, url);
        if (request.method === "DELETE") return await deleteListing(url);
      }
      if (
        request.method === "POST" &&
        url.pathname === "/rest/v1/rpc/register_sanitized_listing_photo"
      ) {
        return await registerPhoto(request);
      }
      if (
        request.method === "POST" &&
        url.pathname === "/rest/v1/rpc/get_listing_photo_inventory"
      ) {
        return await photoInventory(request);
      }

      const objectPrefix = "/storage/v1/object/listing_photos/";
      if (url.pathname.startsWith(objectPrefix)) {
        const objectPath = decodeURIComponent(url.pathname.slice(objectPrefix.length));
        if (request.method === "POST") return await uploadObject(request, objectPath);
        if (request.method === "GET") return await readObject(objectPath);
      }
      if (url.pathname === "/storage/v1/object/listing_photos" && request.method === "DELETE") {
        return await deleteObjects(request);
      }

      return json({ message: "Not found" }, 404);
    } catch (error) {
      console.error(
        "Hosted RC localhost transport shim failure:",
        error instanceof Error ? error.message : error,
      );
      return json({ message: "Hosted RC transport failed closed." }, 500);
    }
  },
});

console.log(
  `Hosted RC localhost transport shim ready on ${server.hostname}:${server.port} for ${APPROVED_PROJECT_REF}.`,
);
