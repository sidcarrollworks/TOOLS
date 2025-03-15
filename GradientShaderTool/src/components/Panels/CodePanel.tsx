/**
 * NOTE: This component is not currently used.
 * The export code functionality is triggered directly from the SidePanel
 * when the CodeIcon is clicked, not through this panel.
 *
 * This file is kept for reference in case we want to revert to a panel-based UI in the future.
 */

import type { FunctionComponent } from "preact";
import { useEffect } from "preact/hooks";
import { useComputed } from "@preact/signals";
import "./Panel.css";
import { appSignal } from "../../app";

interface CodePanelProps {
  // No props needed for now
}

const CodePanel: FunctionComponent<CodePanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Trigger the export code modal when the panel is shown
  useEffect(() => {
    if (app.value) {
      // Small delay to ensure the panel is rendered before opening the modal
      const timer = setTimeout(() => {
        app.value?.exportCode();
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [app.value]);

  return (
    <div className="panel">
      <div className="settingsGroup">
        <h3 className="groupTitle">Export Code</h3>

        <div className="settingDescription">
          The code export modal should open automatically.
          <p>
            If the modal doesn't open automatically, click the button below.
          </p>
        </div>

        <div className="settingRow" style={{ marginTop: "16px" }}>
          <button
            className="button primary"
            onClick={() => app.value?.exportCode()}
            style={{
              width: "100%",
              height: "24px",
              fontSize: "12px",
              opacity: app.value ? 1 : 0.5,
              cursor: app.value ? "pointer" : "not-allowed",
            }}
          >
            Open Export Code Modal
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodePanel;
