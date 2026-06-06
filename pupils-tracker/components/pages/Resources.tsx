"use client";

import { FileText, ExternalLink } from "lucide-react";
import { RESOURCES, RESOURCE_GROUPS } from "@/lib/resources";
import { SectionCard } from "@/components/ui/SectionCard";

export function Resources() {
  return (
    <div className="space-y-4">
      {RESOURCE_GROUPS.map((group) => {
        const items = RESOURCES.filter((r) => r.group === group);
        if (items.length === 0) return null;
        return (
          <SectionCard key={group} title={group}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((r) => (
                <li key={r.file}>
                  <a
                    href={`/books/${r.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-md border border-paper-100 p-3 outline-none transition hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-pink text-mark-pink-ink">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 font-display text-sm font-semibold text-paper-800">
                      {r.title}
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
                  </a>
                </li>
              ))}
            </ul>
          </SectionCard>
        );
      })}
    </div>
  );
}
