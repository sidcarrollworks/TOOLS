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
import { useFacade } from "../../lib/facade/FacadeContext";

interface SavePanelProps {
  // No props needed for now
}

const SavePanel: FunctionComponent<SavePanelProps> = () => {
  // Get the facade instance using the hook
  const facade = useFacade();

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

  // Handle save image button click
  const handleSaveImage = () => {
    if (facade.isInitialized()) {
      facade.exportAsImage({
        transparent: getSettingValue("transparentBackground"),
        highQuality: getSettingValue("exportHighQuality"),
      });
    }
  };

  return (
    <div className="panel">
      {/* Export Options */}
      <div className="settingsGroup">
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
        <Button onClick={handleSaveImage} variant="primary">
          Save Image
        </Button>
      </div>
    </div>
  );
};

export default SavePanel;
