import { fetchPublicListing, fetchPublicListings } from "../src/lib/public-listings";

const apiUrl = process.env.LOCAL_SUPABASE_URL?.trim();
const anonKey = process.env.LOCAL_SUPABASE_ANON_KEY?.trim();

if (!apiUrl || !anonKey) {
  throw new Error("Local Supabase URL and anon key are required.");
}

const publishedListingId = "71000000-0000-4000-8000-000000000001";
const draftListingId = "71000000-0000-4000-8000-000000000002";
const expectedContact = "+12025550123";
const config = { url: apiUrl, publicKey: anonKey };

async function retry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 10) await Bun.sleep(500);
    }
  }

  throw new Error(`${label} did not succeed after PostgREST restart.`, { cause: lastError });
}

const listings = await retry("Public collection query", () => fetchPublicListings(config));

if (listings.length !== 1 || listings[0]?.id !== publishedListingId) {
  throw new Error(
    `Restored public collection did not preserve the fail-closed visibility contract: ${JSON.stringify(
      listings.map((listing) => listing.id),
    )}`,
  );
}

const published = await retry("Published detail query", () =>
  fetchPublicListing(publishedListingId, config),
);
if (!published)
  throw new Error("Restored published listing is not readable through the app adapter.");
if (
  published.publicContact?.channel !== "whatsapp" ||
  published.publicContact.e164 !== expectedContact
) {
  throw new Error(
    "Restored published seller-contact contract did not survive the logical restore.",
  );
}

const draft = await retry("Draft detail query", () => fetchPublicListing(draftListingId, config));
if (draft !== null) {
  throw new Error("Draft listing became anonymously readable after logical restore.");
}

console.log(
  "Logical restore app verification passed: active listing visible, draft hidden, public contact preserved.",
);
