/**
 * ghl.ts — GoHighLevel CRM Integration
 *
 * Provides two helpers used during user registration:
 *   1. createGhlContact  — creates a contact in GHL CRM
 *   2. sendGhlEmail      — sends a transactional email via GHL conversations API
 *
 * Both helpers are fire-and-forget safe: they log errors but never throw,
 * so a GHL outage never blocks user registration or password reset.
 *
 * Required env vars:
 *   GHL_API_KEY      — Private Integration Token (pit-...)
 *   GHL_LOCATION_ID  — GHL sub-account location ID
 *   GHL_FROM_EMAIL   — Sender email address (default: info@mail.fivestonestechnology.com)
 */

import { ENV } from "./env";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

function ghlHeaders() {
  return {
    "Authorization": `Bearer ${ENV.ghlApiKey}`,
    "Version": GHL_VERSION,
    "Content-Type": "application/json",
  };
}

/** Create or upsert a contact in GHL CRM. Returns the GHL contact ID or null on failure. */
export async function createGhlContact(opts: {
  email: string;
  name: string;
  source?: string;
}): Promise<string | null> {
  if (!ENV.ghlApiKey || !ENV.ghlLocationId) {
    console.warn("[GHL] GHL_API_KEY or GHL_LOCATION_ID not set — skipping contact creation");
    return null;
  }
  try {
    const [firstName, ...rest] = opts.name.trim().split(" ");
    const lastName = rest.join(" ") || undefined;
    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({
        locationId: ENV.ghlLocationId,
        email: opts.email,
        firstName,
        lastName,
        source: opts.source ?? "Liability Defense System",
        tags: ["lds-signup"],
      }),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      console.error("[GHL] Failed to create contact:", data);
      return null;
    }
    console.log(`[GHL] Contact created: ${data.contact?.id} for ${opts.email}`);
    return data.contact?.id ?? null;
  } catch (err) {
    console.error("[GHL] createGhlContact error:", err);
    return null;
  }
}

/**
 * Get or create a GHL conversation for a contact.
 * GHL's POST /conversations/ fails if a conversation already exists —
 * so we search first and only create if none is found.
 */
async function getOrCreateConversation(contactId: string): Promise<string | null> {
  // Step A: search for an existing conversation
  try {
    const searchRes = await fetch(
      `${GHL_BASE}/conversations/search?locationId=${ENV.ghlLocationId}&contactId=${contactId}`,
      { method: "GET", headers: ghlHeaders() }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json() as any;
      const existing = searchData.conversations?.[0];
      if (existing?.id) {
        console.log(`[GHL] Found existing conversation: ${existing.id}`);
        return existing.id;
      }
    }
  } catch {
    // search failed — fall through to create
  }

  // Step B: create a new conversation
  try {
    const convRes = await fetch(`${GHL_BASE}/conversations/`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({
        locationId: ENV.ghlLocationId,
        contactId,
      }),
    });
    const convData = await convRes.json() as any;
    if (convRes.ok) {
      const id = convData.conversation?.id ?? convData.id ?? null;
      if (id) {
        console.log(`[GHL] Created new conversation: ${id}`);
        return id;
      }
    }
    // GHL sometimes returns the existing conversation ID in the error body
    const fallbackId = convData.conversationId ?? convData.conversation?.id ?? null;
    if (fallbackId) {
      console.log(`[GHL] Using conversation ID from error response: ${fallbackId}`);
      return fallbackId;
    }
    console.error("[GHL] Failed to create conversation:", convData);
    return null;
  } catch (err) {
    console.error("[GHL] getOrCreateConversation error:", err);
    return null;
  }
}

/**
 * Send a transactional email via GHL conversations API.
 * Automatically creates a GHL contact + conversation if needed.
 */
export async function sendGhlEmail(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  ghlContactId?: string | null;
}): Promise<boolean> {
  if (!ENV.ghlApiKey || !ENV.ghlLocationId) {
    console.warn("[GHL] GHL_API_KEY or GHL_LOCATION_ID not set — skipping email send");
    return false;
  }
  try {
    // Step 1: ensure we have a GHL contact ID
    let contactId = opts.ghlContactId ?? null;
    if (!contactId) {
      contactId = await createGhlContact({ email: opts.toEmail, name: opts.toName });
    }
    if (!contactId) {
      console.error("[GHL] Cannot send email — no contact ID available");
      return false;
    }

    // Step 2: get or create a conversation (search-first to avoid duplicate error)
    const conversationId = await getOrCreateConversation(contactId);
    if (!conversationId) {
      console.error("[GHL] Cannot send email — no conversation ID available");
      return false;
    }

    // Step 3: send the email via the conversation
    const msgRes = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({
        type: "Email",
        conversationId,
        contactId,
        subject: opts.subject,
        html: opts.html,
        emailFrom: ENV.ghlFromEmail,
        emailTo: opts.toEmail,
      }),
    });
    const msgData = await msgRes.json() as any;
    if (!msgRes.ok) {
      console.error("[GHL] Failed to send email:", msgData);
      return false;
    }
    console.log(`[GHL] Email queued: ${msgData.messageId} → ${opts.toEmail}`);
    return true;
  } catch (err) {
    console.error("[GHL] sendGhlEmail error:", err);
    return false;
  }
}
