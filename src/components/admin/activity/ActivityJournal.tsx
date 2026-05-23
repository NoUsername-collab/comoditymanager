"use client";

import { useMemo, useState } from "react";
import { ActivityTimeline } from "@/components/admin/activity/ActivityTimeline";
import {
  splitActivityByCategory,
  type ActivityJournalCategory,
} from "@/domain/activity/categories";
import type { ActivityLogEntry } from "@/domain/activity/types";

const TABS: {
  id: ActivityJournalCategory;
  label: string;
  short: string;
  icon: string;
  hint: string;
  emptyTitle: string;
  emptyText: string;
}[] = [
  {
    id: "rezervari",
    label: "Rezervări",
    short: "Rezervări",
    icon: "✉",
    hint: "Cereri, confirmări, mutări, anulări",
    emptyTitle: "Nicio acțiune la rezervări",
    emptyText:
      "Când vine o cerere de pe site sau modifici o rezervare în admin, evenimentele apar aici.",
  },
  {
    id: "admin",
    label: "Admin",
    short: "Admin",
    icon: "⚙",
    hint: "Login, setări, clădiri și camere",
    emptyTitle: "Nicio acțiune admin",
    emptyText:
      "Autentificări, setări pensiune și modificări la clădiri/camere sunt listate aici.",
  },
];

function formatLast(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityJournal({ entries }: { entries: ActivityLogEntry[] }) {
  const { rezervari, admin } = useMemo(
    () => splitActivityByCategory(entries),
    [entries]
  );

  const counts = { rezervari: rezervari.length, admin: admin.length };
  const lists = { rezervari, admin };
  const lastAt = {
    rezervari: rezervari[0]?.created_at,
    admin: admin[0]?.created_at,
  };

  const defaultTab: ActivityJournalCategory =
    counts.rezervari >= counts.admin ? "rezervari" : "admin";

  const [active, setActive] = useState<ActivityJournalCategory>(defaultTab);

  const activeMeta = TABS.find((t) => t.id === active)!;
  const activeEntries = lists[active];

  return (
    <div className="activity-journal">
      <div
        className="activity-journal__tabs"
        role="tablist"
        aria-label="Categorii jurnal"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`activity-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`activity-panel-${tab.id}`}
              className={[
                "activity-journal__tab",
                `activity-journal__tab--${tab.id}`,
                isActive && "activity-journal__tab--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setActive(tab.id)}
            >
              <span className="activity-journal__tab-icon" aria-hidden>
                {tab.icon}
              </span>
              <span className="activity-journal__tab-body">
                <span className="activity-journal__tab-row">
                  <span className="activity-journal__tab-label">{tab.label}</span>
                  <span className="activity-journal__tab-count">
                    {counts[tab.id]}
                  </span>
                </span>
                <span className="activity-journal__tab-hint">{tab.hint}</span>
                <span className="activity-journal__tab-last">
                  Ultimul: {formatLast(lastAt[tab.id])}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`activity-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`activity-tab-${active}`}
        className={[
          "activity-journal__panel",
          `activity-journal__panel--${active}`,
        ].join(" ")}
      >
        <header className="activity-journal__panel-head">
          <h3 className="activity-journal__panel-title">
            <span aria-hidden>{activeMeta.icon}</span> {activeMeta.label}
          </h3>
          <p className="activity-journal__panel-desc">{activeMeta.hint}</p>
        </header>

        {activeEntries.length === 0 ? (
          <div className="admin-empty-state activity-journal__empty">
            <span className="admin-empty-state__icon" aria-hidden>
              {activeMeta.icon}
            </span>
            <p className="admin-empty-state__title">{activeMeta.emptyTitle}</p>
            <p className="admin-empty-state__text">{activeMeta.emptyText}</p>
          </div>
        ) : (
          <ActivityTimeline entries={activeEntries} />
        )}
      </div>
    </div>
  );
}
