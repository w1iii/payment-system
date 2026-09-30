import "server-only";
import { getSupabase } from "@/lib/db";

export const DEFAULT_TEMPLATE =
  "Hi {name}! Just a reminder that your Stingers jersey payment is still " +
  "unpaid. Please settle it at your earliest convenience. Thank you!";

export interface Settings {
  template: string;
  adminFacebook: string;
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("key, value")
    .in("key", ["message_template", "admin_facebook"]);
  if (error) throw new Error(`Failed to load settings: ${error.message}`);

  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    template: map.get("message_template") || DEFAULT_TEMPLATE,
    adminFacebook: map.get("admin_facebook") || "",
  };
}

export function renderMessage(template: string, name: string): string {
  return template.replace(/\{name\}/gi, name);
}
