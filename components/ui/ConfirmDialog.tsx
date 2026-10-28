"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmDialog({
  trigger, title, description, confirmLabel, cancelLabel = "Annuler", tone = "default", onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text/50" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            // action destructive : le focus part sur « Annuler »
            if (tone === "danger") { e.preventDefault(); cancelRef.current?.focus(); }
          }}
          className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-app -translate-x-1/2 -translate-y-1/2 gap-3 rounded-xl border border-border bg-surface p-5 shadow-raised"
        >
          <Dialog.Title className="text-lg text-text">{title}</Dialog.Title>
          <Dialog.Description className="text-sm text-text-muted">{description}</Dialog.Description>
          <div className="mt-2 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button ref={cancelRef} variant="secondary">{cancelLabel}</Button>
            </Dialog.Close>
            <Button variant={tone === "danger" ? "danger" : "primary"} loading={busy} onClick={confirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
