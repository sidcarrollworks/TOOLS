import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { Button } from "../UI";
import { ExportPanel } from "./ExportPanel";
import { useComputed } from "@preact/signals";
import { getExportInitializer } from "../../lib/stores/ExportInitializer";
import { getUIStore } from "../../lib/stores/UIStore";

interface ExportButtonProps {
  label?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "small" | "medium" | "large";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ExportButton: FunctionComponent<ExportButtonProps> = ({
  label = "Export",
  variant = "primary",
  size = "medium",
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
}) => {
  // Get the stores
  const initializer = getExportInitializer();
  const uiStore = getUIStore();

  // Use internal state if external state is not provided
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external or internal state/handlers based on what's provided
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const onOpenChange = externalOnOpenChange || setInternalIsOpen;

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);

    // Track modal state in UIStore if we're opening
    if (open) {
      uiStore.openModal("export");
    } else {
      uiStore.closeModal();
    }
  };

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant={variant}
        size={size}
      >
        {label}
      </Button>

      <ExportPanel isOpen={isOpen} onOpenChange={handleOpenChange} />
    </>
  );
};
