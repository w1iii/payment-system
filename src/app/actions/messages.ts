"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/db";

export interface MessageFormState {
  error: string | null;
  saved: boolean;
  values?: {
    template: string;
    admin_facebook: string;
  };
}

const settingsSchema = z.object({
  template: z.string().min(1, "Message text required").max(2000),
  admin_facebook: z.string().max(200),
});

export async function saveMessageSettings(
  _prev: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  await requireAdmin();

  const raw = {
    template: String(formData.get("template") ?? ""),
    admin_facebook: String(formData.get("admin_facebook") ?? ""),
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
      saved: false,
      values: raw,
    };
  }

  const rows = [
    {
      key: "message_template",
      value: parsed.data.template,
      updated_at: new Date().toISOString(),
    },
    {
      key: "admin_facebook",
      value: parsed.data.admin_facebook.trim(),
      updated_at: new Date().toISOString(),
    },
  ];

  const { error } = await getSupabase().from("settings").upsert(rows, {
    onConflict: "key",
  });
  if (error) {
    return { error: `Failed to save: ${error.message}`, saved: false, values: raw };
  }

  revalidatePath("/messages");
  return { error: null, saved: true };
}
