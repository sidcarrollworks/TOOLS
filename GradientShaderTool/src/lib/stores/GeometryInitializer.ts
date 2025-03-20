import { getGeometryStore } from "./GeometryStore";
import { getParameterStore } from "./ParameterStore";
import { facadeSignal } from "../../app";

/**
 * Default geometry values
 */
const DEFAULT_GEOMETRY_VALUES = {
  // Plane geometry
  planeWidth: 2,
  planeHeight: 2,
  planeSegments: 128,

  // Sphere geometry
  sphereRadius: 1,
  sphereWidthSegments: 32,
  sphereHeightSegments: 32,

  // Cube geometry
  cubeSize: 1,
  cubeSegments: 1,
};

/**
 * Initialize the geometry parameters
 * This ensures all required geometry parameters are set with default values if not already defined
 */
export function initializeGeometryParameters(): void {
  const geometryStore = getGeometryStore();
  const parameterStore = getParameterStore();
  const facade = facadeSignal.value;

  if (!facade) {
    console.error(
      "Cannot initialize geometry parameters: Facade not available"
    );
    return;
  }

  try {
    // Get current geometry type
    const geometryType = geometryStore.get("geometryType");

    // Initialize parameters with defaults if they don't exist
    if (geometryType === "plane") {
      ensureParameterExists(
        facade,
        parameterStore,
        "planeWidth",
        DEFAULT_GEOMETRY_VALUES.planeWidth
      );
      ensureParameterExists(
        facade,
        parameterStore,
        "planeHeight",
        DEFAULT_GEOMETRY_VALUES.planeHeight
      );
      ensureParameterExists(
        facade,
        parameterStore,
        "planeSegments",
        DEFAULT_GEOMETRY_VALUES.planeSegments
      );
    } else if (geometryType === "sphere") {
      ensureParameterExists(
        facade,
        parameterStore,
        "sphereRadius",
        DEFAULT_GEOMETRY_VALUES.sphereRadius
      );
      ensureParameterExists(
        facade,
        parameterStore,
        "sphereWidthSegments",
        DEFAULT_GEOMETRY_VALUES.sphereWidthSegments
      );
      ensureParameterExists(
        facade,
        parameterStore,
        "sphereHeightSegments",
        DEFAULT_GEOMETRY_VALUES.sphereHeightSegments
      );
    } else if (geometryType === "cube") {
      ensureParameterExists(
        facade,
        parameterStore,
        "cubeSize",
        DEFAULT_GEOMETRY_VALUES.cubeSize
      );
      ensureParameterExists(
        facade,
        parameterStore,
        "cubeSegments",
        DEFAULT_GEOMETRY_VALUES.cubeSegments
      );
    }

    // Always ensure wireframe parameter is set
    if (facade.getParam("showWireframe") === undefined) {
      facade.updateParam("showWireframe", false);
      parameterStore.setValue("showWireframe", false);
    }

    console.log(
      `Geometry parameters initialized for geometry type: ${geometryType}`
    );
  } catch (error) {
    console.error("Failed to initialize geometry parameters:", error);
  }
}

/**
 * Synchronize geometry parameters from the facade to the local state
 * @param geometryParams Record to update with current parameter values
 * @param geometryType Current geometry type
 * @returns Updated geometry parameters
 */
export function syncGeometryParameters(
  geometryParams: Record<string, number>,
  geometryType: string
): Record<string, number> {
  const facade = facadeSignal.value;
  const parameterStore = getParameterStore();

  if (!facade || !facade.isInitialized()) {
    // Fallback to parameter store if facade isn't available
    return syncGeometryParametersFromStore(
      geometryParams,
      geometryType,
      parameterStore
    );
  }

  // Get all geometry parameters based on type
  if (geometryType === "plane") {
    updateParamIfExists(geometryParams, facade, "planeWidth");
    updateParamIfExists(geometryParams, facade, "planeHeight");
    updateParamIfExists(geometryParams, facade, "planeSegments");
  } else if (geometryType === "sphere") {
    updateParamIfExists(geometryParams, facade, "sphereRadius");
    updateParamIfExists(geometryParams, facade, "sphereWidthSegments");
    updateParamIfExists(geometryParams, facade, "sphereHeightSegments");
  } else if (geometryType === "cube") {
    updateParamIfExists(geometryParams, facade, "cubeSize");
    updateParamIfExists(geometryParams, facade, "cubeSegments");
  }

  return geometryParams;
}

/**
 * Fallback method to sync geometry parameters from the parameter store
 */
function syncGeometryParametersFromStore(
  geometryParams: Record<string, number>,
  geometryType: string,
  parameterStore: ReturnType<typeof getParameterStore>
): Record<string, number> {
  // Get all geometry parameters based on type
  if (geometryType === "plane") {
    updateParamFromStore(geometryParams, parameterStore, "planeWidth");
    updateParamFromStore(geometryParams, parameterStore, "planeHeight");
    updateParamFromStore(geometryParams, parameterStore, "planeSegments");
  } else if (geometryType === "sphere") {
    updateParamFromStore(geometryParams, parameterStore, "sphereRadius");
    updateParamFromStore(geometryParams, parameterStore, "sphereWidthSegments");
    updateParamFromStore(
      geometryParams,
      parameterStore,
      "sphereHeightSegments"
    );
  } else if (geometryType === "cube") {
    updateParamFromStore(geometryParams, parameterStore, "cubeSize");
    updateParamFromStore(geometryParams, parameterStore, "cubeSegments");
  }

  return geometryParams;
}

/**
 * Helper function to ensure a parameter exists in both the facade and parameter store
 */
function ensureParameterExists(
  facade: any,
  parameterStore: ReturnType<typeof getParameterStore>,
  paramName: string,
  defaultValue: number
): void {
  const value = facade.getParam(paramName);
  if (value === undefined) {
    facade.updateParam(paramName, defaultValue);
    parameterStore.setValue(paramName, defaultValue);
  }
}

/**
 * Helper function to update a parameter in the geometry params object if it exists in the facade
 */
function updateParamIfExists(
  geometryParams: Record<string, number>,
  facade: any,
  paramName: string
): void {
  const value = facade.getParam(paramName);
  if (value !== undefined) {
    geometryParams[paramName] = value;
  }
}

/**
 * Helper function to update a parameter in the geometry params object from the parameter store
 */
function updateParamFromStore(
  geometryParams: Record<string, number>,
  parameterStore: ReturnType<typeof getParameterStore>,
  paramName: string
): void {
  const value = parameterStore.getValue(paramName);
  if (value !== undefined) {
    geometryParams[paramName] = value;
  }
}

/**
 * Sync the wireframe state from the parameter store
 * @returns Current wireframe state
 */
export function syncWireframeState(): boolean {
  const facade = facadeSignal.value;
  const parameterStore = getParameterStore();

  // Try to get wireframe setting from facade first
  if (facade && facade.isInitialized()) {
    const wireframeValue = facade.getParam("showWireframe");
    if (wireframeValue !== undefined) {
      return wireframeValue;
    }
  }

  // Fallback to parameter store
  const wireframeValue = parameterStore.getValue("showWireframe");
  return wireframeValue !== undefined ? wireframeValue : false;
}

/**
 * Update a geometry parameter in both the store and facade
 * @param paramId Parameter ID to update
 * @param value New parameter value
 * @param recreateGeometry Whether to recreate the geometry after update
 * @returns Success status of the update
 */
export function updateGeometryParameter(
  paramId: string,
  value: number,
  recreateGeometry = true
): boolean {
  const parameterStore = getParameterStore();
  const facade = facadeSignal.value;

  // Update parameter store
  parameterStore.setValue(paramId, value);

  // Update facade if available
  if (facade && facade.isInitialized()) {
    return facade.updateParam(paramId as any, value, { recreateGeometry });
  }

  return true;
}

/**
 * Update the wireframe display parameter
 * @param checked New wireframe state
 * @returns Success status of the update
 */
export function updateWireframeState(checked: boolean): boolean {
  const parameterStore = getParameterStore();
  const facade = facadeSignal.value;

  // Update parameter store
  parameterStore.setValue("showWireframe", checked);

  // Update facade if available
  if (facade && facade.isInitialized()) {
    return facade.updateParam("showWireframe", checked);
  }

  return true;
}

/**
 * Update the geometry type
 * @param geometryType New geometry type
 * @returns Success status of the update
 */
export function updateGeometryType(geometryType: string): boolean {
  const geometryStore = getGeometryStore();

  // Use the store's built-in method which also updates the facade
  geometryStore.setGeometryType(geometryType);

  // Initialize parameters for this geometry type to ensure all required params exist
  try {
    initializeGeometryParameters();
    return true;
  } catch (error) {
    console.error("Error updating geometry type:", error);
    return false;
  }
}
