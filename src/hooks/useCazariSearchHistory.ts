"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addCazariSearchHistoryTerm,
  clearCazariSearchHistory,
  readCazariSearchHistory,
  removeCazariSearchHistoryTerm,
} from "@/lib/cazari/search-history-storage";

export function useCazariSearchHistory() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(readCazariSearchHistory());
  }, []);

  const add = useCallback((term: string) => {
    setItems(addCazariSearchHistoryTerm(term));
  }, []);

  const remove = useCallback((term: string) => {
    setItems(removeCazariSearchHistoryTerm(term));
  }, []);

  const clear = useCallback(() => {
    clearCazariSearchHistory();
    setItems([]);
  }, []);

  return { items, add, remove, clear };
}
