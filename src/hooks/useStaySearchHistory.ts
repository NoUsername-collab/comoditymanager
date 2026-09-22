"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addStaySearchHistoryTerm,
  clearStaySearchHistory,
  readStaySearchHistory,
  removeStaySearchHistoryTerm,
} from "@/lib/stays/search-history-storage";

export function useStaySearchHistory() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(readStaySearchHistory());
  }, []);

  const add = useCallback((term: string) => {
    setItems(addStaySearchHistoryTerm(term));
  }, []);

  const remove = useCallback((term: string) => {
    setItems(removeStaySearchHistoryTerm(term));
  }, []);

  const clear = useCallback(() => {
    clearStaySearchHistory();
    setItems([]);
  }, []);

  return { items, add, remove, clear };
}
