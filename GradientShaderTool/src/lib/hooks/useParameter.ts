/**
 * useParameter - Custom hook for working with shader parameters via the facade
 */

import { useState, useEffect, useCallback } from "preact/hooks";
import { useFacade } from "../facade/FacadeContext";
import type { ShaderParams } from "../ShaderApp";
import type { ParameterUpdateOptions } from "../facade/types";
import { useDebounce } from "./useDebounce";

/**
 * Options for the useParameter hook
 */
interface UseParameterOptions {
  /** Debounce delay in milliseconds (0 means no debounce) */
  debounceMs?: number;

  /** Whether to recreate geometry when the parameter changes */
  recreateGeometry?: boolean;

  /** Whether to reset camera when the parameter changes */
  resetCamera?: boolean;

  /** Whether to skip validation for the parameter */
  skipValidation?: boolean;

  /** Event to listen for parameter changes */
  listenToEvents?: boolean;
}

/**
 * Hook for working with a single shader parameter
 *
 * @param paramName The name of the parameter to use
 * @param options Options for the parameter hook
 * @returns [value, setValue, isValid] tuple
 */
export function useParameter<K extends keyof ShaderParams>(
  paramName: K,
  options: UseParameterOptions = {}
): [ShaderParams[K], (value: ShaderParams[K]) => void, boolean] {
  // Get the facade instance
  const facade = useFacade();

  // Initialize the parameter value from the facade
  const [value, setValue] = useState<ShaderParams[K]>(() =>
    facade.getParam(paramName)
  );

  // Track parameter validity
  const [isValid, setIsValid] = useState(true);

  // Create the update function with proper options
  const updateParameter = useCallback(
    (newValue: ShaderParams[K]) => {
      // Validate the parameter value
      const validation = facade.validateParam(paramName, newValue);
      setIsValid(validation.valid);

      if (validation.valid) {
        // Apply the parameter update
        const updateOptions: ParameterUpdateOptions = {
          recreateGeometry: options.recreateGeometry,
          resetCamera: options.resetCamera,
          skipValidation: options.skipValidation,
          source: "user",
        };

        facade.updateParam(paramName, newValue, updateOptions);
      }
    },
    [
      facade,
      paramName,
      options.recreateGeometry,
      options.resetCamera,
      options.skipValidation,
    ]
  );

  // Create a debounced update function if needed
  const debouncedUpdateParameter =
    options.debounceMs && options.debounceMs > 0
      ? useDebounce(updateParameter, options.debounceMs)
      : updateParameter;

  // Synchronize with facade events if requested
  useEffect(() => {
    if (!options.listenToEvents) {
      return;
    }

    // Listen for parameter changes from other sources
    const handleParameterChanged = (data: {
      paramName: string;
      value: any;
    }) => {
      if (data.paramName === paramName) {
        setValue(data.value as ShaderParams[K]);
      }
    };

    // Subscribe to parameter change events
    facade.on("parameter-changed", handleParameterChanged);

    // Unsubscribe when the hook unmounts
    return () => {
      facade.off("parameter-changed", handleParameterChanged);
    };
  }, [facade, paramName, options.listenToEvents]);

  return [value, debouncedUpdateParameter, isValid];
}

/**
 * Hook for working with multiple related shader parameters
 *
 * @param paramNames Array of parameter names to use
 * @param options Options for the parameters hook
 * @returns Object with parameter values, setters, and validity
 */
export function useParameterGroup<K extends keyof ShaderParams>(
  paramNames: K[],
  options: UseParameterOptions = {}
): {
  values: { [P in K]: ShaderParams[P] };
  setValues: (updates: Partial<{ [P in K]: ShaderParams[P] }>) => void;
  setValue: (paramName: K, value: ShaderParams[K]) => void;
  isValid: { [P in K]: boolean };
} {
  // Get the facade instance
  const facade = useFacade();

  // Initialize parameter values from the facade
  const [values, setValuesState] = useState<{ [P in K]: ShaderParams[P] }>(
    () => {
      const initialValues = {} as { [P in K]: ShaderParams[P] };

      paramNames.forEach((paramName) => {
        initialValues[paramName] = facade.getParam(paramName);
      });

      return initialValues;
    }
  );

  // Track parameter validity
  const [isValid, setIsValidState] = useState<{ [P in K]: boolean }>(() => {
    const initialValidity = {} as { [P in K]: boolean };

    paramNames.forEach((paramName) => {
      initialValidity[paramName] = true;
    });

    return initialValidity;
  });

  // Function to update a single parameter
  const setValue = useCallback(
    (paramName: K, newValue: ShaderParams[K]) => {
      // Validate the parameter value
      const validation = facade.validateParam(paramName, newValue);

      // Update validity state
      setIsValidState((prev) => ({
        ...prev,
        [paramName]: validation.valid,
      }));

      if (validation.valid) {
        // Update the value in the state
        setValuesState((prev) => ({
          ...prev,
          [paramName]: newValue,
        }));

        // Apply the parameter update
        const updateOptions: ParameterUpdateOptions = {
          recreateGeometry: options.recreateGeometry,
          resetCamera: options.resetCamera,
          skipValidation: options.skipValidation,
          source: "user",
        };

        facade.updateParam(paramName, newValue, updateOptions);
      }
    },
    [
      facade,
      options.recreateGeometry,
      options.resetCamera,
      options.skipValidation,
    ]
  );

  // Function to update multiple parameters at once
  const setValues = useCallback(
    (updates: Partial<{ [P in K]: ShaderParams[P] }>) => {
      // Collect updates and validate them
      const validUpdates: Partial<ShaderParams> = {};
      const newIsValid = { ...isValid };
      let allValid = true;

      // Validate each parameter update
      for (const paramName in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, paramName)) {
          const typedParamName = paramName as K;
          const newValue = updates[typedParamName];

          if (newValue !== undefined) {
            const validation = facade.validateParam(typedParamName, newValue);
            newIsValid[typedParamName] = validation.valid;

            if (validation.valid) {
              // Type assertion to resolve the type error
              (validUpdates as any)[paramName] = newValue;
            } else {
              allValid = false;
            }
          }
        }
      }

      // Update validity state
      setIsValidState(newIsValid);

      // Apply valid updates
      if (Object.keys(validUpdates).length > 0) {
        // Update the values in the state
        setValuesState((prev) => ({
          ...prev,
          ...validUpdates,
        }));

        // Apply the batch parameter update
        const updateOptions: ParameterUpdateOptions = {
          recreateGeometry: options.recreateGeometry,
          resetCamera: options.resetCamera,
          skipValidation: options.skipValidation,
          source: "user",
        };

        facade.batchUpdateParams(validUpdates, updateOptions);
      }
    },
    [
      facade,
      isValid,
      options.recreateGeometry,
      options.resetCamera,
      options.skipValidation,
    ]
  );

  // Create debounced setters if needed
  const debouncedSetValue =
    options.debounceMs && options.debounceMs > 0
      ? useDebounce(setValue, options.debounceMs)
      : setValue;

  const debouncedSetValues =
    options.debounceMs && options.debounceMs > 0
      ? useDebounce(setValues, options.debounceMs)
      : setValues;

  // Synchronize with facade events if requested
  useEffect(() => {
    if (!options.listenToEvents) {
      return;
    }

    // Listen for parameter changes from other sources
    const handleParameterChanged = (data: {
      paramName: string;
      value: any;
    }) => {
      if (paramNames.includes(data.paramName as K)) {
        setValuesState((prev) => ({
          ...prev,
          [data.paramName]: data.value,
        }));
      }
    };

    // Subscribe to parameter change events
    facade.on("parameter-changed", handleParameterChanged);

    // Unsubscribe when the hook unmounts
    return () => {
      facade.off("parameter-changed", handleParameterChanged);
    };
  }, [facade, paramNames, options.listenToEvents]);

  return {
    values,
    setValues: debouncedSetValues,
    setValue: debouncedSetValue,
    isValid,
  };
}
