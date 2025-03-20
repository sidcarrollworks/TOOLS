import type { FunctionComponent } from "preact";
import { useSignal, useComputed } from "@preact/signals";

import { Button } from "../UI/Button";
import { Checkbox } from "../UI/Checkbox";
import { getExportStore } from "../../lib/stores/index";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import { getSettingValue, updateSettingValue } from "../../lib/settings/store";
import { facadeSignal } from "../../app";

interface SavePanelProps {
  // No props needed for now
}

const SavePanel: FunctionComponent<SavePanelProps> = () => {
  // Get the export store
  const exportStore = getExportStore();
  const facade = facadeSignal.value;

  // Get the image settings from the store
  const imageSettings = useComputed(() => exportStore.get("imageSettings"));
  const isExporting = useComputed(() => exportStore.get("isExporting"));

  // Local state to track UI changes before applying
  const transparentBg = useSignal(imageSettings.value.transparent);
  const highQuality = useSignal(imageSettings.value.highQuality);

  // Handle checkbox change
  const handleCheckboxChange = (
    setting: "transparent" | "highQuality",
    checked: boolean
  ) => {
    if (setting === "transparent") {
      transparentBg.value = checked;

      // Also update the global settings store so it stays in sync with
      // the transparentBackground setting in the ColorsPanel
      updateSettingValue("transparentBackground", checked);

      // Update the facade directly if available to ensure immediate visual feedback
      if (facade) {
        facade.updateParam("exportTransparentBg", checked);
      }
    } else {
      highQuality.value = checked;
    }

    // Update the export store with the new setting
    exportStore.updateImageSettings({
      [setting]: checked,
    });
  };

  // Handle save image button click
  const handleSaveImage = async () => {
    try {
      // Ensure transparent setting is synced with the global setting before export
      const globalTransparentSetting = getSettingValue("transparentBackground");
      if (transparentBg.value !== globalTransparentSetting) {
        transparentBg.value = !!globalTransparentSetting;
        exportStore.updateImageSettings({
          transparent: !!globalTransparentSetting,
        });
      }

      // Export the image with current settings
      await exportStore.exportImage();

      // Download the exported image
      exportStore.downloadLastExport();
    } catch (error) {
      console.error("Failed to save image:", error);
    }
  };

  return (
    <>
      <SettingsGroup collapsible={false} header={false}>
        <Checkbox
          label="Transparent Background"
          checked={transparentBg.value}
          onChange={(checked) => handleCheckboxChange("transparent", checked)}
        />

        <Checkbox
          label="High Quality"
          checked={highQuality.value}
          onChange={(checked) => handleCheckboxChange("highQuality", checked)}
        />
      </SettingsGroup>
      <Button
        onClick={handleSaveImage}
        variant="primary"
        size="small"
        disabled={isExporting.value}
      >
        {isExporting.value ? "Exporting..." : "Save Image"}
      </Button>
    </>
  );
};

export default SavePanel;
