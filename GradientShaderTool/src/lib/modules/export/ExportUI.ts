/**
 * ExportUI - Handles export modal UI
 */
import { render, h } from "preact";
import { ShaderApp } from "../../ShaderApp";
import { ExportPanel } from "../../../components/Export";
import { facadeSignal } from "../../../app";

export class ExportUI {
  private app: ShaderApp;
  private modalContainer: HTMLDivElement | null = null;
  private isOpen: boolean = false;

  /**
   * Create a UI manager for exports
   * @param app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
  }

  /**
   * Show export modal with code
   */
  async showExportCode(): Promise<void> {
    // Create container if it doesn't exist
    if (!this.modalContainer) {
      this.modalContainer = document.createElement("div");
      this.modalContainer.id = "export-modal-container";
      document.body.appendChild(this.modalContainer);
    }

    this.isOpen = true;
    this.renderExportPanel();
  }

  /**
   * Render the export panel using Preact
   */
  private renderExportPanel(): void {
    if (!this.modalContainer) return;

    const handleOpenChange = (open: boolean) => {
      this.isOpen = open;
      this.renderExportPanel();
    };

    // Get the current facade from the signal
    const facade = facadeSignal.value;

    if (!facade) {
      console.error("Cannot render export panel: Facade is not available");
      return;
    }

    // Pass the facade directly as a prop to ExportPanel
    render(
      h(ExportPanel, {
        isOpen: this.isOpen,
        onOpenChange: handleOpenChange,
        facade: facade,
      }),
      this.modalContainer
    );
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.modalContainer) {
      render(null, this.modalContainer);
      if (this.modalContainer.parentNode) {
        this.modalContainer.parentNode.removeChild(this.modalContainer);
      }
      this.modalContainer = null;
    }
  }
}
