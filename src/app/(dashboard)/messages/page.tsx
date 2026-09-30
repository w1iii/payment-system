import { getSupabase } from "@/lib/db";
import { getSettings, renderMessage } from "@/lib/settings";
import { MessageComposer } from "@/components/message-composer";
import { MessageQueue, type QueueItem } from "@/components/message-queue";
import type { JerseyOrder } from "@/lib/types";

export default async function MessagesPage() {
  const settings = await getSettings();

  const { data, error } = await getSupabase()
    .from("jersey_orders")
    .select("*")
    .eq("status", "unpaid")
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load unpaid orders: ${error.message}`);

  const items: QueueItem[] = (data as JerseyOrder[]).map((o) => ({
    id: o.id,
    name: o.name,
    category: o.category,
    facebook_url: o.facebook_url,
    message: renderMessage(settings.template, o.name),
  }));

  return (
    <div className="space-y-6">
      <MessageComposer
        template={settings.template}
        adminFacebook={settings.adminFacebook}
      />
      <MessageQueue items={items} />
    </div>
  );
}
