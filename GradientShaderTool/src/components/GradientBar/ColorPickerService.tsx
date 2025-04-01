import { render } from "preact";
import { ColorPickerPopover } from "./ColorPickerPopover";

// Flag to indicate if color picker interactions are happening
// This is used by other components to block polling during interactions
let isColorPickerInteracting = false;

// Interfaces for the color picker events
interface ColorPickerOptions {
  color: string;
  position: { x: number; y: number };
  onColorChange: (color: string) => void;
  onOutsideClick?: () => void; // Add a callback for outside clicks
  onDelete?: () => void; // Add callback for delete action
}

// Singleton class to manage the color picker
class ColorPickerManager {
  private containerElement: HTMLDivElement | null = null;
  private isPickerOpen = false;
  private activeOptions: ColorPickerOptions | null = null;

  constructor() {
    // Create a container element for the color picker when initialized
    this.createContainer();

    // Set up document event listeners for outside clicks
    this.setupOutsideClickDetection();
  }

  private setupOutsideClickDetection() {
    // Handler to close the picker when clicking outside
    const handleDocumentMouseDown = (e: MouseEvent) => {
      // Skip if picker is not open
      if (!this.isPickerOpen || !this.containerElement) return;

      // Check if the target or any of its parents has our data attribute
      const pickerElement = (e.target as Element).closest(
        '[data-popover-root="color-picker"]'
      );

      // If we clicked on the picker or its children, don't close
      if (pickerElement || this.containerElement.contains(e.target as Node)) {
        return;
      }

      // Check if the picker is in dragging state
      const isDragging = !!document.querySelector(
        '[data-popover-root="color-picker"][data-is-dragging="true"]'
      );

      // Don't close if we're dragging
      if (isDragging) {
        return;
      }

      // If we got here, it's a click outside the picker and not during dragging
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[ColorPickerService] Outside click detected, closing picker"
        );
      }

      // Close the picker and trigger the outside click callback
      this.closePicker(true);

      // No need to manually call onOutsideClick since closePicker(true) does it
    };

    // Use mousedown for more responsive closing (before the click event)
    document.addEventListener("mousedown", handleDocumentMouseDown);
  }

  private createContainer() {
    // Create container element if it doesn't exist
    if (!this.containerElement) {
      this.containerElement = document.createElement("div");
      this.containerElement.id = "color-picker-container";
      document.body.appendChild(this.containerElement);
    }
  }

  // Set the interaction flag - this is used by other components to block polling
  private setInteracting(value: boolean): void {
    isColorPickerInteracting = value;
  }

  // Open the color picker
  public openPicker(options: ColorPickerOptions): void {
    // Only log on development if needed
    if (process.env.NODE_ENV === "development") {
      console.log("[ColorPickerService] Opening picker");
    }
    this.createContainer(); // Ensure container exists
    this.activeOptions = options;
    this.isPickerOpen = true;
    this.setInteracting(true); // Set interaction flag
    this.renderPicker();
  }

  // Close the color picker
  public closePicker(triggerOutsideClick: boolean = false): void {
    // Only close if it's actually open (prevent unnecessary renders)
    if (!this.isPickerOpen) return;

    // Only log on development if needed
    if (process.env.NODE_ENV === "development") {
      console.log("[ColorPickerService] Closing picker");
    }

    // Store the callbacks before clearing options
    const onOutsideClickCallback = this.activeOptions?.onOutsideClick;

    // Update state
    this.isPickerOpen = false;
    this.activeOptions = null;
    this.setInteracting(false); // Clear interaction flag
    this.renderPicker();

    // Call the outside click callback if requested
    if (triggerOutsideClick && onOutsideClickCallback) {
      onOutsideClickCallback();
    }
  }

  // Handle color change from the picker
  private handleColorChange = (color: string): void => {
    if (this.activeOptions) {
      this.activeOptions.onColorChange(color);
    }
  };

  // Handle delete action from the picker
  private handleDelete = (): void => {
    if (this.activeOptions?.onDelete) {
      this.activeOptions.onDelete();
      this.closePicker(false); // Close the picker after deletion
    }
  };

  // Render the picker
  private renderPicker(): void {
    if (!this.containerElement) return;

    if (this.isPickerOpen && this.activeOptions) {
      // Render the picker
      render(
        <ColorPickerPopover
          color={this.activeOptions.color}
          position={this.activeOptions.position}
          onChange={this.handleColorChange}
          onDelete={this.handleDelete}
        />,
        this.containerElement
      );
    } else {
      // Clear the container when closed
      render(null, this.containerElement);
    }
  }

  // Check if the picker is open
  public isOpen(): boolean {
    return this.isPickerOpen;
  }
}

// Create a singleton instance
const colorPickerService = new ColorPickerManager();

// Export a function to check if color picker is interacting
export function isColorPickerActive(): boolean {
  return isColorPickerInteracting;
}

// Export the service
export default colorPickerService;
