/**
 * ExportUI - Handles export modal UI
 */
import { render, h } from 'preact';
import { ShaderApp } from "../../ShaderApp";
import { ExportPanel } from '../../../components/Export';

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
      this.modalContainer = document.createElement('div');
      this.modalContainer.id = 'export-modal-container';
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
    
    const handleClose = () => {
      this.isOpen = false;
      this.renderExportPanel();
    };
    
    render(
      h(ExportPanel, { 
        app: this.app, 
        isOpen: this.isOpen, 
        onClose: handleClose 
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