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

import { getExportStore } from "../../lib/stores/index";
import { SettingsGroup } from "../UI/SettingsGroup";
import { Button } from "../UI/Button";

interface CodePanelProps {
  // No props needed for now
}

const CodePanel: FunctionComponent<CodePanelProps> = () => {
  // Get the export store
  const exportStore = getExportStore();
  const isExporting = useComputed(() => exportStore.get("isExporting"));

  // Trigger the export code modal when the panel is shown
  useEffect(() => {
    // Small delay to ensure the panel is rendered before opening the modal
    const timer = setTimeout(() => {
      exportStore.exportCode();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleExportClick = async () => {
    try {
      await exportStore.exportCode();
    } catch (error) {
      console.error("Failed to export code:", error);
    }
  };

  return (
    <SettingsGroup title="Export Code">
      <Button
        onClick={handleExportClick}
        variant="primary"
        disabled={isExporting.value}
        style={{ width: "100%", marginTop: "16px" }}
      >
        {isExporting.value ? "Exporting..." : "Open Export Code Modal"}
      </Button>
    </SettingsGroup>
  );
};

export default CodePanel;
