import type { FunctionComponent } from "preact";
import { useComputed } from "@preact/signals";
import "./Panel.css";
import { Button } from "../UI/Button";
import { Checkbox } from "../UI/Checkbox";
import {
  getPanelSettings,
  getSettingValue,
  updateSettingValue,
} from "../../lib/settings/store";
import type { SettingGroup } from "../../lib/settings/types";
import { appSignal } from "../../app";

interface SavePanelProps {
  // No props needed for now
}

const SavePanel: FunctionComponent<SavePanelProps> = () => {
  // Get the app instance
  const app = useComputed(() => appSignal.value);

  // Get the save panel settings
  const savePanelConfigSignal = getPanelSettings("save");
  const savePanelConfig = useComputed(() => savePanelConfigSignal.value);

  // If no settings are available, show a placeholder
  if (!savePanelConfig.value) {
    return <div className="noSettings">No save settings available</div>;
  }

  // Find the save options group
  const saveOptionsGroup = savePanelConfig.value.groups.find(
    (group: SettingGroup) => group.id === "saveOptions"
  );

  // Handle checkbox change
  const handleCheckboxChange = (id: string, checked: boolean) => {
    updateSettingValue(id, checked);
  };

  // Handle save image
  const handleSaveImage = () => {
    if (app.value && app.value.exportManager) {
      app.value.exportManager.saveAsImage();
    }
  };

  // Handle save animation
  const handleSaveAnimation = () => {
    if (app.value) {
      // Animation export functionality goes here
      alert("Animation export not implemented yet");
    }
  };

  // Handle save code
  const handleSaveCode = () => {
    if (app.value && app.value.exportManager) {
      app.value.exportManager.exportCode();
    }
  };

  return (
    <div className="panel">
      {/* Export Options */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Export Options</h3>

        {/* Transparent Background Toggle */}
        <Checkbox
          label="Transparent Background"
          checked={getSettingValue("exportTransparentBg") as boolean}
          onChange={(checked) =>
            handleCheckboxChange("exportTransparentBg", checked)
          }
        />

        {/* High Quality Toggle */}
        <Checkbox
          label="High Quality"
          checked={getSettingValue("exportHighQuality") as boolean}
          onChange={(checked) =>
            handleCheckboxChange("exportHighQuality", checked)
          }
        />
      </div>

      {/* Export Buttons */}
      <div className="settingsGroup">
        <h3 className="groupTitle">Export</h3>
        <div className="buttonGrid">
          <Button onClick={handleSaveImage} variant="primary">
            Save Image
          </Button>
          <Button onClick={handleSaveAnimation}>Save Animation</Button>
          <Button onClick={handleSaveCode}>Save Code</Button>
        </div>
      </div>
    </div>
  );
};

export default SavePanel;
