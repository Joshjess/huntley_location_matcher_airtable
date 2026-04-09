import { useState, useCallback, useEffect } from "react";
import { useGlobalConfig } from "@airtable/blocks/ui";

const PAT_CONFIG_KEY = "cmaAirtablePat";

interface UsePatSettingsReturn {
  pat: string;
  setPat: (value: string) => void;
  rememberToken: boolean;
  setRememberToken: (value: boolean) => void;
  canSaveToConfig: boolean;
  clearSavedToken: () => void;
  hasPat: boolean;
}

export function usePatSettings(): UsePatSettingsReturn {
  const globalConfig = useGlobalConfig();
  const savedPat = globalConfig.get(PAT_CONFIG_KEY) as string | undefined;
  const [pat, setPatRaw] = useState(savedPat ?? "");
  const [rememberToken, setRememberToken] = useState(!!savedPat);

  const canSaveToConfig = globalConfig.hasPermissionToSet(PAT_CONFIG_KEY);

  const setPat = useCallback(
    (value: string) => {
      setPatRaw(value);
      if (rememberToken && canSaveToConfig) {
        globalConfig.setAsync(PAT_CONFIG_KEY, value || undefined);
      }
    },
    [rememberToken, canSaveToConfig, globalConfig],
  );

  useEffect(() => {
    if (!canSaveToConfig) return;
    if (rememberToken && pat.trim()) {
      globalConfig.setAsync(PAT_CONFIG_KEY, pat.trim());
    } else if (!rememberToken) {
      globalConfig.setAsync(PAT_CONFIG_KEY, undefined);
    }
  }, [rememberToken, canSaveToConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSavedToken = useCallback(() => {
    setPatRaw("");
    setRememberToken(false);
    if (canSaveToConfig) {
      globalConfig.setAsync(PAT_CONFIG_KEY, undefined);
    }
  }, [canSaveToConfig, globalConfig]);

  return {
    pat,
    setPat,
    rememberToken,
    setRememberToken,
    canSaveToConfig,
    clearSavedToken,
    hasPat: pat.trim().length > 0,
  };
}
