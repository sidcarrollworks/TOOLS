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
import {
  PresetPanel,
  GeometryPanel,
  DistortionPanel,
  LightingPanel,
  CameraPanel,
  ColorsPanel,
} from "../Panels";
import SavePanel from "../Panels/SavePanel";
import { facadeSignal } from "../../app";
import { ExportPanel } from "../Export";

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
    ExportPanel.showExportDialog();
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
