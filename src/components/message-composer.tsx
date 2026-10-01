"use client";

import { useActionState } from "react";
import {
  saveMessageSettings,
  type MessageFormState,
} from "@/app/actions/messages";

const initialState: MessageFormState = { error: null, saved: false };

export function messengerHref(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://m.me/${v.replace(/^@/, "")}`;
}

export function MessageComposer({
  template,
  adminFacebook,
}: {
  template: string;
  adminFacebook: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveMessageSettings,
    initialState,
  );
  const currentTemplate = state.values?.template ?? template;
  const currentAdmin = state.values?.admin_facebook ?? adminFacebook;
  const myMessenger = messengerHref(currentAdmin);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
    >
      <div>
        <h2 className="text-sm font-medium text-zinc-900">
          Automation message
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Sent to every unpaid customer. Use{" "}
          <code className="rounded bg-zinc-100 px-1">{"{name}"}</code> where the
          customer&apos;s name should appear.
        </p>
      </div>

      <textarea
        name="template"
        rows={4}
        required
        defaultValue={currentTemplate}
        placeholder="Hi {name}! ..."
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
      />

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-0 flex-1 text-sm font-medium text-zinc-700">
          Your Facebook account (URL or @username)
          <input
            name="admin_facebook"
            defaultValue={currentAdmin}
            placeholder="https://facebook.com/you or @yourname"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </label>
        {myMessenger && (
          <a
            href={myMessenger}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-300 px-3 py-2 text-center text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Open my Messenger ↗
          </a>
        )}
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save automation"}
      </button>
    </form>
  );
}
