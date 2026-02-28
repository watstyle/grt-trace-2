import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useQueryState<T extends string>(key: string, defaultValue: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = (searchParams.get(key) as T | null) ?? defaultValue;

  const setValue = useCallback(
    (nextValue: T | null, options?: { replace?: boolean }) => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextValue === null || nextValue === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, nextValue);
      }
      setSearchParams(nextParams, { replace: options?.replace ?? false });
    },
    [key, searchParams, setSearchParams],
  );

  return [value, setValue] as const;
}

export function useSetQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null | undefined>, options?: { replace?: boolean }) => {
      const nextParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          nextParams.delete(key);
          return;
        }
        nextParams.set(key, value);
      });

      setSearchParams(nextParams, { replace: options?.replace ?? true });
    },
    [searchParams, setSearchParams],
  );
}
