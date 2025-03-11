import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import type { ShaderApp } from "../../lib/ShaderApp";
import { ExportPanel } from "./ExportPanel";
import styles from "./Export.module.css";

interface ExportButtonProps {
  app: ShaderApp;
  label?: string;
}

export const ExportButton: FunctionComponent<ExportButtonProps> = ({
  app,
  label = "Export",
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button onClick={handleOpenModal} className={styles.exportButton}>
        {label}
      </button>

      <ExportPanel app={app} isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
};
