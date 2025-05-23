# Refactor Notes for ShaderForge

## Completed Refactoring

This section documents the refactoring work that has been completed so far.

### Animation Performance Improvements

The animation system has been refactored to provide consistent frame-rate independent animation across all devices:

1. **Implemented Delta Time for Animation**:

   - Added THREE.Clock usage in ShaderApp to accurately track time between frames
   - Modified animation loop to scale animation speed by delta time (time elapsed since last frame)
   - Added maximum delta time cap to prevent huge jumps when tab loses focus
   - Applied 60.0 scaling factor to maintain similar speed to previous implementation

2. **Updated Exported Code**:

   - Modified JSExporter to use the same delta time approach in exported JavaScript
   - Updated HTMLExporter to include frame-rate independent animation in exported HTML
   - Ensured consistent animation experience between editor and exported code

3. **Benefits of Frame-Rate Independence**:
   - Animations now run at the same perceived speed on both high-end (120+ FPS) and low-end (30 FPS) devices
   - Frame drops or performance issues no longer affect overall animation timing
   - Prevents "fast animations" on high-performance devices and "slow animations" on lower-performance devices

### HTML Export Reimplementation

The HTML export functionality has been successfully reimplemented with the following improvements:

1. **Added HTML Export Option to Export Modal**:

   - Integrated HTML export alongside JavaScript and Shader export options
   - Added HTML icon and appropriate description
   - Ensured proper integration with existing export interface

2. **Improved HTML Export Code Generation**:

   - Fixed shader code handling to properly include complete vertex and fragment shaders
   - Applied proper escaping of backticks to ensure correct JavaScript string literals in HTML output
   - Included frame-rate independent animation in exported HTML

3. **Enhanced Export Infrastructure**:

   - Updated ExportCodeOptions interface to include "html" format type
   - Added HTML format validation in ShaderAppFacade's validateExportImplementation method
   - Updated CodeFormat type in ExportInitializer to include HTML option

4. **Benefits of HTML Export**:
   - Users can now generate standalone HTML files that run independently in any browser
   - Complete implementation includes Three.js, shaders, and all necessary parameters
   - Consistent behavior with the web application due to frame-rate independent animation

### Distortion Panel Refactoring

The Distortion Panel has been successfully refactored with the following improvements:

1. **Implemented Signal-Based Architecture**:

   - Created `DistortionInitializer.ts` that extends `InitializerBase` for parameter management
   - Created `DistortionStoreRefactored.ts` that extends `SignalStoreBase` for reactive state management
   - Added proper facade bindings and signal synchronization

2. **Improved UI Reactivity**:

   - Replaced polling-based updates with proper signal subscriptions
   - Implemented proper cleanup of subscriptions and event listeners
   - Ensured consistent state synchronization with the facade

3. **Enhanced Component Structure**:
   - Organized UI into logical settings groups
   - Standardized UI component patterns
   - Improved error handling and user feedback

### Geometry Panel Refactoring

The Geometry Panel has been successfully refactored with the following improvements:

1. **Implemented Signal-Based Architecture**:

   - Enhanced `GeometryInitializer.ts` to utilize `InitializerBase` for parameter management
   - Updated `GeometryStore.ts` to extend `SignalStoreBase` for reactive state management
   - Fixed parameter mappings between panel, store, initializer, and facade

2. **Improved UI Reactivity**:

   - Replaced local React state with signal subscriptions
   - Implemented proper event cleanup
   - Added proper error handling and debugging logs

3. **Fixed Parameter Synchronization Issues**:

   - Corrected wireframe toggle functionality by mapping `wireframe` parameter to `showWireframe` facade parameter
   - Improved preset handling to properly synchronize geometry parameters
   - Added special parameter handling in syncWithFacade method

4. **Enhanced Cross-Component Communication**:
   - Fixed store interactions with other components
   - Ensured proper parameter updates when changing presets
   - Improved debugging capabilities with detailed logging

### Foundational Architecture Work

Several foundational components have been enhanced to support the refactoring:

1. **SignalStoreBase**:

   - Added support for computed signals
   - Enhanced synchronization with facade
   - Improved error handling and debugging capabilities

2. **InitializerBase**:

   - Implemented parameter definitions with default values
   - Added facade parameter mapping
   - Created a standardized pattern for sync with facade

3. **GeometryStore and GeometryInitializer**:
   - Refactored GeometryStore to extend SignalStoreBase
   - Created GeometryInitializer to handle geometry parameter management
   - Implemented proper signal-based reactive state

### Camera Panel Refactoring

The Camera Panel has been successfully refactored with the following improvements:

1. **Implemented Signal-Based Architecture**:

   - Created `CameraInitializer.ts` that extends `InitializerBase` for parameter management
   - Updated `CameraStore.ts` to extend `SignalStoreBase` for reactive state management
   - Fixed parameter mappings between panel, store, initializer, and facade

2. **Improved UI Reactivity**:

   - Replaced polling-based updates with more efficient render-complete event listeners
   - Added strategic interval-based sync for 3D orbit control updates
   - Implemented proper cleanup of subscriptions and event listeners

3. **Enhanced Type Safety**:

   - Fixed type issues with facade parameter handling
   - Added proper type assertions and number conversion for camera parameters
   - Improved error handling with better validation and logging

4. **Streamlined Camera Management**:
   - Implemented direct signal subscriptions for camera parameters
   - Simplified camera positioning code with better abstractions
   - Improved debugging capabilities with detailed logging

## State Management Best Practices

### Avoid Polling for State Updates

**ANTI-PATTERN**: Using `setInterval` to periodically check for state changes (as previously done in DistortionPanel.tsx).

**BEST PRACTICE**: Use proper reactive subscription patterns:

- Subscribe to store signals using `storeInstance.getSignal().subscribe(callback)`
- Use the subscription mechanism provided by the state management library
- Clean up subscriptions in useEffect return function to prevent memory leaks

**Example of proper subscription pattern:**

```typescript
// Get the store signal
const storeSignal = someStore.getSignal();

// Setup subscription
const unsubscribe = storeSignal.subscribe(syncWithStore);

// Clean up in useEffect return
return () => {
  unsubscribe();
};
```

### Benefits of Reactive Subscriptions

- More efficient - updates happen only when state actually changes
- Reduces unnecessary render cycles
- Eliminates "time gap" between state change and UI update
- Better performance overall, especially for frequently updated state
- More idiomatic for React/Preact apps

### Components Using This Pattern

- DistortionPanel.tsx (fixed)
- PresetPanel.tsx
- ...add other components as they are refactored

## Component Rendering Best Practices

### Avoid Using Dynamic `key` Props for Re-rendering

**ANTI-PATTERN**: Using dynamic keys that change frequently to force re-renders (as previously done with DirectionControl in DistortionPanel.tsx).

**BEST PRACTICE**:

- Rely on proper props and state management for re-rendering
- Only use keys for lists or when components genuinely need to be reset
- Avoid keys that change on every render or update

**Problem with dynamic keys:**

- Components completely unmount and remount
- Internal state is lost
- Event handlers are disrupted (like drag operations)
- Hurts performance with unnecessary reconciliation

### Components Using This Pattern

- DirectionControl in DistortionPanel.tsx (fixed)
- ...add other components as they are refactored

## Cross-Component State Synchronization

### Ensure Settings with Same Purpose Stay in Sync

**ANTI-PATTERN**: Having multiple settings in different stores/components that control the same feature but aren't synchronized (as previously done with transparent background settings).

**BEST PRACTICE**:

- Implement bidirectional synchronization between related settings
- Update all related stores when a setting changes
- Consider using a single source of truth where possible

**Example for synchronization:**

```typescript
// When updating in one place
const handleTransparentBackgroundChange = (checked: boolean) => {
  // Update the settings store
  updateSettingValue("transparentBackground", checked);

  // Also update the export store to keep them in sync
  exportStore.updateImageSettings({
    transparent: checked,
  });

  // Update the facade directly if available
  if (facade.value) {
    facade.value.updateParam("exportTransparentBg", checked);
  }
};
```

### Components Using This Pattern

- SavePanel.tsx and ColorsPanel.tsx (transparent background setting)

## Component Initialization Patterns

### Use Dedicated Initializers for Complex Panel Components

**ANTI-PATTERN**: Including initialization logic directly within UI components.

**BEST PRACTICE**:

- Create dedicated initializer modules for complex panels
- Separate UI rendering concerns from state initialization logic
- Use a consistent initialization pattern across the application

**Benefits of dedicated initializers:**

- Reduces component complexity and line count
- Improves testability of UI and initialization separately
- Creates reusable initialization patterns across the application
- Simplifies maintenance when panel UI needs to change

**Example implementation pattern:**

```typescript
// In GeometryInitializer.ts
export function initializeGeometryParameters(): void {
  // Initialize parameters with defaults if needed
  // Handle edge cases and validation
  // Set up initial state in stores
}

export function syncGeometryParameters(params, type): Record<string, number> {
  // Fetch current values from facade or store
  // Handle special cases for different geometry types
  return updatedParams;
}

export function updateGeometryParameter(paramId, value): boolean {
  // Update both store and facade
  // Handle validation and special cases
  return success;
}

// In GeometryPanel.tsx
useEffect(() => {
  // Initialize parameters
  initializeGeometryParameters();

  // Sync local component state
  const params = {};
  const updatedParams = syncGeometryParameters(params, geometryType);
  setGeometryParams(updatedParams);
}, []);

// Parameter change handlers
const handleParamChange = (paramId, value) => {
  // Update local state for immediate feedback
  setGeometryParams((prev) => ({ ...prev, [paramId]: value }));

  // Update parameter in store and facade
  updateGeometryParameter(paramId, value);
};
```

### Components Using This Pattern

- PresetPanel with PresetInitializer
- GeometryPanel with GeometryInitializer
- DistortionPanel with DistortionInitializer
- ColorsPanel (partial - uses initializers for some functionality)
- ...add other components as they are refactored

## Panel-Specific Store/Facade Interaction Analysis

### Overview of Panel Interactions

This section documents how each panel interacts with the store and facade, identifying issues and consistency patterns.

### DistortionPanel.tsx

**Store Interaction:**

- Uses `DistortionStore` through the `getDistortionStore()` singleton
- Properly subscribes to store signals with `storeSignal.subscribe(syncWithStore)`
- Uses dedicated `DistortionInitializer` for parameter management

**Facade Interaction:**

- Accesses facade through `facadeSignal` from app
- Listens to facade events with proper cleanup (`facade.on("preset-applied", handlePresetApplied)`)
- Updates happen through initializer functions, not directly

**State Management:**

- Uses React state for local UI state
- Sync mechanism updates local React state from store

**Strengths:**

- Follows reactive subscription pattern
- Uses dedicated initializer
- Proper event cleanup

**Issues:**

- None significant; follows best practices

### ColorsPanel.tsx

**Store Interaction:**

- Uses settings store via `getPanelSettings`, `getSettingValue`, `updateSettingValue`
- Also uses `ExportStore` for synchronizing transparent background setting
- No direct subscription to store signals

**Facade Interaction:**

- Uses `facadeSignal` with `useComputed` hook
- Direct facade updates for immediate feedback

**State Management:**

- No local React state; directly reads from store using computed signals
- Uses debounced updates with `useDebounce` hook

**Strengths:**

- Cross-component synchronization for transparent background
- Uses debouncing for performance

**Issues:**

- Doesn't use dedicated initializer for complex color settings
- Mixes multiple state management approaches (settings store and export store)
- No reactive subscriptions to detect external changes

### GeometryPanel.tsx

**Store Interaction:**

- Uses `GeometryStore` and `ParameterStore`
- Uses dedicated `GeometryInitializer` for parameter updates
- Uses computed signal to track parameter store changes

**Facade Interaction:**

- No direct facade references; all facade interaction happens through stores/initializers

**State Management:**

- Uses React state for local UI state
- Synchronizes with store during initialization
- Uses computed signals for reactive updates

**Strengths:**

- Uses dedicated initializer pattern
- Clean separation of concerns

**Issues:**

- No explicit subscription to geometry store signals
- Relies on computed signals instead of explicit subscriptions

### PresetPanel.tsx

**Store Interaction:**

- Uses `PresetStore` through singleton pattern
- Properly subscribes to store signals with `storeSignal.subscribe(updatePresetsFromStore)`

**Facade Interaction:**

- Direct facade interaction for applying presets
- Uses facade to sync parameters back to settings store

**State Management:**

- Uses React state for tracking presets and last applied preset
- Properly updates state based on store changes

**Strengths:**

- Clean subscription pattern
- Proper cleanup

**Issues:**

- Hard-coded mapping between preset IDs and facade preset names
- Directly calls `initializeSettingsFromShaderApp` (could use a dedicated initializer)

### SavePanel.tsx

**Store Interaction:**

- Uses `ExportStore` for image settings
- Uses settings store for maintaining transparent background setting in sync

**Facade Interaction:**

- Direct facade updates for transparent background setting

**State Management:**

- Uses signals for reactive UI updates
- Keeps settings synchronized between components

**Strengths:**

- Cross-component synchronization
- Clean UI state management with signals

**Issues:**

- No dedicated initializer
- Direct facade manipulation instead of going through stores

### LightingPanel.tsx

**Store Interaction:**

- Uses `LightingStore` through singleton pattern
- No subscription to store signals

**Facade Interaction:**

- No direct facade interaction; all facade updates happen through the store

**State Management:**

- Uses React state for local UI values
- Initial sync with store happens in useEffect

**Strengths:**

- Clean separation between UI and store logic

**Issues:**

- No reactive subscription to store signals
- Comment acknowledges "no need for interval here" but doesn't use subscriptions either
- No dedicated initializer

### CodePanel.tsx

**Store Interaction:**

- Uses `ExportStore` through singleton pattern
- Uses computed signals for reactive UI updates

**Facade Interaction:**

- No direct facade interaction

**State Management:**

- Minimal state management; mostly triggers export functionality

**Note:**

- Comment indicates this component is not currently used; export code functionality is triggered directly from SidePanel

### CameraPanel.tsx

**Store Interaction:**

- Uses `CameraStore` and `UIStore` through singleton patterns
- No subscription to store signals

**Facade Interaction:**

- Direct facade interaction for FOV updates
- Polls facade for current FOV values

**State Management:**

- Uses React state for position, target, and FOV
- Uses polling (setInterval) to update UI state from store

**Strengths:**

- Comprehensive camera controls

**Issues:**

- Uses polling instead of reactive subscriptions
- Direct facade manipulation for some operations
- No dedicated initializer

## Consistency Issues and Recommendations

### State Management Consistency

1. **Subscription Patterns:**

   - **Issue:** Inconsistent use of store signal subscriptions
   - **Panels Using Proper Subscriptions:** DistortionPanel, PresetPanel
   - **Panels Using Polling:** CameraPanel
   - **Panels With No Subscriptions:** LightingPanel, ColorsPanel, GeometryPanel (uses computed)
   - **Recommendation:** Standardize on reactive subscription pattern for all panels

2. **Facade Access:**

   - **Issue:** Inconsistent patterns for accessing and updating the facade
   - **Direct Facade Access:** ColorsPanel, SavePanel, CameraPanel, PresetPanel
   - **Store-Mediated Facade Access:** DistortionPanel, GeometryPanel, LightingPanel
   - **Recommendation:** Standardize on store-mediated facade access to maintain a single source of truth

3. **Use of Initializers:**

   - **Issue:** Inconsistent use of dedicated initializer modules
   - **Using Initializers:** DistortionPanel, GeometryPanel, PresetPanel (partially)
   - **Not Using Initializers:** CameraPanel, LightingPanel, SavePanel, ColorsPanel (partial)
   - **Recommendation:** Create dedicated initializers for all panels with complex state management

4. **Local State Management:**
   - **Issue:** Mix of React state and signal-based approaches
   - **Using React State:** DistortionPanel, GeometryPanel, LightingPanel, CameraPanel, PresetPanel
   - **Using Signals/Computed:** ColorsPanel, SavePanel, CodePanel
   - **Recommendation:** Standardize state management approach, prefer signal-based reactive patterns when possible

### Immediate Action Items

1. **Eliminate Polling:**

   - Refactor CameraPanel to use reactive subscriptions instead of setInterval

2. **Create Missing Initializers:**

   - Develop initializers for CameraPanel, LightingPanel, and complete the work for ColorsPanel

3. **Standardize Facade Access:**

   - Update ColorsPanel, SavePanel, and CameraPanel to access facade through stores/initializers

4. **Implement Reactive Subscriptions:**

   - Add proper store signal subscriptions to LightingPanel and GeometryPanel

5. **Document Standard Patterns:**
   - Create a design document outlining the standard patterns for:
     - Store initialization and access
     - Facade interaction
     - State synchronization
     - Event handling
     - UI updates

## Refactoring Prompts for Remaining Panels

This section outlines the specific refactoring tasks for each remaining panel, following the patterns established with the DistortionPanel refactoring.

### ColorsPanel Refactoring

**Current Issues:**

- Uses mixed state management approaches (settings store and export store)
- No dedicated initializer for color settings
- No reactive subscriptions for external changes
- Cross-component synchronization for transparent background setting needs standardization

**Refactoring Approach:**

1. Create a `ColorsInitializer` extending `InitializerBase` for parameter management
2. Implement color parameter definitions with default values
3. Update the `ColorStore` to extend `SignalStoreBase`
4. Standardize facade access through the store/initializer
5. Implement signals for all color parameters
6. Ensure cross-component synchronization with other panels (e.g., transparent background setting)
7. Update UI components to use signal-based state
8. Implement proper subscription patterns for external updates

### GeometryPanel Refactoring

**Current Issues:**

- No explicit subscription to geometry store signals
- Relies on computed signals instead of explicit subscriptions
- Complex interaction between geometry type and parameter values

**Refactoring Approach:**

1. Update `GeometryStore` to extend `SignalStoreBase`
2. Enhance `GeometryInitializer` to fully leverage `InitializerBase`
3. Standardize facade interactions through the store/initializer
4. Implement explicit signal subscriptions for reactive updates
5. Refactor the panel to use the enhanced store and initializer
6. Handle the conditional rendering of parameters based on geometry type using signals

### LightingPanel Refactoring

**Current Issues:**

- No reactive subscription to store signals
- No dedicated initializer
- Uses React state instead of signals

**Refactoring Approach:**

1. Create a `LightingInitializer` extending `InitializerBase`
2. Update `LightingStore` to extend `SignalStoreBase`
3. Define clear parameter bindings for lighting values
4. Replace React state with signal-based state management
5. Implement proper subscription patterns
6. Standardize facade access through the store/initializer

### CameraPanel Refactoring

**Current Issues:**

- Uses polling (setInterval) instead of reactive subscriptions
- Direct facade manipulation for some operations
- No dedicated initializer
- Mixed state management approaches

**Refactoring Approach:**

1. Create a `CameraInitializer` extending `InitializerBase`
2. Update `CameraStore` to extend `SignalStoreBase`
3. Replace polling with reactive subscriptions
4. Standardize facade access through the store/initializer
5. Implement signals for all camera parameters
6. Refactor UI to use signal-based state

### SavePanel Refactoring

**Current Issues:**

- No dedicated initializer
- Direct facade manipulation instead of going through stores
- Cross-component synchronization with ColorsPanel needs standardization

**Refactoring Approach:**

1. Create an `ExportInitializer` extending `InitializerBase`
2. Update `ExportStore` to extend `SignalStoreBase`
3. Standardize facade access through the store/initializer
4. Ensure cross-component synchronization with ColorsPanel (particularly for transparent background)
5. Use signals for UI state management

### PresetPanel Refactoring

**Current Issues:**

- Hard-coded mapping between preset IDs and facade preset names
- Directly calls `initializeSettingsFromShaderApp` (could use a dedicated initializer)

**Refactoring Approach:**

1. Create a `PresetInitializer` extending `InitializerBase` or enhance existing one
2. Update `PresetStore` to extend `SignalStoreBase`
3. Standardize mapping between preset IDs and facade names
4. Implement proper signal subscriptions
5. Standardize facade access through the store/initializer

### CodePanel Refactoring

**Current Issues:**

- Minimal implementation, not currently used
- Uses computed signals but could benefit from standardized patterns

**Refactoring Approach:**

1. Update `ExportStore` (shared with SavePanel) to support code export features
2. Standardize facade access through the store
3. Implement proper signal subscriptions if needed
4. Consider if this panel should be fully implemented or removed

## Refactoring Order and Dependencies

The recommended order for refactoring the remaining panels:

1. **~~ColorsPanel~~** - ✅ Completed - Implemented with ColorInitializer
2. **~~GeometryPanel~~** - ✅ Completed
3. **~~CameraPanel~~** - ✅ Completed - Replaced polling with reactive patterns
4. **~~LightingPanel~~** - ✅ Completed - Implemented with LightingInitializer
5. **~~SavePanel~~** - ✅ Completed - Implemented with ExportInitializer
6. **~~PresetPanel~~** - ✅ Completed - Using initializers for state management
7. **~~CodePanel~~** - ✅ Completed - Minimal implementation is sufficient for current needs

## Recent Updates and Fixes

### Restored Missing Parameter in DistortionPanel

The normalNoiseSpeed parameter was successfully restored to the DistortionPanel with the following improvements:

1. **Parameter Restoration**:

   - Added normalNoiseSpeed parameter to DistortionParameters interface in DistortionInitializer
   - Updated DEFAULT_DISTORTION_PARAMETERS with default value of 0.2
   - Added parameter to PARAMETER_DEFINITIONS with proper facade mapping
   - Added updateNormalNoiseSpeed method for parameter updates

2. **UI Integration**:

   - Added speed control UI next to the strength control in DistortionPanel
   - Implemented signal binding and handler for normalNoiseSpeed
   - Configured appropriate min/max/step values

3. **Store Synchronization**:
   - Updated DistortionStore to include normalNoiseSpeed in normalNoise object
   - Added \_noiseSpeedSignal for tracking normalNoiseSpeed value
   - Added facade binding for normalNoiseSpeed
   - Added updateNormalNoiseSpeed method to DistortionStore
   - Updated syncWithFacade to properly handle normalNoiseSpeed

### All Panel Refactoring Completed

All panels have now been successfully refactored to use the new architecture:

1. **Consistent Architecture**:

   - All panels now use dedicated initializers extending InitializerBase
   - Standardized on signal-based reactive state management
   - Implemented proper facade access through stores/initializers
   - Added appropriate event listeners with proper cleanup

2. **Eliminated Anti-Patterns**:

   - Removed all polling-based state updates (previously used in CameraPanel)
   - Eliminated dynamic key props for re-rendering
   - Standardized facade access patterns
   - Improved cross-component synchronization

3. **Enhanced UI Responsiveness**:
   - All panels now utilize signal subscriptions for reactive updates
   - Improved state synchronization with the facade
   - Streamlined parameter management with better abstractions
   - Added proper cleanup of subscriptions and event listeners

### Store Refactoring Progress

The refactoring of stores to initializers has significantly improved the application architecture:

1. **Completed Store to Initializer Migrations**:

   - **CameraStore**: Removed in favor of CameraInitializer

     - Eliminated polling-based updates in favor of signal subscriptions
     - Implemented proper FOV slider synchronization
     - Simplified camera position handling with direct initializer access
     - Fixed race conditions with orbit controls

   - **LightingStore**: Removed in favor of LightingInitializer

     - Enhanced lighting parameter synchronization
     - Simplified UI component by directly using initializer signals
     - Improved handling of directional light parameters
     - Fixed inconsistent parameter updates between panels

   - **DistortionStore**: Removed in favor of DistortionInitializer

     - Improved handling of separate X/Y scale parameters
     - Fixed normal noise parameter synchronization
     - Simplified UI component by directly using initializer signals
     - Added proper handling for noise shift parameters

   - **ColorStore**: Removed in favor of ColorInitializer

     - Enhanced gradient and color parameter management
     - Fixed transparent background synchronization between panels
     - Improved color picker integration
     - Added proper signal subscriptions for reactive updates
     - Simplified cross-component state management

   - **GeometryStore**: Migrated to GeometryInitializer
     - Fixed geometry type selection issues
     - Improved dimension controls for different shape types
     - Enhanced geometry recreation performance
     - Fixed parameter synchronization with presets

2. **Architecture Improvements**:

   - Single source of truth for panel parameters (initializers)
   - Cleaner dependency hierarchy with fewer components
   - More consistent signal-based approach throughout the application
   - Better integration with the existing initializer pattern
   - Reduced code duplication and simplified maintenance
   - Improved parameter synchronization by using only initializers
   - Removed redundant state management and update patterns

3. **Remaining Core Stores**:
   - **UIStore**: Maintains application UI state (sidebar visibility, toasts, modals)
   - **ParameterStore**: Manages general shader parameters
   - **PresetStore**: Handles preset definitions, loading, and saving
   - **HistoryStore**: Provides undo/redo functionality
   - **ExportStore**: Manages shader exports as images or code

### Removed Legacy LightingStore

The LightingStore has been successfully removed with the following improvements:

1. **Simplified Architecture**:

   - Completely eliminated legacy LightingStore in favor of LightingInitializer
   - Removed all references from index.ts and LightingPanel component
   - Streamlined lighting parameter management with the signal-based approach

2. **Reduced Code Duplication**:

   - Eliminated duplicate code for updating lighting parameters
   - Simplified parameter synchronization by using only LightingInitializer
   - Removed redundant lighting state management and update patterns

3. **Enhanced Maintainability**:
   - Single source of truth for lighting parameters (LightingInitializer)
   - Cleaner dependency hierarchy with fewer components
   - More consistent signal-based approach throughout the application
   - Better integration with the existing initializer pattern

### Export Functionality Refactoring

The Export functionality has been successfully refactored with the following improvements:

1. **Consolidated Export Flow**:

   - Created a single source of truth for export operations in `ShaderAppFacade`
   - Eliminated duplicate calls to `recreateGeometryHighQuality()` that were causing conflicts
   - Bypassed `ShaderApp.saveAsImage()` to avoid redundant geometry recreation
   - Implemented direct canvas export within the facade

2. **Enhanced High Quality Exports**:

   - Improved `SceneManager.recreateGeometryHighQuality()` to use 4x segment counts (up from 2x)
   - Added minimum segment thresholds (128 for plane, 64 for sphere, 32 for cube)
   - Implemented proper parameter saving and restoration to ensure UI state isn't affected
   - Added comprehensive logging for debugging high quality geometry creation

3. **Fixed Animation Parameter Preservation**:

   - Implemented proper backup and restoration of all animation-related parameters
   - Added specific parameter-changed events to ensure UI components update with restored values
   - Created `syncParameterFromFacade` method in `InitializerBase` to allow targeted parameter synchronization
   - Enhanced `DistortionPanel` to listen for parameter changes from exports

4. **Improved Parameter Synchronization**:

   - Removed direct facade manipulation from `SavePanel`
   - Created consistent event emission for parameter changes
   - Simplified the `SavePanel` implementation to use the store exclusively
   - Added precise source tracking for parameter changes to improve debugging

**Lessons Learned**:

1. **Architectural Clarity**: The refactoring revealed the importance of having clear boundaries between components. Having both `ShaderApp` and `ShaderAppFacade` trying to handle the same functionality created conflicts.

2. **Single Source of Truth**: Centralizing the export functionality in `ShaderAppFacade` eliminated race conditions and parameter conflicts that were causing the bugs.

3. **Event-Based Communication**: Using proper event emission for parameter changes is more reliable than direct updates, especially for cross-component synchronization.

4. **Comprehensive Parameter Management**: Simply backing up and restoring parameters isn't sufficient; components need to be notified when parameters are restored, which we accomplished with proper event emission.

5. **Facade-Driven Architecture**: This refactoring demonstrates the power of having a clear facade that abstracts the underlying complex implementation. By centralizing complex operations like export in the facade, we simplified the component code and eliminated bugs.

**Next Steps**:

- Apply similar patterns to other complex operations in the application
- Continue refactoring other panels to use proper parameter synchronization mechanisms
- Consider adding comprehensive logging throughout the application to aid in debugging
- Implement additional unit tests for the export functionality to prevent regression

## Testing and Validation

For each refactored panel:

1. Verify all parameters sync correctly with the facade
2. Test interaction with other panels and cross-component synchronization
3. Confirm presets correctly save and restore panel parameters
4. Verify UI responsiveness and immediate feedback
5. Test error handling for missing facade parameters
6. Ensure proper cleanup of effects and subscriptions

### Export Functionality Refactoring

The Export functionality has been successfully refactored with the following improvements:

1. **Consolidated Export Flow**:

   - Created a single source of truth for export operations in `ShaderAppFacade`
   - Eliminated duplicate calls to `recreateGeometryHighQuality()` that were causing conflicts
   - Bypassed `ShaderApp.saveAsImage()` to avoid redundant geometry recreation
   - Implemented direct canvas export within the facade

2. **Enhanced High Quality Exports**:

   - Improved `SceneManager.recreateGeometryHighQuality()` to use 4x segment counts (up from 2x)
   - Added minimum segment thresholds (128 for plane, 64 for sphere, 32 for cube)
   - Implemented proper parameter saving and restoration to ensure UI state isn't affected
   - Added comprehensive logging for debugging high quality geometry creation

3. **Fixed Animation Parameter Preservation**:

   - Implemented proper backup and restoration of all animation-related parameters
   - Added specific parameter-changed events to ensure UI components update with restored values
   - Created `syncParameterFromFacade` method in `InitializerBase` to allow targeted parameter synchronization
   - Enhanced `DistortionPanel` to listen for parameter changes from exports

4. **Improved Parameter Synchronization**:

   - Removed direct facade manipulation from `SavePanel`
   - Created consistent event emission for parameter changes
   - Simplified the `SavePanel` implementation to use the store exclusively
   - Added precise source tracking for parameter changes to improve debugging

**Lessons Learned**:

1. **Architectural Clarity**: The refactoring revealed the importance of having clear boundaries between components. Having both `ShaderApp` and `ShaderAppFacade` trying to handle the same functionality created conflicts.

2. **Single Source of Truth**: Centralizing the export functionality in `ShaderAppFacade` eliminated race conditions and parameter conflicts that were causing the bugs.

3. **Event-Based Communication**: Using proper event emission for parameter changes is more reliable than direct updates, especially for cross-component synchronization.

4. **Comprehensive Parameter Management**: Simply backing up and restoring parameters isn't sufficient; components need to be notified when parameters are restored, which we accomplished with proper event emission.

5. **Facade-Driven Architecture**: This refactoring demonstrates the power of having a clear facade that abstracts the underlying complex implementation. By centralizing complex operations like export in the facade, we simplified the component code and eliminated bugs.

**Next Steps**:

- Apply similar patterns to other complex operations in the application
- Continue refactoring other panels to use proper parameter synchronization mechanisms
- Consider adding comprehensive logging throughout the application to aid in debugging
- Implement additional unit tests for the export functionality to prevent regression

## Redundant Code Analysis

A comprehensive codebase analysis was conducted to identify redundant or unused code. This analysis provides insights into areas that can be cleaned up to improve maintainability.

### Unused Components

1. **CodePanel.tsx**:
   - Explicitly marked as "not currently used" in its file comments
   - Export code functionality is triggered directly from the SidePanel, not through this panel
   - The file is kept for reference in case we want to revert to a panel-based UI
   - Recommendation: Remove if no plans to revert to panel-based code export UI

### Incomplete/TODOs Features

1. **Unimplemented Features in ShaderAppFacade**:

   - Several TODO comments for features that haven't been implemented:
     - User-saved presets functionality (lines 456, 529, 556)
     - Reduced quality mode for frequent updates (line 1125)
   - Recommendation: Either implement these features or remove the TODO comments if they're no longer planned

2. **DirectionControl/TODO.md**:
   - Contains detailed plans for an app-wide tooltip animation system
   - No implementation has been started yet
   - Recommendation: Convert to GitHub issues or delete if not planned

### Debug Code

1. **Commented-Out Debug Logging**:
   - Multiple files contain commented-out console.log statements:
     - TooltipPortal.tsx (lines 30, 68, 92, 107)
     - Other UI components
   - Recommendation: Remove all commented-out debug logs for cleaner code

### Deprecated Code

1. **Backward Compatibility Methods**:

   - SceneManager.ts contains a method `recreatePlaneHighQuality()` (lines 749-754) marked as "Alias for backward compatibility"
   - Simply calls `recreateGeometryHighQuality()`
   - Recommendation: Remove this method if no external code depends on it

2. **Unused State in Components**:
   - DevPanel.tsx has an `activeTab` state that's initialized to "legacy" with a comment "Only use legacy tab now"
   - Recommendation: Simplify by removing the state if only one tab exists

### Unfinished Features

1. **Preset Deletion**:
   - PresetStore.ts has a `deletePreset` method that relies on `facade.deletePreset`
   - ShaderAppFacade.ts marks this as "not fully implemented yet"
   - Recommendation: Complete implementation or simplify with clearer "not implemented" errors

### Cleanup Recommendations

1. ✅ **CodePanel.tsx Removed**:

   - Successfully removed the unused CodePanel.tsx component
   - Removed export from Panels/index.ts
   - Confirmed that code export functionality continues to work through the modal triggered from SidePanel
   - This cleanup was completed successfully

2. **Delete or convert TODO.md files** to GitHub issues for better tracking.

3. **Remove commented-out debug logging** throughout the codebase.

4. **Remove deprecated methods** like `recreatePlaneHighQuality()` if they're not used externally.

5. **Simplify complex cleanup functions** where possible, especially in useScrubDrag.ts.

6. **Complete or remove half-implemented features** like preset deletion.

7. **Audit and remove unused imports** across the codebase to reduce bundle size.

### Benefits of Cleanup

1. **Improved maintainability** - Clearer code with less technical debt
2. **Reduced cognitive load** - Developers don't need to wonder about unused code
3. **Smaller bundle size** - Removing unused code can improve load times
4. **Clearer development path** - TODOs in code should be converted to trackable issues
5. **Reduced confusion** - No misleading comments or half-implemented features

## Proposed Future Enhancements

### Responsive Camera Adaptation

The application currently doesn't adapt the camera position or field of view when the aspect ratio of the viewport changes. This causes issues when users view the gradient on different devices or resize their browser window:

1. **Current Issues**:

   - When changing from a wider aspect ratio (e.g., 16:9) to an even wider one (e.g., 21:9), edges of the plane become visible
   - Mobile devices with portrait orientation show very different framing than desktop views
   - Exported code doesn't maintain consistent visual presentation across devices

2. **Proposed Solution**:

   - Implement dynamic camera adaptation based on viewport aspect ratio changes
   - Add reference values storage for original FOV, camera Z-position, and aspect ratio
   - Create weighted adjustment formulas to handle extreme aspect ratios gracefully
   - Update exported code (JS and HTML) to include responsive camera handling

3. **Implementation Approach**:

   - Store original camera settings as reference values in `camera.userData`
   - Add a `handleResize` method to the GradientShader object
   - Implement aspect ratio compensation logic:
     - For wider viewports: Move camera back to maintain horizontal field of view
     - For taller viewports: Move camera forward to maintain vertical field of view
   - Set up automatic resize event listeners in exported code

4. **Benefits**:
   - Consistent visual presentation across all devices and viewport sizes
   - Better user experience when resizing browser windows
   - Improved display on mobile devices
   - Professional-quality exported code that works reliably in responsive environments

This enhancement should be prioritized after completing the current refactoring tasks to ensure a polished final product.

## Refactoring Order and Dependencies

The recommended order for refactoring the remaining panels:
