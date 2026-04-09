import React from "react";
import { KeyIcon, TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";

interface SettingsPanelProps {
  pat: string;
  setPat: (value: string) => void;
  rememberToken: boolean;
  setRememberToken: (value: boolean) => void;
  canSaveToConfig: boolean;
  clearSavedToken: () => void;
}

export function SettingsPanel({
  pat,
  setPat,
  rememberToken,
  setRememberToken,
  canSaveToConfig,
  clearSavedToken,
}: SettingsPanelProps): React.ReactElement {
  return (
    <div className="card settings-panel">
      <h3 className="settings-panel__title">Instellingen</h3>

      <div className="field-group" style={{ marginBottom: "0.5rem" }}>
        <label className="field-label">Airtable PAT Token</label>
        <div className="input-wrapper">
          <span className="input-icon"><KeyIcon size={16} /></span>
          <input
            type="password"
            className="input"
            placeholder="pat..."
            value={pat}
            onChange={(e) => setPat(e.target.value)}
          />
        </div>
      </div>

      {canSaveToConfig && (
        <div className="syncer__remember">
          <label className="syncer__checkbox-label">
            <input
              type="checkbox"
              checked={rememberToken}
              onChange={(e) => setRememberToken(e.target.checked)}
            />
            <span>Onthoud token</span>
          </label>
          {rememberToken && pat.trim() && (
            <button className="btn-clear-filters" onClick={clearSavedToken}>
              <TrashIcon size={12} /> Token verwijderen
            </button>
          )}
          {rememberToken && (
            <div className="syncer__warning">
              <WarningCircleIcon size={14} />
              <span>Token wordt opgeslagen in de extensie-instellingen en is zichtbaar voor alle collaborators op deze base.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
