import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useComputed } from "@preact/signals";

import { Button } from "../UI/Button";
import { Checkbox } from "../UI/Checkbox";
import { getExportStore } from "../../lib/stores/index";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import { useSignalValue } from "../../lib/hooks/useSignals";
import { updateSettingValue } from "../../lib/settings/store";
import { facadeSignal } from "../../app";
import Select from "../UI/Select";
import {
  getExportInitializer,
  getExportParameter,
} from "../../lib/stores/ExportInitializer";
import type { ImageFormat } from "../../lib/stores/ExportStore";

// Image format options
const FORMAT_OPTIONS = [
  { label: "PNG", value: "png" },
  { label: "JPG", value: "jpg" },
  { label: "WebP", value: "webp" },
];

interface SavePanelProps {
  // No props needed for now
}

const SavePanel: FunctionComponent<SavePanelProps> = () => {
  console.log("SavePanel: Component rendering");

  // Get the initializer and store
  const initializer = getExportInitializer();
  const exportStore = getExportStore();

  // Maintain canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Use signals directly with custom hooks
  const transparentBg = useSignalValue(getExportParameter("transparent"));
  const highQuality = useSignalValue(getExportParameter("highQuality"));
  const imageFormat = useSignalValue(getExportParameter("imageFormat"));

  // Use computed signal for isExporting since ExportStore doesn't have signal API yet
  const isExporting = useComputed(() => exportStore.get("isExporting"));

  // Get the label for the current format
  const getFormatLabel = () => {
    const option = FORMAT_OPTIONS.find((opt) => opt.value === imageFormat);
    return option ? option.label : "PNG";
  };

  // Set up effect for initialization and cleanup
  useEffect(() => {
    console.log("SavePanel: Setting up effect");

    // Ensure we have latest values from facade
    console.log("SavePanel: Syncing initializer with facade");
    initializer.syncWithFacade();

    // Get canvas dimensions
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      // Try to get renderer dimensions
      try {
        // Access the app using type assertion
        const app = (facade as any).app;
        if (app && app.renderer) {
          const canvas = app.renderer.domElement;
          setCanvasDimensions({
            width: canvas.width,
            height: canvas.height,
          });
        }
      } catch (error) {
        console.warn("SavePanel: Failed to get canvas dimensions:", error);
      }
    }

    // Subscribe to preset-applied event to update our values
    if (facade) {
      const handlePresetApplied = () => {
        console.log("SavePanel: Preset applied, syncing with facade");
        initializer.syncWithFacade();
      };

      facade.on("preset-applied", handlePresetApplied);

      // Clean up event listener
      return () => {
        facade.off("preset-applied", handlePresetApplied);
      };
    }

    // Log current values
    console.log("SavePanel: Current signal values:", {
      transparentBg: transparentBg,
      highQuality: highQuality,
      imageFormat: imageFormat,
    });
  }, []);

  // Handle checkbox change using the initializer
  const handleCheckboxChange = (
    setting: "transparent" | "highQuality",
    checked: boolean
  ) => {
    console.log(`SavePanel: ${setting} changed to ${checked}`);

    if (setting === "transparent") {
      initializer.updateTransparentBackground(checked);

      // Also update the global settings store to keep in sync with ColorsPanel
      updateSettingValue("transparentBackground", checked);
    } else {
      // Update high quality setting
      initializer.updateImageSettings({ highQuality: checked });

      // Explicitly update the facade parameter to ensure it's set correctly
      const facade = facadeSignal.value;
      if (facade && facade.isInitialized()) {
        facade.updateParam("exportHighQuality", checked);
      }
    }
  };

  // Handle format change
  const handleFormatChange = (value: string) => {
    const format = value as ImageFormat;
    console.log(`SavePanel: Format changed to ${format}`);
    initializer.updateImageSettings({ imageFormat: format });
  };

  // Handle save image button click
  const handleSaveImage = async () => {
    console.log("SavePanel: Save image requested");

    try {
      // Update the export store settings to ensure they're properly applied
      console.log(
        `SavePanel: Using current settings - Transparent bg=${transparentBg}, High quality=${highQuality}`
      );

      exportStore.updateImageSettings({
        transparent: transparentBg,
        highQuality: highQuality,
        format: imageFormat as ImageFormat,
      });

      // Export the image through the store
      console.log("SavePanel: Exporting image...");
      await exportStore.exportImage();

      // Download the exported image
      console.log("SavePanel: Downloading export...");
      exportStore.downloadLastExport();
    } catch (error) {
      console.error("SavePanel: Failed to save image:", error);
    }
  };

  return (
    <>
      <SettingsGroup collapsible={false} header={false}>
        <SettingsField label="Format">
          <Select.Root value={imageFormat} onValueChange={handleFormatChange}>
            <Select.Trigger>{getFormatLabel()}</Select.Trigger>
            <Select.Content>
              {FORMAT_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </SettingsField>

        <SettingsField label="Transparent Background">
          <Checkbox
            checked={transparentBg}
            onChange={(checked) => handleCheckboxChange("transparent", checked)}
          />
        </SettingsField>

        <SettingsField label="High Quality">
          <Checkbox
            checked={highQuality}
            onChange={(checked) => handleCheckboxChange("highQuality", checked)}
          />
        </SettingsField>
      </SettingsGroup>
      <SettingsGroup collapsible={false} header={false}>
        {canvasDimensions.width > 0 && (
          <SettingsField label="Dimensions">
            <div className="">
              {canvasDimensions.width} × {canvasDimensions.height}px
            </div>
          </SettingsField>
        )}
        <Button
          onClick={handleSaveImage}
          variant="primary"
          size="small"
          disabled={isExporting.value}
        >
          {isExporting.value ? "Exporting..." : "Save Image"}
        </Button>
      </SettingsGroup>
    </>
  );
};

export default SavePanel;
