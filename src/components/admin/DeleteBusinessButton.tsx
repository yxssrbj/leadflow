"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBusinessConfigAction } from "@/app/[locale]/admin/businesses/actions";

export default function DeleteBusinessButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm(`Delete "${id}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteBusinessConfigAction(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <span>
      <button
        onClick={onDelete}
        disabled={disabled || pending}
        title={disabled ? "The default business can't be deleted" : undefined}
        className="font-semibold text-red-400 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-low disabled:no-underline"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="ml-2 text-xs text-red-300">{error}</span>}
    </span>
  );
}
