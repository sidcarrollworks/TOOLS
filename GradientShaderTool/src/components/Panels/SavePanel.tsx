import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import * as THREE from "three";

import { Button } from "../UI/Button";
import { Checkbox } from "../UI/Checkbox";
import { SettingsGroup, SettingsField } from "../UI/SettingsGroup";
import Select from "../UI/Select";
import { facadeSignal } from "../../app";

// Image format options
const FORMAT_OPTIONS = [
  { label: "PNG", value: "png" },
  { label: "JPG", value: "jpg" },
  { label: "WebP", value: "webp" },
];

// Format types
type ImageFormat = "png" | "jpg" | "webp";

interface SavePanelProps {
  // No props needed
}

const SavePanel: FunctionComponent<SavePanelProps> = () => {
  // State for UI controls
  const [transparentBg, setTransparentBg] = useState(false);
  const [highQuality, setHighQuality] = useState(true);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("png");
  const [isExporting, setIsExporting] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(false);

  // Get canvas dimensions on component mount
  useEffect(() => {
    // First, get the current transparency setting from ExportInitializer
    const initializeTransparency = async () => {
      try {
        const { getExportInitializer } = await import(
          "../../lib/stores/ExportInitializer"
        );
        const exportInitializer = getExportInitializer();
        const transparentValue =
          !!exportInitializer.getSignal("transparent").value;

        // Update state with the export value
        setTransparentBg(transparentValue);
      } catch (error) {
        console.error("Could not get transparency setting:", error);
      }
    };

    // Initialize transparency setting
    initializeTransparency();

    // Get canvas dimensions
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      try {
        // Get the app instance
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
  }, []);

  // Handle checkbox changes
  const handleTransparentBgChange = (checked: boolean) => {
    setTransparentBg(checked);

    // Update through the ExportInitializer
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      try {
        // Import the ExportInitializer to update the transparency setting
        import("../../lib/stores/ExportInitializer")
          .then(({ getExportInitializer }) => {
            const exportInitializer = getExportInitializer();
            exportInitializer.updateTransparentBackground(checked);
          })
          .catch((error) => {
            console.warn("Error importing ExportInitializer:", error);
          });
      } catch (error) {
        console.warn("Error updating transparent background:", error);
      }
    }
  };

  const handleHighQualityChange = (checked: boolean) => {
    setHighQuality(checked);

    // Update through the ExportInitializer
    const facade = facadeSignal.value;
    if (facade && facade.isInitialized()) {
      try {
        // Import the ExportInitializer to update the high quality setting
        import("../../lib/stores/ExportInitializer")
          .then(({ getExportInitializer }) => {
            const exportInitializer = getExportInitializer();
            exportInitializer.updateParameter("highQuality", checked);
          })
          .catch((error) => {
            console.warn("Error importing ExportInitializer:", error);
          });
      } catch (error) {
        console.warn("Error updating high quality setting:", error);
      }
    }
  };

  // Handle format change
  const handleFormatChange = (value: string) => {
    setImageFormat(value as ImageFormat);
  };

  // Basic direct save image function
  const saveImage = async () => {
    try {
      setIsExporting(true);

      // Use the ExportInitializer to handle the export process
      const { getExportInitializer } = await import(
        "../../lib/stores/ExportInitializer"
      );
      const exportInitializer = getExportInitializer();

      // Make sure the export settings are up to date
      exportInitializer.updateParameters({
        transparent: transparentBg,
        highQuality: highQuality,
        imageFormat: imageFormat,
      });

      // Export the image
      const imageDataUrl = await exportInitializer.exportImage();

      // Download the image
      const linkElement = document.createElement("a");
      linkElement.href = imageDataUrl;

      // Set the filename based on format
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .substring(0, 19);
      linkElement.download = `gradient-shader-${timestamp}.${imageFormat}`;

      // Trigger the download
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      // Show success message
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error("Error exporting image:", error);
      setExportError(true);
      setTimeout(() => setExportError(false), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <SettingsGroup collapsible={false} header={false}>
        <SettingsField label="Format">
          <Select.Root value={imageFormat} onValueChange={handleFormatChange}>
            <Select.Trigger>
              {FORMAT_OPTIONS.find((opt) => opt.value === imageFormat)?.label ||
                "PNG"}
            </Select.Trigger>
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
            onChange={handleTransparentBgChange}
          />
        </SettingsField>

        <SettingsField label="High Quality">
          <Checkbox checked={highQuality} onChange={handleHighQualityChange} />
        </SettingsField>
      </SettingsGroup>
      <SettingsGroup collapsible={false} header={false}>
        {canvasDimensions.width > 0 && (
          <SettingsField label="Dimensions">
            <div style={{ fontSize: "12px" }}>
              {canvasDimensions.width} × {canvasDimensions.height}px
            </div>
          </SettingsField>
        )}
        <Button
          onClick={saveImage}
          variant="primary"
          size="small"
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Save Image"}
        </Button>
      </SettingsGroup>
    </>
  );
};

export default SavePanel;
