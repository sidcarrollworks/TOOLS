import { StoreBase } from "./StoreBase";

/**
 * Interface for toast notification
 */
export interface ToastNotification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timeout: number;
  timestamp: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * Interface for modal data
 */
export interface ModalData {
  id: string;
  title?: string;
  content?: any;
  props?: Record<string, any>;
}

/**
 * UI state interface
 */
export interface UIState {
  // Sidebar state
  sidebarVisible: boolean;
  activePanel: string;

  // Modal state
  activeModal: string | null;
  modalData: ModalData | null;

  // Toast notifications
  toasts: ToastNotification[];

  // Global UI flags
  isLoading: boolean;
  globalError: string | null;

  // User preferences
  darkMode: boolean;
  showHints: boolean;
}

/**
 * Store for UI state management
 */
export class UIStore extends StoreBase<UIState> {
  /**
   * Default toast timeout in milliseconds
   */
  private static DEFAULT_TOAST_TIMEOUT = 5000;

  /**
   * Maximum number of toasts to show
   */
  private static MAX_TOASTS = 5;

  /**
   * Toast timeouts map
   */
  private toastTimeouts: Map<string, number> = new Map();

  /**
   * Create a new UI store
   */
  constructor() {
    super(
      {
        // Initial UI state
        sidebarVisible: true,
        activePanel: "colors",
        activeModal: null,
        modalData: null,
        toasts: [],
        isLoading: false,
        globalError: null,
        darkMode: false,
        showHints: true,
      },
      { name: "UIStore", debug: false }
    );
  }

  /**
   * Toggle sidebar visibility
   */
  public toggleSidebar(): void {
    this.set("sidebarVisible", !this.get("sidebarVisible"));
  }

  /**
   * Set active panel
   */
  public setActivePanel(panel: string): void {
    this.set("activePanel", panel);
  }

  /**
   * Open a modal
   */
  public openModal(id: string, data?: Partial<ModalData>): void {
    this.setState({
      activeModal: id,
      modalData: {
        id,
        ...(data || {}),
      } as ModalData,
    });
  }

  /**
   * Close the active modal
   */
  public closeModal(): void {
    this.setState({
      activeModal: null,
      modalData: null,
    });
  }

  /**
   * Show a toast notification
   */
  public showToast(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    timeout = UIStore.DEFAULT_TOAST_TIMEOUT,
    action?: { label: string; callback: () => void }
  ): string {
    // Generate unique ID
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create toast
    const toast: ToastNotification = {
      id,
      message,
      type,
      timeout,
      timestamp: Date.now(),
      action,
    };

    // Add toast to list
    this.set(
      "toasts",
      [toast, ...this.get("toasts")].slice(0, UIStore.MAX_TOASTS)
    );

    // Setup auto-dismiss
    if (timeout > 0) {
      const timeoutId = window.setTimeout(() => {
        this.dismissToast(id);
      }, timeout);

      this.toastTimeouts.set(id, timeoutId);
    }

    return id;
  }

  /**
   * Dismiss a toast notification
   */
  public dismissToast(id: string): void {
    // Clear timeout if exists
    if (this.toastTimeouts.has(id)) {
      window.clearTimeout(this.toastTimeouts.get(id));
      this.toastTimeouts.delete(id);
    }

    // Remove toast from list
    this.set(
      "toasts",
      this.get("toasts").filter((toast) => toast.id !== id)
    );
  }

  /**
   * Set loading state
   */
  public setLoading(isLoading: boolean): void {
    this.set("isLoading", isLoading);
  }

  /**
   * Set global error
   */
  public setGlobalError(error: string | null): void {
    this.set("globalError", error);

    if (error) {
      this.showToast(error, "error");
    }
  }

  /**
   * Toggle dark mode
   */
  public toggleDarkMode(): void {
    const newValue = !this.get("darkMode");
    this.set("darkMode", newValue);

    // Apply dark mode to document
    if (newValue) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }

  /**
   * Toggle hints visibility
   */
  public toggleHints(): void {
    this.set("showHints", !this.get("showHints"));
  }

  /**
   * Dispose the store
   */
  public dispose(): void {
    // Clear all toast timeouts
    this.toastTimeouts.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    this.toastTimeouts.clear();
  }
}

// Singleton instance
let uiStore: UIStore | null = null;

/**
 * Get the UI store instance
 */
export function getUIStore(): UIStore {
  if (!uiStore) {
    uiStore = new UIStore();
  }
  return uiStore;
}
