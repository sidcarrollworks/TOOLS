import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { Button } from "../UI";
import { ExportPanel } from "./ExportPanel";
import { facadeSignal } from "../../app";
import type { IShaderAppFacade } from "../../lib/facade/types";

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
  // Use internal state if external state is not provided
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external or internal state/handlers based on what's provided
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const onOpenChange = externalOnOpenChange || setInternalIsOpen;

  const facadeValue = facadeSignal.value;
  const facade: IShaderAppFacade | undefined = facadeValue || undefined;

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };

  console.log("ExportButton rendering with isOpen:", isOpen);

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant={variant}
        size={size}
      >
        {label}
      </Button>

      <ExportPanel
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        facade={facade}
      />
    </>
  );
};
