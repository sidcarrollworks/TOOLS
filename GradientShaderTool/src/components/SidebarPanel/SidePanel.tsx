import type { FunctionComponent } from "preact";
import { signal, useComputed } from "@preact/signals";
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
} from "../Icons";
import SettingsPanel from "./SettingsPanel";
import { facadeSignal } from "../../app";

// Create a signal for the active panel
export const activePanelSignal = signal<string | null>(null);
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

  const handleIconClick = (panelName: string) => {
    // Toggle the panel if it's already active
    if (activePanelSignal.value === panelName) {
      activePanelSignal.value = null;
    } else {
      activePanelSignal.value = panelName;
    }
  };

  // Handle the code icon click specially - directly export code
  const handleCodeIconClick = () => {
    // If facade is available, call exportAsCode directly
    if (facade.value && facade.value.isInitialized()) {
      facade.value.exportAsCode();
    }
  };

  // Handle container click to prevent propagation
  const handleContainerClick = (e: MouseEvent) => {
    e.stopPropagation();
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
          label="Camera Settings"
          isActive={activePanelSignal.value === "camera"}
          onClick={() => handleIconClick("camera")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<SaveIcon />}
          label="Save Image"
          isActive={activePanelSignal.value === "save"}
          onClick={() => handleIconClick("save")}
          tooltipPosition="left"
        />
        <IconButton
          icon={<CodeIcon />}
          label="Export Code"
          isActive={false} // Never active since we don't open the panel
          onClick={handleCodeIconClick}
          tooltipPosition="left"
        />
      </div>

      {/* Add the SettingsPanel outside the sidePanel div */}
      <SettingsPanel />
    </div>
  );
};

export default SidePanel;
