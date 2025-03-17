import type { FunctionComponent } from "preact";
import styles from "./Layout.module.css";
import { sidePanelVisibleSignal } from "../SidebarPanel/SidePanel";

interface LayoutProps {
  settingsContent?: preact.ComponentChildren;
  isPaused?: boolean;
  showSettings?: boolean;
  showStats?: boolean;
  isFullscreen?: boolean;
  onToggleSettings?: () => void;
  onToggleStats?: () => void;
}

export const Layout: FunctionComponent<LayoutProps> = ({
  settingsContent,
  isPaused = false,
  showSettings = true,
  showStats = true,
  isFullscreen = false,
  onToggleSettings,
  onToggleStats,
}) => {
  return (
    <div className={styles.layoutContainer}>
      {/* We've removed the viewport container, so this component will just handle UI panels */}
      {/* Temporarily disable the settings panel */}
      {/* {showSettings && (
        <div className={styles.settingsPanel}>{settingsContent}</div>
      )} */}
    </div>
  );
};

export default Layout;
