"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { useCazariSearchHistory } from "@/hooks/useCazariSearchHistory";
import { filterVisibleSearchHistory } from "@/lib/cazari/search-history-storage";

function buildCazariHref(
  q: string,
  preserve?: { view?: string; h?: string },
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (preserve?.view && preserve.view !== "confirmate") {
    params.set("view", preserve.view);
  }
  if (preserve?.h && preserve.h !== "30d") params.set("h", preserve.h);
  const qs = params.toString();
  return qs ? `/admin/cazari?${qs}` : "/admin/cazari";
}

export function AdminStaySearchForm({
  defaultQuery,
  preserveParams,
}: {
  defaultQuery?: string;
  preserveParams?: { view?: string; h?: string };
}) {
  const t = useTranslations("admin.common");
  const router = useRouter();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const listboxId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(defaultQuery ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { items: historyItems, add: addHistory, remove: removeHistory, clear: clearHistory } =
    useCazariSearchHistory();

  const visibleHistory = filterVisibleSearchHistory(historyItems, query);
  const showHistory =
    historyOpen && visibleHistory.length > 0 && !pending;

  useEffect(() => {
    setQuery(defaultQuery ?? "");
  }, [defaultQuery]);

  useEffect(() => {
    if (!historyOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!fieldRef.current?.contains(target)) {
        setHistoryOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [historyOpen]);

  const runSearch = useCallback(
    (rawQ: string) => {
      const q = rawQ.trim();
      if (q) addHistory(q);
      setHistoryOpen(false);
      setActiveIndex(-1);
      void runAdminAction(async () => {
        router.push(buildCazariHref(q, preserveParams));
      });
    },
    [addHistory, preserveParams, router, runAdminAction],
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    runSearch(query);
  }

  function onHistorySelect(term: string) {
    setQuery(term);
    runSearch(term);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showHistory) {
      if (e.key === "ArrowDown" && visibleHistory.length > 0) {
        e.preventDefault();
        setHistoryOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < visibleHistory.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : visibleHistory.length - 1,
      );
      return;
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const term = visibleHistory[activeIndex];
      if (term) onHistorySelect(term);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setHistoryOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <form
      className="cazari-search-form flex flex-wrap gap-2"
      onSubmit={onSubmit}
    >
      <div
        ref={fieldRef}
        className="cazari-search-field relative min-w-0 w-full flex-1"
      >
        <AdminInput
          ref={inputRef}
          name="q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setHistoryOpen(true);
          }}
          onFocus={() => setHistoryOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder={t("searchStay")}
          className="min-w-0 w-full"
          disabled={pending}
          autoComplete="off"
          role="combobox"
          aria-expanded={showHistory}
          aria-controls={showHistory ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showHistory && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
        />

        {showHistory ? (
          <div
            id={listboxId}
            className="cazari-search-history"
            role="listbox"
            aria-label={t("searchHistoryTitle")}
          >
            <div className="cazari-search-history__header">
              <span className="cazari-search-history__title">
                {t("searchHistoryTitle")}
              </span>
              <button
                type="button"
                className="cazari-search-history__clear"
                onClick={() => {
                  clearHistory();
                  setActiveIndex(-1);
                  inputRef.current?.focus();
                }}
              >
                {t("clearSearchHistory")}
              </button>
            </div>
            <ul className="cazari-search-history__list">
              {visibleHistory.map((term, index) => (
                <li key={term} role="presentation">
                  <div
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={[
                      "cazari-search-history__item",
                      activeIndex === index && "cazari-search-history__item--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className="cazari-search-history__select"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onHistorySelect(term)}
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      className="cazari-search-history__remove"
                      aria-label={t("removeSearchHistoryItem", { term })}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        removeHistory(term);
                        setActiveIndex(-1);
                        inputRef.current?.focus();
                      }}
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "…" : t("searchGuest")}
      </button>
      {defaultQuery?.trim() ? (
        <AdminButton
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setQuery("");
            void runAdminAction(async () => {
              router.push(buildCazariHref("", preserveParams));
            });
          }}
        >
          {t("cancel")}
        </AdminButton>
      ) : null}
    </form>
  );
}
