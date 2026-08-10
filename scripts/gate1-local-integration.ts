import {
  fetchPublicListing,
  fetchPublicListings,
  type PublicSupabaseConfig,
} from "../src/lib/public-listings";

const visibleId = "00000000-0000-4000-8000-000000000101";
const hiddenDraftId = "00000000-0000-4000-8000-000000000102";
const hiddenExpiredId = "00000000-0000-4000-8000-000000000103";
const syntheticActiveContact = "+12025550123";

const url = process.env.LOCAL_SUPABASE_URL?.trim();
const publicKey = process.env.LOCAL_SUPABASE_PUBLIC_KEY?.trim();

if (!url || !publicKey) {
  throw new Error(
    "Local Supabase URL and public key are required for the Gate 1 integration test.",
  );
}

const config: PublicSupabaseConfig = { url, publicKey };
const listings = await fetchPublicListings(config);

if (listings.length !== 1 || listings[0]?.id !== visibleId) {
  throw new Error(
    `Expected only the active published fixture, received ${JSON.stringify(listings)}.`,
  );
}

if (listings[0]?.title !== "Visible integration listing") {
  throw new Error("The active public listing was not mapped through the application adapter.");
}

if (Object.prototype.hasOwnProperty.call(listings[0], "publicContact")) {
  throw new Error("Collection-card application payload unexpectedly carried seller contact data.");
}

const visibleListing = await fetchPublicListing(visibleId, config);
if (!visibleListing || visibleListing.id !== visibleId) {
  throw new Error("The visible listing detail was not returned through the public adapter.");
}
if (
  visibleListing.publicContact?.channel !== "whatsapp" ||
  visibleListing.publicContact.e164 !== syntheticActiveContact
) {
  throw new Error(
    `Visible listing detail did not carry the approved public contact: ${JSON.stringify(visibleListing.publicContact)}.`,
  );
}

for (const hiddenId of [hiddenDraftId, hiddenExpiredId]) {
  const hiddenListing = await fetchPublicListing(hiddenId, config);
  if (hiddenListing !== null) {
    throw new Error(`RLS exposed hidden listing ${hiddenId}.`);
  }
}

const rawContactResponse = await fetch(
  `${url.replace(/\/+$/, "")}/rest/v1/listings?select=id,contact_channel,contact_e164&order=id.asc`,
  {
    headers: {
      Accept: "application/json",
      apikey: publicKey,
    },
  },
);
if (!rawContactResponse.ok) {
  throw new Error(`Anonymous raw contact query failed with ${rawContactResponse.status}.`);
}
const rawContacts = (await rawContactResponse.json()) as Array<{
  id: string;
  contact_channel: string;
  contact_e164: string;
}>;
if (
  rawContacts.length !== 1 ||
  rawContacts[0]?.id !== visibleId ||
  rawContacts[0]?.contact_channel !== "whatsapp" ||
  rawContacts[0]?.contact_e164 !== syntheticActiveContact
) {
  throw new Error(
    `Raw Data API contact enumeration did not match the accepted active-public contract: ${JSON.stringify(rawContacts)}.`,
  );
}
console.log(
  "Accepted public-disclosure consequence: anon can bulk-query contact_channel/contact_e164 for active published rows.",
);

const anonymousInsertResponse = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/listings`, {
  method: "POST",
  headers: {
    apikey: publicKey,
    "content-type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    title: "Anonymous integration insert",
    description: "This write must be rejected by the local public API boundary.",
    price_amount: 1,
    province: "Tekirdag",
    district: "Corlu",
    seller_display_name: "Anonymous",
  }),
});

if (anonymousInsertResponse.ok) {
  throw new Error("Anonymous public REST INSERT unexpectedly succeeded.");
}

console.log("Gate 1 local REST integration passed.");
