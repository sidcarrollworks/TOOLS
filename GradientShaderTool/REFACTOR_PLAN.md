# Gradient Shader Tool Refactor Plan

## Current Progress (March 2024)

### Phase 1: Centralize Settings-to-Shader Parameter Mapping - COMPLETED ✅

#### Accomplished:

1. ✅ Created foundational mapping architecture

   - Created type definitions for parameter mappings
   - Implemented a centralized configuration for all panels
   - Built bidirectional lookup maps (setting ID ↔ parameter name)

2. ✅ Implemented core mapping utilities

   - Added functions to apply settings to shader parameters
   - Created utilities to extract settings from shader parameters
   - Implemented validation mechanisms for settings

3. ✅ Refactored settings store

   - Updated store to use centralized mapping
   - Improved parameter update logic
   - Added proper validation before applying changes

4. ✅ Improved initialization flow

   - Updated app initialization to use mapping system
   - Fixed settings-to-parameters synchronization
   - Added proper shader updates after parameter changes

5. ✅ Refactored all panels to use centralized mapping

   - PresetPanel: Updated to use mapping for preset names
   - ColorsPanel: Simplified with standardized update patterns
   - LightingPanel: Improved with direct parameter references
   - GeometryPanel: Enhanced with special handling for geometry recreation
   - DistortionPanel: Refactored with debounced updates
   - CameraPanel: Maintained special camera handling while using mapping
   - SavePanel: Simplified with standardized settings handling

6. ✅ Added useful utility hooks
   - Created useDebounce hook for standardized parameter updates
   - Implemented consistent debouncing patterns

### Phase 2: Implement Facade/Adapter Layer - IN PROGRESS 🔄

#### Accomplished:

1. ✅ Created core facade interfaces and types

   - Defined comprehensive type definitions for the facade API
   - Implemented type-safe event system with proper payload types
   - Created validation interfaces for parameter updates
   - Added configuration interfaces for facade customization

2. ✅ Implemented robust event system

   - Created EventEmitter class with type-safe event handling
   - Added proper error handling for event callbacks
   - Implemented subscription management with cleanup
   - Added utilities for checking and clearing event listeners

3. ✅ Created comprehensive facade configuration system

   - Implemented configuration options for different parameter types
   - Added performance optimization settings
   - Created export configuration options
   - Added debugging and event throttling settings
   - Implemented deep merge for custom configurations

4. ✅ Implemented core ShaderAppFacade

   - Created adapter layer wrapping ShaderApp implementation
   - Added comprehensive parameter management with validation
   - Implemented type-safe methods for all ShaderApp operations
   - Added proper error handling and event emission
   - Created helper methods for geometry and camera management
   - Implemented export functionality with mock responses

5. ✅ Created React/Preact context provider

   - Implemented FacadeProvider component for dependency injection
   - Created error boundary for facade-related errors
   - Added proper context initialization and cleanup
   - Implemented useFacade hook for consuming the facade

6. ✅ Developed parameter hooks
   - Created useParameter hook for single parameter manipulation
   - Implemented useParameterGroup for related parameters
   - Added debounce support for efficient updates
   - Implemented parameter validation and event subscription
   - Created type-safe interfaces for parameter operations

#### Next Steps:

7. Create mock implementation for testing
8. Implement component test helpers
9. Update app initialization to use facade
10. Refactor ShaderCanvas to use facade
11. Create facade-ready UI components
12. Refactor panel components to use the facade
13. Add proper documentation

### Next Steps - Phase 3: Standardize State Management

The next phase will focus on standardizing state management with signal stores, implementing consistent UI patterns, and further optimizing performance.

---

## Overarching Goals

1. **Improve Maintainability**: Create a more maintainable architecture with clear boundaries between components
2. **Enhance Testability**: Implement patterns that make the codebase more testable
3. **Standardize State Management**: Create consistent patterns for state updates throughout the application
4. **Increase Code Reusability**: Reduce duplication and create more reusable components
5. **Optimize Performance**: Ensure efficient rendering and state updates
6. **Centralize Configuration**: Create single sources of truth for critical configurations
7. **Improve Error Handling**: Implement robust error handling throughout the application

## Phase 1: Centralize Settings-to-Shader Parameter Mapping

### Goals

- Create a single source of truth for mapping between UI settings and shader parameters
- Eliminate duplication of mapping logic across components
- Improve type safety for settings-to-parameters mapping
- Make parameter mapping more maintainable and discoverable

### Action Items

1. **Create a Central Mapping Configuration**

   - Create `lib/settings/mappings/types.ts` to define the bidirectional mapping between settings and shader parameters
   - Define TypeScript interfaces for all mapping types
   - Include metadata about parameter types, ranges, and units

2. **Implement Mapping Utilities**

   - Create helper functions for translating between settings and shader parameters
   - Add validation to ensure parameters are within valid ranges
   - Implement type-safe accessor methods

3. **Refactor Settings Store**

   - Update the settings store to use the centralized mapping
   - Create a consistent interface for updating both settings and shader parameters
   - Ensure all parameter updates go through this interface

4. **Update Panel Components**

   - Remove hardcoded mappings from panel components
   - Use the centralized mapping utilities for all parameter updates
   - Update panels to handle validation and error states

5. **Consolidate Initialization Logic**
   - Refactor the initialization process to use the centralized mapping
   - Implement a more robust sync mechanism between app and settings
   - Add logging for debugging initialization issues

## Phase 2: Implement Facade/Adapter Layer

### Goals

- Decouple UI components from the ShaderApp implementation
- Create a clean interface for UI components to interact with the application core
- Improve testability by enabling mocking of application core
- Standardize interaction between UI and application logic

### Action Items

1. **Design the Facade API**

   - Create `lib/facade/ShaderAppFacade.ts` as the main interface
   - Define clear methods for all UI interactions with the shader app
   - Create TypeScript interfaces for all facade operations

2. **Implement Core Functionality**

   - Implement parameter updates with validation
   - Add preset application logic
   - Include camera and view control methods
   - Implement export and rendering functions

3. **Add Event System**

   - Create a signal-based event system for facade-to-UI communication
   - Define standard events for parameter changes, rendering updates, etc.
   - Implement subscription methods for components

4. **Create Testing Utilities**

   - Add interfaces and mock implementations for testing
   - Create utilities for testing components in isolation
   - Add test helpers for common testing scenarios

5. **Refactor Components to Use Facade**
   - Update all panel components to use the facade instead of direct ShaderApp access
   - Modify initialization code to use the facade
   - Update event handlers to interact through the facade

## Phase 3: Standardize State Management

### Goals

- Create consistent patterns for state management across components
- Implement standardized approaches for debouncing and batching updates
- Improve error handling for state updates
- Optimize render performance

### Action Items

1. **Create Signal Stores**

   - Organize related signals into cohesive "stores"
   - Define clear patterns for updating and subscribing to signals
   - Create computed signals for derived state

2. **Implement Standard Update Patterns**

   - Create utility hooks for debounced updates
   - Implement batch update functionality for related parameters
   - Add standardized error handling for all updates

3. **Develop UI Component Patterns**

   - Create reusable UI components for settings groups
   - Implement standardized panel layouts
   - Use consistent patterns for user interactions

4. **Create Error Handling System**

   - Implement global error tracking
   - Add user-facing error notifications
   - Create recovery mechanisms for common error scenarios

5. **Optimize Rendering**
   - Use fine-grained reactivity to minimize re-renders
   - Implement performance monitoring
   - Add virtualization for long lists if needed

## Detailed Implementation Steps

### Phase 1: Centralize Settings-to-Shader Parameter Mapping

1. **Define Mapping Interfaces (Week 1)**

   - Create interfaces for all parameter types
   - Define mapping relationships between settings and parameters
   - Create validation rules for each parameter type

2. **Implement Central Mapping Module (Week 1)**

   - Create a comprehensive mapping configuration
   - Organize mappings by panel/category
   - Add metadata for each parameter

3. **Update Settings Store (Week 1-2)**

   - Refactor store to use the new mapping system
   - Implement bidirectional sync between settings and app parameters
   - Add validation during updates

4. **Refactor Panel Components (Week 2)**

   - Update each panel to use the centralized mapping
   - Remove hardcoded parameter names
   - Implement consistent update patterns

5. **Consolidate Initialization (Week 2)**
   - Update app initialization to use the mapping system
   - Improve error handling during initialization
   - Add checks for invalid initial states

### Phase 2: Implement Facade/Adapter Layer

1. **Design Facade Interface (Week 3)**

   - Define the public API for the facade
   - Create interfaces for all operations
   - Design the event system

2. **Implement ShaderAppFacade (Week 3-4)**

   - Create the facade implementation
   - Add all required methods for UI interaction
   - Implement validation and error handling

3. **Update Core Components (Week 4)**

   - Modify app initialization to use the facade
   - Update main app component to interact through the facade
   - Add facade accessor methods where needed

4. **Refactor Panel Components (Week 5)**

   - Update each panel to use the facade
   - Replace direct ShaderApp usage with facade calls
   - Implement error handling for facade operations

5. **Add Testing Support (Week 5-6)**
   - Create mock implementations for testing
   - Add test utilities for common operations
   - Implement test helpers for UI components

### Phase 3: Standardize State Management

1. **Create Signal Organization (Week 6)**

   - Organize signals into logical groups/stores
   - Define patterns for signal updates
   - Create utility functions for signal operations

2. **Implement SettingsGroup Component (Week 7)**

   - Create a reusable settings group component
   - Support collapsible sections
   - Ensure proper styling based on existing CSS

3. **Standardize Update Patterns (Week 7-8)**

   - Create useDebounce hook for consistent debouncing
   - Implement batch update utilities
   - Add interruption handling for rapid updates

4. **Improve Error Handling (Week 8)**

   - Add validation at all input points
   - Implement user-friendly error messages
   - Create recovery mechanisms

5. **Optimize Performance (Week 9)**
   - Profile and optimize critical paths
   - Implement render optimizations
   - Add performance monitoring

## Technical Considerations

1. **UI Components**

   - Use FigmaInput (scrubbable numeric input) instead of slider components
   - Maintain existing UI styles and CSS
   - Use the DirectionControl component for combined controls
   - Create new components like SettingsGroup while preserving the existing visual design

2. **State Management**

   - Use signals throughout the application
   - Create consistent patterns for updating state
   - Organize signals into logical stores

3. **Performance**

   - Implement consistent debouncing for frequent updates
   - Use batched updates where appropriate
   - Add performance monitoring for critical paths

4. **Error Handling**

   - Validate all user inputs
   - Provide meaningful error messages
   - Add graceful recovery options

5. **Edge Cases**
   - Handle initialization failures
   - Manage edge cases in parameter values
   - Support async operations that may fail
   - Handle browser-specific inconsistencies

## Success Criteria

1. **Code Quality**

   - Reduced duplication across components
   - Clear separation of concerns
   - Improved type safety
   - Consistent coding patterns

2. **Maintainability**

   - Single source of truth for configurations
   - Clear interfaces between components
   - Improved documentation
   - More testable code structure

3. **User Experience**

   - Consistent behavior across all panels
   - Improved error feedback
   - Responsive UI with efficient updates
   - Predictable interaction patterns

4. **Performance**
   - Optimized rendering
   - Efficient state updates
   - Reduced unnecessary calculations
   - Smooth animations and transitions

## Detailed Phase 1 Implementation: Centralize Settings-to-Shader Parameter Mapping

### 1. Create a Central Mapping Configuration

#### Implementation Details:

1. **Create mapping type definitions in `lib/settings/mappings/types.ts`**:

   ```typescript
   /**
    * Type definitions for the mapping between UI settings and shader parameters
    */

   // Define the mapping between UI settings and shader parameters
   export interface ParameterMapping {
     settingId: string; // ID in the settings store (e.g., "lightDirX")
     paramName: string; // Name in ShaderApp params (e.g., "lightDirX")
     transform?: {
       toParam: (value: any) => any; // Transform setting value to parameter value
       fromParam: (value: any) => any; // Transform parameter value to setting value
     };
     validation?: {
       min?: number;
       max?: number;
       pattern?: RegExp;
       validator?: (value: any) => boolean;
     };
     metadata?: {
       description?: string;
       unit?: string;
     };
   }

   // Group mappings by panel/category
   export interface PanelMappings {
     panelId: string;
     mappings: ParameterMapping[];
   }

   // Complete mapping configuration
   export interface MappingConfig {
     panels: Record<string, PanelMappings>;
   }
   ```

2. **Create `lib/settings/mappings/config.ts` implementation**:

   ```typescript
   /**
    * Mapping configuration between UI settings and shader parameters
    */
   import type { MappingConfig } from "./types";

   /**
    * The complete mapping configuration for all settings to shader parameters
    */
   export const parameterMappings: MappingConfig = {
     panels: {
       // Presets panel - mapping preset buttons to functions
       presets: {
         panelId: "presets",
         mappings: [
           { settingId: "presetDefault", paramName: "Default" },
           { settingId: "presetOceanWaves", paramName: "Ocean Waves" },
           { settingId: "presetLavaFlow", paramName: "Lava Flow" },
           { settingId: "presetAbstractArt", paramName: "Abstract Art" },
         ],
       },

       // Colors panel mappings
       colors: {
         panelId: "colors",
         mappings: [
           { settingId: "gradientMode", paramName: "gradientMode" },
           { settingId: "color1", paramName: "color1" },
           { settingId: "color2", paramName: "color2" },
           { settingId: "color3", paramName: "color3" },
           { settingId: "color4", paramName: "color4" },
           { settingId: "colorNoiseScale", paramName: "colorNoiseScale" },
           { settingId: "colorNoiseSpeed", paramName: "colorNoiseSpeed" },
           { settingId: "gradientShiftX", paramName: "gradientShiftX" },
           { settingId: "gradientShiftY", paramName: "gradientShiftY" },
           { settingId: "gradientShiftSpeed", paramName: "gradientShiftSpeed" },
           // Background is handled in export settings
           {
             settingId: "transparentBackground",
             paramName: "exportTransparentBg",
           },
           { settingId: "backgroundColor", paramName: "backgroundColor" },
         ],
       },

       // Lighting panel mappings
       lighting: {
         panelId: "lighting",
         mappings: [
           { settingId: "lightDirX", paramName: "lightDirX" },
           { settingId: "lightDirY", paramName: "lightDirY" },
           { settingId: "lightDirZ", paramName: "lightDirZ" },
           { settingId: "diffuseIntensity", paramName: "diffuseIntensity" },
           { settingId: "ambientIntensity", paramName: "ambientIntensity" },
           { settingId: "rimLightIntensity", paramName: "rimLightIntensity" },
         ],
       },

       // Additional panels defined similarly...
     },
   };
   ```

3. **Implement lookup utilities for fast access in `lib/settings/mappings/utils.ts`**:

   ```typescript
   /**
    * Utility functions for working with settings-to-shader parameter mappings
    */
   import type { ShaderParams } from "../../ShaderApp";
   import { parameterMappings } from "./config";
   import type { ParameterMapping } from "./types";

   // Lookup maps for fast access
   export const settingToParamMap = new Map<string, string>();
   export const paramToSettingMap = new Map<string, string>();

   /**
    * Initialize the lookup maps for faster access
    */
   export function initMappingLookups(): void {
     // Clear any existing mappings
     settingToParamMap.clear();
     paramToSettingMap.clear();

     // Build lookup maps from the configuration
     Object.values(parameterMappings.panels).forEach((panel) => {
       panel.mappings.forEach((mapping) => {
         settingToParamMap.set(mapping.settingId, mapping.paramName);
         paramToSettingMap.set(mapping.paramName, mapping.settingId);
       });
     });

     console.log(
       `Initialized mapping lookups with ${settingToParamMap.size} entries`
     );
   }
   ```

### 2. Implement Mapping Utilities

#### Implementation Details:

1. **Create mapping utilities in the same `lib/settings/mappings/utils.ts` file**:

   ```typescript
   /**
    * Get parameter mapping for a setting
    */
   export function getParameterMapping(
     settingId: string
   ): ParameterMapping | null {
     // Search through all panels
     for (const panelId in parameterMappings.panels) {
       const mapping = parameterMappings.panels[panelId].mappings.find(
         (m) => m.settingId === settingId
       );
       if (mapping) return mapping;
     }
     return null;
   }

   /**
    * Apply settings values to ShaderApp params
    */
   export function applySettingsToParams(
     settings: Record<string, any>,
     params: ShaderParams,
     app?: any
   ): void {
     Object.entries(settings).forEach(([settingId, value]) => {
       const paramName = settingToParamMap.get(settingId);
       if (!paramName) return; // Skip if no mapping exists

       const mapping = getParameterMapping(settingId);

       // Apply transformation if defined
       const paramValue = mapping?.transform?.toParam
         ? mapping.transform.toParam(value)
         : value;

       // Type assertion to safely update the parameter
       (params as any)[paramName] = paramValue;
     });

     // After applying all settings, trigger the shader update if app is provided
     if (app && app.updateParams) {
       app.updateParams(false); // Update without camera reset
     }
   }

   /**
    * Extract settings values from ShaderApp params
    */
   export function extractSettingsFromParams(
     params: ShaderParams
   ): Record<string, any> {
     const settings: Record<string, any> = {};

     // Loop through all parameter mappings
     Object.entries(params).forEach(([paramName, value]) => {
       const settingId = paramToSettingMap.get(paramName);
       if (!settingId) return; // Skip if no mapping exists

       const mapping = getParameterMapping(settingId);

       // Apply reverse transformation if defined
       settings[settingId] = mapping?.transform?.fromParam
         ? mapping.transform.fromParam(value)
         : value;
     });

     return settings;
   }

   /**
    * Validate a setting value
    */
   export function validateSetting(settingId: string, value: any): boolean {
     const mapping = getParameterMapping(settingId);
     if (!mapping || !mapping.validation) return true;

     const { validation } = mapping;

     // Check numeric ranges
     if (typeof value === "number") {
       if (validation.min !== undefined && value < validation.min) return false;
       if (validation.max !== undefined && value > validation.max) return false;
     }

     // Check string patterns
     if (typeof value === "string" && validation.pattern) {
       if (!validation.pattern.test(value)) return false;
     }

     // Use custom validator if provided
     if (validation.validator) {
       return validation.validator(value);
     }

     return true;
   }
   ```

### 3. Refactor Settings Store

#### Implementation Details:

1. **Update `lib/settings/store.ts` to use the centralized mapping**:

   ```typescript
   import { signal, computed } from "@preact/signals";
   import type { SettingsConfig } from "./types";
   import { appSignal } from "../../app";
   import { applySettingsToParams, validateSetting } from "./mappings/utils";

   // Create a signal for the settings configuration
   export const settingsConfigSignal = signal<SettingsConfig>({ panels: {} });

   // Create a signal for the current settings values
   // This will be a map of setting IDs to their current values
   export const settingsValuesSignal = signal<Record<string, any>>({});

   // Helper function to initialize settings values from config
   export function initializeSettingsValues(config: SettingsConfig) {
     const initialValues: Record<string, any> = {};

     // Loop through all panels and their settings to get default values
     Object.values(config.panels).forEach((panel) => {
       panel.groups.forEach((group) => {
         group.settings.forEach((setting) => {
           if ("defaultValue" in setting) {
             initialValues[setting.id] = setting.defaultValue;
           }
         });
       });
     });

     // Update the settings values signal
     settingsValuesSignal.value = initialValues;
   }

   // Helper function to update a single setting value
   export function updateSettingValue(id: string, value: any) {
     // Validate the value
     if (!validateSetting(id, value)) {
       console.warn(`Invalid value for setting ${id}:`, value);
       return false;
     }

     // Update the settings values signal
     settingsValuesSignal.value = {
       ...settingsValuesSignal.value,
       [id]: value,
     };

     // Get the app instance
     const app = appSignal.value;
     if (app) {
       // Apply the update to shader params directly
       applySettingsToParams({ [id]: value }, app.params, app);
     }

     return true;
   }

   // Helper function to batch update multiple settings at once
   export function batchUpdateSettings(updates: Record<string, any>) {
     // Validate all values before applying any
     const allValid = Object.entries(updates).every(([id, value]) =>
       validateSetting(id, value)
     );

     if (!allValid) {
       console.warn("Batch update failed validation", updates);
       return false;
     }

     // Update the settings values signal (batch update)
     settingsValuesSignal.value = {
       ...settingsValuesSignal.value,
       ...updates,
     };

     // Get the app instance
     const app = appSignal.value;
     if (app) {
       // Apply all updates to shader params
       applySettingsToParams(updates, app.params, app);
     }

     return true;
   }

   // Other helper functions...
   ```

### 4. Update Panel Components

#### Implementation Details:

1. **Create a reusable `useDebounce` hook in `lib/hooks/useDebounce.ts`**:

   ```typescript
   import { useCallback, useRef } from "preact/hooks";

   /**
    * Custom hook for debouncing function calls
    * @param callback The function to be debounced
    * @param delay The delay in milliseconds
    * @returns A debounced version of the callback
    */
   export function useDebounce<T extends (...args: any[]) => void>(
     callback: T,
     delay: number
   ): T {
     // Store the timeout ID
     const timeoutRef = useRef<number | null>(null);

     // Create a memoized debounced function
     const debouncedFn = useCallback(
       (...args: Parameters<T>) => {
         // Clear any existing timeout
         if (timeoutRef.current !== null) {
           window.clearTimeout(timeoutRef.current);
         }

         // Set a new timeout
         timeoutRef.current = window.setTimeout(() => {
           callback(...args);
           timeoutRef.current = null;
         }, delay);
       },
       [callback, delay]
     );

     // Cast to the original function type
     return debouncedFn as T;
   }
   ```

2. **Refactor `ColorsPanel.tsx` to use the centralized mapping**:

   ```typescript
   import type { FunctionComponent } from "preact";
   import { useComputed } from "@preact/signals";
   import { useRef } from "preact/hooks";
   import "./Panel.css";
   import Select from "../UI/Select";
   import { FigmaInput } from "../FigmaInput";
   import { DirectionControl } from "../DirectionControl";
   import { Checkbox } from "../UI/Checkbox";
   import {
     getPanelSettings,
     getSettingValue,
     updateSettingValue,
     batchUpdateSettings,
   } from "../../lib/settings/store";
   import type {
     SettingGroup,
     SelectSetting,
     SliderSetting,
     ColorSetting,
   } from "../../lib/settings/types";
   import { appSignal } from "../../app";
   import { useDebounce } from "../../lib/hooks/useDebounce";

   export const ColorsPanel: FunctionComponent = () => {
     // Get the app instance
     const app = useComputed(() => appSignal.value);

     // Get the colors panel settings
     const colorsPanelConfigSignal = getPanelSettings("colors");
     const colorsPanelConfig = useComputed(() => colorsPanelConfigSignal.value);

     // Create debounced update functions
     const updateSettingWithDebounce = useDebounce((id: string, value: any) => {
       updateSettingValue(id, value);
       // The shader param update is now handled by updateSettingValue
     }, 50);

     // Handle gradient mode change
     const handleGradientModeChange = (value: string) => {
       const numericValue = parseInt(value, 10);
       updateSettingValue("gradientMode", numericValue);
     };

     // Handle color change
     const handleColorChange = (id: string, value: string) => {
       updateSettingWithDebounce(id, value);
     };

     // Handle slider value change
     const handleSliderChange = (id: string, value: number) => {
       updateSettingWithDebounce(id, value);
     };

     // Component rendering...
   };
   ```

### 5. Consolidate Initialization Logic

#### Implementation Details:

1. **Update `lib/settings/initApp.ts` to use the centralized mapping**:

   ```typescript
   import { initializeSettings } from "./index";
   import {
     settingsValuesSignal,
     updateSettingValue,
     batchUpdateSettings,
   } from "./store";
   import type { ShaderApp } from "../ShaderApp";
   import {
     initMappingLookups,
     extractSettingsFromParams,
     applySettingsToParams,
   } from "./mappings/utils";

   // Initialize the settings system
   export function initializeSettingsSystem() {
     console.log("Initializing settings system...");

     // Initialize the mapping lookups
     initMappingLookups();

     // Initialize the settings with default values
     initializeSettings();

     // Register camera settings update function...

     console.log("Settings system initialized with default values");
   }

   // Connect settings changes to shader app updates
   export function connectSettingsToShaderApp(app: ShaderApp) {
     console.log("Connecting settings to ShaderApp...");

     // Initialize the app with current settings
     const settings = settingsValuesSignal.value;
     if (Object.keys(settings).length > 0) {
       applySettingsToParams(settings, app.params, app);
     }

     console.log("Settings connected to ShaderApp");
   }

   // Initialize the settings values from the shader app
   export function initializeSettingsFromShaderApp(app: ShaderApp) {
     console.log("Initializing settings from ShaderApp...");

     // Extract current values from ShaderApp params
     const settings = extractSettingsFromParams(app.params);

     // Update the settings values signal with a batch update
     settingsValuesSignal.value = {
       ...settingsValuesSignal.value,
       ...settings,
     };

     console.log("Settings initialized from ShaderApp");
   }
   ```

2. **Update app initialization in `app.tsx`**:

   ```typescript
   // Initialize the settings system
   initializeSettingsSystem();

   // During app initialization:
   // Connect settings to the shader app
   connectSettingsToShaderApp(shaderApp);
   ```

### Implementation Strategy and Testing

1. **Incremental Testing Approach**:

   - We've implemented and tested the centralized mapping for PresetPanel, ColorsPanel, and LightingPanel
   - Each component has been verified to properly update settings and render changes
   - We'll continue to incrementally refactor each remaining panel

2. **Key Improvements**:
   - Eliminated duplicated code for parameter mapping
   - Added proper validation for settings
   - Standardized update patterns with debouncing
   - Improved initialization and synchronization
