"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const LEGAL_LINKS = [
  { label: "Terms", href: "https://www.deutli.com/terms" },
  { label: "Privacy", href: "https://www.deutli.com/privacy" },
  { label: "Impressum", href: "https://www.deutli.com/impressum" },
];

/** All time zones the browser knows, with the current one always included. */
export function timeZoneOptions(current: string): string[] {
  let list: string[] = [];
  try {
    list = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  } catch {
    list = [];
  }
  return list.includes(current) ? list : [current, ...list];
}

/** A group of settings in a dashboard-style card. */
export function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="gap-1 pb-2">
      <div className="grid gap-1">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </Card>
  );
}

/** One line in a card: label, value, and an Edit button that opens a small form below. */
export function SettingRow({
  label,
  value,
  editing,
  onEdit,
  editLabel,
  children,
}: {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-x-6">
      <h3 className="text-[15px] font-semibold">{label}</h3>
      <div className="col-span-2 row-start-2 min-w-0 text-[15px] text-muted-foreground sm:col-span-1 sm:row-start-auto">
        {value}
      </div>
      {onEdit && !editing ? (
        <Button
          variant="outline"
          size="sm"
          className="col-start-2 row-start-1 h-11 justify-self-end sm:col-start-auto sm:row-start-auto sm:h-9"
          onClick={onEdit}
          aria-label={editLabel}
        >
          Edit
        </Button>
      ) : (
        <span className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto" aria-hidden />
      )}
      {editing && <div className="col-span-2 pt-3 pb-2 sm:col-span-3">{children}</div>}
    </li>
  );
}

export function FormButtons({ busy, onCancel, label = "Save" }: { busy: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
