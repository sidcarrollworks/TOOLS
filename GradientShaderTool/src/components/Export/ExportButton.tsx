import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import type { ShaderApp } from "../../lib/ShaderApp";
import { Button } from "../UI";
import { ExportPanel } from "./ExportPanel";

interface ExportButtonProps {
  app: ShaderApp;
  label?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "small" | "medium" | "large";
}

export const ExportButton: FunctionComponent<ExportButtonProps> = ({
  app,
  label = "Export",
  variant = "primary",
  size = "medium",
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
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

      <ExportPanel
        app={app}
        isOpen={isModalOpen}
        onOpenChange={handleOpenChange}
      />
    </>
  );
};
