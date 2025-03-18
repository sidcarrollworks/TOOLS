import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";

/**
 * Represents a single history entry that can be undone/redone
 */
export interface HistoryEntry {
  /**
   * Unique ID for this action
   */
  id: string;

  /**
   * Display name for the action
   */
  name: string;

  /**
   * Timestamp when the action occurred
   */
  timestamp: number;

  /**
   * Previous parameter values
   */
  prevParams: Record<string, any>;

  /**
   * New parameter values
   */
  newParams: Record<string, any>;

  /**
   * Type of action (for grouping)
   */
  actionType: string;
}

/**
 * History store state
 */
export interface HistoryState {
  /**
   * History entries
   */
  entries: HistoryEntry[];

  /**
   * Current position in history (index)
   */
  currentIndex: number;

  /**
   * Max history size
   */
  maxSize: number;

  /**
   * Is an undo/redo operation in progress
   */
  isUndoRedoInProgress: boolean;
}

/**
 * Store for managing application history (undo/redo)
 */
export class HistoryStore extends StoreBase<HistoryState> {
  /**
   * Create a new history store
   */
  constructor() {
    super(
      {
        entries: [],
        currentIndex: -1,
        maxSize: 50,
        isUndoRedoInProgress: false,
      },
      { name: "HistoryStore", debug: false }
    );
  }

  /**
   * Record an action in history
   */
  public recordAction(
    name: string,
    prevParams: Record<string, any>,
    newParams: Record<string, any>,
    actionType: string = "parameter-change"
  ): void {
    // Don't record if undoing/redoing is in progress
    if (this.get("isUndoRedoInProgress")) {
      return;
    }

    // Create history entry
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name,
      timestamp: Date.now(),
      prevParams,
      newParams,
      actionType,
    };

    // Get current state
    const currentIndex = this.get("currentIndex");
    const entries = [...this.get("entries")];

    // If we're not at the end of history, remove future entries
    if (currentIndex < entries.length - 1) {
      entries.splice(currentIndex + 1);
    }

    // Add new entry
    entries.push(entry);

    // Trim if exceeding max size
    if (entries.length > this.get("maxSize")) {
      entries.shift();
    }

    // Update state
    this.setState({
      entries,
      currentIndex: entries.length - 1,
    });
  }

  /**
   * Undo the last action
   */
  public undo(): boolean {
    const entries = this.get("entries");
    const currentIndex = this.get("currentIndex");

    // Check if we can undo
    if (currentIndex < 0 || entries.length === 0) {
      getUIStore().showToast("Nothing to undo", "info");
      return false;
    }

    const entry = entries[currentIndex];
    const facade = facadeSignal.value;

    if (!facade) {
      getUIStore().showToast("Cannot undo: Application not ready", "error");
      return false;
    }

    try {
      // Mark that we're performing an undo
      this.set("isUndoRedoInProgress", true);

      // Apply the previous parameters
      facade.batchUpdateParams(entry.prevParams);

      // Update current index
      this.set("currentIndex", currentIndex - 1);

      // Notify user
      getUIStore().showToast(`Undid: ${entry.name}`, "info");

      return true;
    } catch (error) {
      console.error("Failed to undo:", error);
      getUIStore().showToast("Failed to undo", "error");
      return false;
    } finally {
      // Reset flag
      this.set("isUndoRedoInProgress", false);
    }
  }

  /**
   * Redo the last undone action
   */
  public redo(): boolean {
    const entries = this.get("entries");
    const currentIndex = this.get("currentIndex");

    // Check if we can redo
    if (currentIndex >= entries.length - 1 || entries.length === 0) {
      getUIStore().showToast("Nothing to redo", "info");
      return false;
    }

    const nextEntry = entries[currentIndex + 1];
    const facade = facadeSignal.value;

    if (!facade) {
      getUIStore().showToast("Cannot redo: Application not ready", "error");
      return false;
    }

    try {
      // Mark that we're performing a redo
      this.set("isUndoRedoInProgress", true);

      // Apply the new parameters
      facade.batchUpdateParams(nextEntry.newParams);

      // Update current index
      this.set("currentIndex", currentIndex + 1);

      // Notify user
      getUIStore().showToast(`Redid: ${nextEntry.name}`, "info");

      return true;
    } catch (error) {
      console.error("Failed to redo:", error);
      getUIStore().showToast("Failed to redo", "error");
      return false;
    } finally {
      // Reset flag
      this.set("isUndoRedoInProgress", false);
    }
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.setState({
      entries: [],
      currentIndex: -1,
    });
  }

  /**
   * Get history entries by action type
   */
  public getEntriesByType(actionType: string): HistoryEntry[] {
    return this.get("entries").filter(
      (entry) => entry.actionType === actionType
    );
  }

  /**
   * Check if we can undo
   */
  public canUndo(): boolean {
    return this.get("currentIndex") >= 0;
  }

  /**
   * Check if we can redo
   */
  public canRedo(): boolean {
    return this.get("currentIndex") < this.get("entries").length - 1;
  }

  /**
   * Set the maximum history size
   */
  public setMaxSize(size: number): void {
    if (size < 1) {
      size = 1; // At least 1 entry
    }

    const entries = [...this.get("entries")];

    // Trim if current entries exceed new max size
    if (entries.length > size) {
      // Keep most recent entries
      const diff = entries.length - size;
      entries.splice(0, diff);

      // Adjust current index
      let currentIndex = this.get("currentIndex") - diff;
      if (currentIndex < -1) currentIndex = -1;

      this.setState({
        entries,
        currentIndex,
        maxSize: size,
      });
    } else {
      this.set("maxSize", size);
    }
  }
}

// Singleton instance
let historyStore: HistoryStore | null = null;

/**
 * Get the history store instance
 */
export function getHistoryStore(): HistoryStore {
  if (!historyStore) {
    historyStore = new HistoryStore();
  }
  return historyStore;
}
