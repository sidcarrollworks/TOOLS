import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import { activePanelSignal } from "./SidePanel";
import styles from "./SettingsPanel.module.css";
import { X } from "../Icons/X";
import {
  PresetPanel,
  GeometryPanel,
  DistortionPanel,
  ColorsPanel,
  LightingPanel,
  CameraPanel,
  SavePanel,
} from "../Panels";

interface SettingsPanelProps {
  // No props needed for now
}

export const SettingsPanel: FunctionComponent<SettingsPanelProps> = () => {
  // Get the active panel from the signal
  const activePanel = useComputed(() => activePanelSignal.value);

  // Handle close button click
  const handleClose = () => {
    activePanelSignal.value = null;
  };

  // Handle panel click to prevent propagation
  const handlePanelClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  // If no panel is active, don't render anything
  if (!activePanel.value) return null;

  // Get the title based on the active panel
  const getPanelTitle = () => {
    switch (activePanel.value) {
      case "presets":
        return "PRESETS";
      case "geometry":
        return "GEOMETRY";
      case "distortion":
        return "DISTORTION";
      case "colors":
        return "COLORS";
      case "lighting":
        return "LIGHTING";
      case "camera":
        return "CAMERA SETTINGS";
      case "save":
        return "SAVE IMAGE";
      case "code":
        return "EXPORT CODE";
      default:
        return "";
    }
  };

  // Render the appropriate panel content based on the active panel
  const renderPanelContent = () => {
    switch (activePanel.value) {
      case "presets":
        return <PresetPanel />;
      case "geometry":
        return <GeometryPanel />;
      case "distortion":
        return <DistortionPanel />;
      case "colors":
        return <ColorsPanel />;
      case "lighting":
        return <LightingPanel />;
      case "camera":
        return <CameraPanel />;
      case "save":
        return <SavePanel />;
      default:
        return (
          <div className={styles.placeholder}>Settings coming soon...</div>
        );
    }
  };

  return (
    <div className={styles.settingsPanel} onClick={handlePanelClick}>
      <div className={styles.header}>
        <h2 className={styles.title}>{getPanelTitle()}</h2>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close panel"
        >
          <X />
        </button>
      </div>
      <div className={styles.content}>{renderPanelContent()}</div>
    </div>
  );
};

export default SettingsPanel;
