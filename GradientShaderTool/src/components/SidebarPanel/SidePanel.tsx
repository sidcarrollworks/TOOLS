import { signal, useComputed } from "@preact/signals";
import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import styles from "./SidePanel.module.css";
import { IconButton } from "../UI/IconButton";
import {
  PresetIcon,
  GeometryIcon,
  DistortionIcon,
  ColorsIcon,
  LightingIcon,
  CameraIcon,
  SaveIcon,
  CodeIcon,
  X,
} from "../Icons";
import PresetPanel from "../Panels/PresetPanel";
import GeometryPanel from "../Panels/GeometryPanel";
import ColorsPanel from "../Panels/ColorsPanel";
import LightingPanel from "../Panels/LightingPanel";
import CameraPanel from "../Panels/CameraPanel";
import { facadeSignal } from "../../app";
import SavePanel from "../Panels/SavePanel";
import DistortionPanel from "../Panels/DistortionPanel";

// Create a signal for the active panel
export const activePanelSignal = signal<string | null>("presets");
// Create a signal for the sidepanel visibility
export const sidePanelVisibleSignal = signal<boolean>(true);

interface SidePanelProps {
  visible: boolean;
}

export const SidePanel: FunctionComponent<SidePanelProps> = ({ visible }) => {
  // Use facadeSignal instead of useFacade
  const facade = useComputed(() => facadeSignal.value);
  const exportUIRef = useRef<any>(null);

  // Initialize ExportUI when facade is available
  useEffect(() => {
    if (facade.value && facade.value.isInitialized()) {
      // Dynamically import the ShaderApp to get access to it
      import("../../lib/ShaderApp")
        .then(({ ShaderApp }) => {
          // Import ExportUI
          import("../../lib/modules/export/ExportUI")
            .then(({ ExportUI }) => {
              // We can't access the app property directly, so we'll just use exportAsCode directly
              if (facade.value && !exportUIRef.current) {
                // Create a dummy app instance just for the ExportUI
                // This is a workaround to avoid accessing the internal ShaderApp
                const dummyApp = {
                  exportCode: () => {
                    if (facade.value) {
                      facade.value.exportAsCode();
                    }
                  },
                };

                console.log("Creating ExportUI instance");
                exportUIRef.current = new ExportUI(dummyApp as any);
              }
            })
            .catch((err) => {
              console.error("Error loading ExportUI:", err);
            });
        })
        .catch((err) => {
          console.error("Error loading ShaderApp:", err);
        });
    }

    // Clean up on unmount
    return () => {
      if (exportUIRef.current) {
        console.log("Disposing ExportUI instance");
        exportUIRef.current.dispose();
        exportUIRef.current = null;
      }
    };
  }, [facade.value]);

  // Check both the prop and the signal for visibility
  if (!visible || !sidePanelVisibleSignal.value) return null;

  // Handle icon click to change active panel
  const handleIconClick = (panelName: string) => {
    // Toggle panel if clicking the active one
    if (activePanelSignal.value === panelName) {
      activePanelSignal.value = null;
    } else {
      activePanelSignal.value = panelName;
    }
  };

  // Handle export code click
  const handleExportCodeClick = () => {
    console.log("Export code button clicked");
    if (exportUIRef.current) {
      console.log("Showing export code UI");
      exportUIRef.current.showExportCode();
    } else {
      console.error("ExportUI instance not available");
    }
  };

  // Handle container click to prevent propagation
  const handleContainerClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleSettingsClose = () => {
    activePanelSignal.value = null;
  };

  return (
    <div className={styles.sidePanelContainer} onClick={handleContainerClick}>
      <div className={styles.sidePanel}>
        <IconButton
          icon={<PresetIcon />}
          label="Presets"
          isActive={activePanelSignal.value === "presets"}
          onClick={() => handleIconClick("presets")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<GeometryIcon />}
          label="Geometry"
          isActive={activePanelSignal.value === "geometry"}
          onClick={() => handleIconClick("geometry")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<DistortionIcon />}
          label="Distortion"
          isActive={activePanelSignal.value === "distortion"}
          onClick={() => handleIconClick("distortion")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<ColorsIcon />}
          label="Colors"
          isActive={activePanelSignal.value === "colors"}
          onClick={() => handleIconClick("colors")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<LightingIcon />}
          label="Lighting"
          isActive={activePanelSignal.value === "lighting"}
          onClick={() => handleIconClick("lighting")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<CameraIcon />}
          label="Camera"
          isActive={activePanelSignal.value === "camera"}
          onClick={() => handleIconClick("camera")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<SaveIcon />}
          label="Save"
          isActive={activePanelSignal.value === "save"}
          onClick={() => handleIconClick("save")}
          tooltipPosition="left"
        />

        <IconButton
          icon={<CodeIcon />}
          label="Export Code"
          isActive={false}
          onClick={handleExportCodeClick}
          tooltipPosition="left"
        />
      </div>

      {activePanelSignal.value && (
        <div className={styles.contentPanel}>
          <div className={styles.header}>
            <h2 className={styles.title}>{activePanelSignal.value}</h2>
            <button
              className={styles.closeButton}
              onClick={handleSettingsClose}
              aria-label="Close panel"
            >
              <X />
            </button>
          </div>
          {activePanelSignal.value === "presets" && <PresetPanel />}
          {activePanelSignal.value === "geometry" && <GeometryPanel />}
          {activePanelSignal.value === "distortion" && <DistortionPanel />}
          {activePanelSignal.value === "colors" && <ColorsPanel />}
          {activePanelSignal.value === "lighting" && <LightingPanel />}
          {activePanelSignal.value === "camera" && <CameraPanel />}
          {activePanelSignal.value === "save" && <SavePanel />}
        </div>
      )}
    </div>
  );
};

export default SidePanel;
