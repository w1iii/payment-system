"use client";

import { useState } from "react";
import { MessageComposer } from "@/components/message-composer";
import { MessageQueue, type QueueItem } from "@/components/message-queue";
import { SendControls } from "@/components/send-controls";

export function MessagesPanel({
  items,
  template,
  adminFacebook,
}: {
  items: QueueItem[];
  template: string;
  adminFacebook: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  return (
    <div className="space-y-6">
      <MessageComposer template={template} adminFacebook={adminFacebook} />
      <SendControls total={items.length} selectedIds={selected} />
      <MessageQueue
        items={items}
        selected={selected}
        onToggle={toggle}
        onClear={() => setSelected([])}
      />
    </div>
  );
}
