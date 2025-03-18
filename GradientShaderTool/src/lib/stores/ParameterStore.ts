import { StoreBase } from "./StoreBase";
import { facadeSignal } from "../../app";
import { getUIStore } from "./UIStore";
import { getHistoryStore } from "./HistoryStore";
import type { ShaderParams } from "../ShaderApp";

/**
 * Parameter descriptor interface
 */
export interface ParameterDescriptor {
  /**
   * Parameter ID
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Parameter group
   */
  group?: string;

  /**
   * Default value
   */
  defaultValue: any;

  /**
   * Minimum value (for numeric parameters)
   */
  min?: number;

  /**
   * Maximum value (for numeric parameters)
   */
  max?: number;

  /**
   * Step value (for numeric parameters)
   */
  step?: number;

  /**
   * Parameter type (number, boolean, color, etc.)
   */
  type?: string;
}

/**
 * Parameter value with metadata
 */
export interface ParameterValue {
  /**
   * The current value
   */
  value: number | boolean | string | number[];

  /**
   * Original value (from descriptor)
   */
  defaultValue: number | boolean | string | number[];

  /**
   * Last value before current change
   */
  previousValue?: number | boolean | string | number[];

  /**
   * Time of last change
   */
  lastChanged?: number;
}

/**
 * Group of parameters
 */
export interface ParameterGroup {
  /**
   * Group ID
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Parameter IDs in this group
   */
  parameterIds: string[];

  /**
   * Whether the group is expanded
   */
  isExpanded: boolean;

  /**
   * Group order (for sorting)
   */
  order: number;
}

/**
 * Parameter descriptor with extended metadata
 */
export interface EnhancedParameterDescriptor extends ParameterDescriptor {
  /**
   * Group this parameter belongs to
   */
  groupId?: string;

  /**
   * Whether the parameter is locked (cannot be changed)
   */
  isLocked?: boolean;

  /**
   * Whether the parameter is hidden from UI
   */
  isHidden?: boolean;

  /**
   * Order within group (for sorting)
   */
  order?: number;
}

/**
 * Parameter store state
 */
export interface ParameterState {
  /**
   * All available parameters
   */
  parameters: Record<string, EnhancedParameterDescriptor>;

  /**
   * Current values for all parameters
   */
  values: Record<string, ParameterValue>;

  /**
   * Parameter groups
   */
  groups: Record<string, ParameterGroup>;

  /**
   * Is loading parameters
   */
  isLoading: boolean;

  /**
   * Error message
   */
  errorMessage: string | null;
}

/**
 * Store for managing shader parameters
 */
export class ParameterStore extends StoreBase<ParameterState> {
  /**
   * Create a new parameter store
   */
  constructor() {
    super(
      {
        parameters: {},
        values: {},
        groups: {},
        isLoading: false,
        errorMessage: null,
      },
      { name: "ParameterStore", debug: false }
    );

    // Initialize parameters when facade is available
    this.initializeParametersFromFacade();
  }

  /**
   * Initialize parameters from facade
   */
  private initializeParametersFromFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) return;

    this.set("isLoading", true);

    try {
      // Since the facade doesn't provide parameter descriptors directly,
      // we'll create them from the available parameters
      const allParams = facade.getAllParams() || {};

      // Initialize parameter objects and values
      const parameters: Record<string, EnhancedParameterDescriptor> = {};
      const values: Record<string, ParameterValue> = {};
      const groupMap: Record<string, string[]> = {};

      // Process parameters and create descriptors
      Object.entries(allParams).forEach(([paramId, paramValue]) => {
        // Infer parameter type
        const type = typeof paramValue;

        // Create a basic descriptor
        const descriptor: ParameterDescriptor = {
          id: paramId,
          name: this.formatParameterName(paramId),
          defaultValue: paramValue,
          type: Array.isArray(paramValue) ? "array" : type,
          // Assume default group for now
          group: "default",
        };

        // Add numeric bounds if it's a number
        if (type === "number") {
          descriptor.min = 0;
          descriptor.max = 1;
          descriptor.step = 0.01;
        }

        // Create enhanced descriptor
        const enhancedDescriptor: EnhancedParameterDescriptor = {
          ...descriptor,
          groupId: descriptor.group,
          isLocked: false,
          isHidden: false,
          order: 0,
        };

        parameters[paramId] = enhancedDescriptor;

        // Set up parameter value
        values[paramId] = {
          value: paramValue,
          defaultValue: paramValue,
          lastChanged: Date.now(),
        };

        // Add to group map
        const groupId = enhancedDescriptor.groupId || "default";
        if (!groupMap[groupId]) {
          groupMap[groupId] = [];
        }
        groupMap[groupId].push(paramId);
      });

      // Create parameter groups
      const groups: Record<string, ParameterGroup> = {};

      Object.entries(groupMap).forEach(([groupId, paramIds], index) => {
        groups[groupId] = {
          id: groupId,
          name: this.formatGroupName(groupId),
          parameterIds: paramIds,
          isExpanded: index === 0, // Expand first group by default
          order: index,
        };
      });

      // Update store state
      this.setState({
        parameters,
        values,
        groups,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load parameters:", error);
      this.setState({
        errorMessage: "Failed to load parameters",
        isLoading: false,
      });
      getUIStore().showToast("Failed to load parameters", "error");
    }
  }

  /**
   * Format a parameter ID into a display name
   */
  private formatParameterName(paramId: string): string {
    // Convert camelCase or snake_case to Title Case
    return paramId
      .replace(/([A-Z])/g, " $1") // camelCase to space-separated
      .replace(/_/g, " ") // snake_case to space-separated
      .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Format a group ID into a display name
   */
  private formatGroupName(groupId: string): string {
    if (groupId === "default") return "General";

    // Convert camelCase or snake_case to Title Case
    return groupId
      .replace(/([A-Z])/g, " $1") // camelCase to space-separated
      .replace(/_/g, " ") // snake_case to space-separated
      .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Get a parameter value
   */
  public getValue(parameterId: string): any {
    const paramValue = this.get("values")[parameterId];
    return paramValue ? paramValue.value : undefined;
  }

  /**
   * Get a parameter descriptor
   */
  public getParameter(
    parameterId: string
  ): EnhancedParameterDescriptor | undefined {
    return this.get("parameters")[parameterId];
  }

  /**
   * Set a parameter value
   */
  public setValue(
    parameterId: string,
    value: any,
    recordHistory: boolean = true
  ): boolean {
    const facade = facadeSignal.value;
    if (!facade) {
      getUIStore().showToast(
        "Cannot update parameter: Application not ready",
        "error"
      );
      return false;
    }

    const parameter = this.getParameter(parameterId);
    if (!parameter) {
      getUIStore().showToast(`Parameter not found: ${parameterId}`, "error");
      return false;
    }

    // Check if parameter is locked
    if (parameter.isLocked) {
      getUIStore().showToast(
        `Parameter is locked: ${parameter.name}`,
        "warning"
      );
      return false;
    }

    try {
      // Get current value for history
      const currentValue = this.getValue(parameterId);

      // Apply to facade - use type assertion since we know this is a valid parameter
      facade.updateParam(parameterId as keyof ShaderParams, value);

      // Update our store
      const values = { ...this.get("values") };
      values[parameterId] = {
        ...values[parameterId],
        previousValue: currentValue,
        value: value,
        lastChanged: Date.now(),
      };

      this.set("values", values);

      // Record in history if needed
      if (recordHistory && getHistoryStore) {
        const historyStore = getHistoryStore();
        const prevParams = { [parameterId]: currentValue };
        const newParams = { [parameterId]: value };

        historyStore.recordAction(
          `Changed ${parameter.name}`,
          prevParams,
          newParams,
          "parameter-change"
        );
      }

      return true;
    } catch (error) {
      console.error(`Failed to set parameter ${parameterId}:`, error);
      getUIStore().showToast(
        `Failed to update parameter: ${parameter.name}`,
        "error"
      );
      return false;
    }
  }

  /**
   * Reset a parameter to its default value
   */
  public resetParameter(parameterId: string): boolean {
    const parameter = this.getParameter(parameterId);
    if (!parameter) {
      getUIStore().showToast(`Parameter not found: ${parameterId}`, "error");
      return false;
    }

    const paramValue = this.get("values")[parameterId];
    if (!paramValue) return false;

    return this.setValue(parameterId, paramValue.defaultValue);
  }

  /**
   * Reset all parameters to their default values
   */
  public resetAllParameters(): boolean {
    const facade = facadeSignal.value;
    if (!facade) {
      getUIStore().showToast(
        "Cannot reset parameters: Application not ready",
        "error"
      );
      return false;
    }

    try {
      // Get current values for history
      const currentValues = { ...facade.getAllParams() };
      const defaultValues: Record<string, any> = {};

      // Build default values
      Object.values(this.get("parameters")).forEach((param) => {
        defaultValues[param.id] = param.defaultValue;
      });

      // Apply defaults
      facade.batchUpdateParams(defaultValues);

      // Update our store
      const values = { ...this.get("values") };

      Object.keys(values).forEach((paramId) => {
        values[paramId] = {
          ...values[paramId],
          previousValue: values[paramId].value,
          value: values[paramId].defaultValue,
          lastChanged: Date.now(),
        };
      });

      this.set("values", values);

      // Record in history
      if (getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          "Reset all parameters",
          currentValues,
          defaultValues,
          "reset-all"
        );
      }

      getUIStore().showToast("All parameters reset to defaults", "success");
      return true;
    } catch (error) {
      console.error("Failed to reset parameters:", error);
      getUIStore().showToast("Failed to reset parameters", "error");
      return false;
    }
  }

  /**
   * Toggle parameter locked state
   */
  public toggleParameterLock(parameterId: string): boolean {
    const parameters = { ...this.get("parameters") };
    const parameter = parameters[parameterId];

    if (!parameter) {
      getUIStore().showToast(`Parameter not found: ${parameterId}`, "error");
      return false;
    }

    // Toggle lock state
    parameter.isLocked = !parameter.isLocked;

    // Update parameters
    parameters[parameterId] = parameter;
    this.set("parameters", parameters);

    const action = parameter.isLocked ? "Locked" : "Unlocked";
    getUIStore().showToast(`${action} parameter: ${parameter.name}`, "info");
    return true;
  }

  /**
   * Toggle group expanded state
   */
  public toggleGroupExpanded(groupId: string): boolean {
    const groups = { ...this.get("groups") };
    const group = groups[groupId];

    if (!group) {
      getUIStore().showToast(`Group not found: ${groupId}`, "error");
      return false;
    }

    // Toggle state
    group.isExpanded = !group.isExpanded;

    // Update groups
    groups[groupId] = group;
    this.set("groups", groups);

    return true;
  }

  /**
   * Get all parameters in a group
   */
  public getParametersInGroup(groupId: string): EnhancedParameterDescriptor[] {
    const group = this.get("groups")[groupId];
    if (!group) return [];

    return group.parameterIds
      .map((id) => this.get("parameters")[id])
      .filter((param) => param && !param.isHidden);
  }

  /**
   * Batch update parameters
   */
  public batchUpdateParameters(
    updates: Record<string, any>,
    recordHistory: boolean = true
  ): boolean {
    const facade = facadeSignal.value;
    if (!facade) {
      getUIStore().showToast(
        "Cannot update parameters: Application not ready",
        "error"
      );
      return false;
    }

    try {
      // Get current values for history
      const prevParams: Record<string, any> = {};
      Object.keys(updates).forEach((id) => {
        prevParams[id] = this.getValue(id);
      });

      // Apply updates to facade
      facade.batchUpdateParams(updates);

      // Update our store
      const values = { ...this.get("values") };

      Object.entries(updates).forEach(([id, value]) => {
        if (values[id]) {
          values[id] = {
            ...values[id],
            previousValue: values[id].value,
            value: value,
            lastChanged: Date.now(),
          };
        }
      });

      this.set("values", values);

      // Record in history
      if (recordHistory && getHistoryStore) {
        const historyStore = getHistoryStore();
        historyStore.recordAction(
          `Updated ${Object.keys(updates).length} parameters`,
          prevParams,
          updates,
          "batch-update"
        );
      }

      return true;
    } catch (error) {
      console.error("Failed to batch update parameters:", error);
      getUIStore().showToast("Failed to update parameters", "error");
      return false;
    }
  }

  /**
   * Check if any parameters have been modified from defaults
   */
  public hasModifiedParameters(): boolean {
    const values = this.get("values");

    return Object.values(values).some((paramValue) => {
      return (
        JSON.stringify(paramValue.value) !==
        JSON.stringify(paramValue.defaultValue)
      );
    });
  }

  /**
   * Synchronize our store with current facade values
   */
  public syncWithFacade(): void {
    const facade = facadeSignal.value;
    if (!facade) return;

    try {
      const values = { ...this.get("values") };
      const parameters = this.get("parameters");

      // Update all known parameters
      Object.keys(parameters).forEach((id) => {
        // Use type assertion to tell TypeScript this is a valid parameter name
        const currentValue = facade.getParam(id as keyof ShaderParams);

        if (values[id]) {
          values[id] = {
            ...values[id],
            value: currentValue,
          };
        }
      });

      this.set("values", values);
    } catch (error) {
      console.error("Failed to sync with facade:", error);
    }
  }
}

// Singleton instance
let parameterStore: ParameterStore | null = null;

/**
 * Get the parameter store instance
 */
export function getParameterStore(): ParameterStore {
  if (!parameterStore) {
    parameterStore = new ParameterStore();
  }
  return parameterStore;
}
