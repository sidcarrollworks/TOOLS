# Gradient Shader Tool Refactor Plan

## Recent Accomplishments (April 2024)

### Phase 3 Progress: Core Store Implementation

1. ✅ Implemented comprehensive store system

   - Created six specialized stores for different aspects of the application
   - Implemented central store registry for coordinated initialization
   - Established consistent access patterns through getter functions
   - Added proper resource management and cleanup

2. ✅ Created robust CameraStore for camera management

   - Implemented CameraStore for position, target, and FOV management
   - Created OrbitControlsSync component for syncing camera controls
   - Fixed UI rendering issues with camera updates
   - Added bidirectional synchronization between UI and 3D view

3. ✅ Enhanced UI component system
   - Created StandardSlider component with consistent styling
   - Implemented proper component layout with SettingsGroup
   - Added CSS improvements for consistent appearance
   - Fixed layout and container issues affecting the application

### Performance and User Experience Improvements

1. ✅ Optimized update responsiveness

   - Reduced debounce times for all panel components to improve UI responsiveness
   - ColorsPanel: Decreased from 50ms to 5ms
   - LightingPanel: Decreased from 50ms to 5ms
   - DistortionPanel: Decreased from 25ms to 5ms
   - GeometryPanel: Decreased from 300ms to 50ms (kept slightly higher to balance responsiveness with performance)

2. ✅ Fixed adaptive resolution behavior

   - Added useAdaptiveResolution setting to prevent automatic resolution reduction
   - Updated SceneManager to respect this setting
   - Set adaptive resolution to disabled by default
   - Added method to force recreation of geometry at full resolution

3. ✅ Improved application structure
   - Removed redundant Layout component that was no longer in use
   - Centralized KeyboardHints into a dedicated component folder
   - Moved paused badge styling to global CSS
   - Simplified component hierarchy for better maintenance
   - Streamlined initialization for faster startup

### Bug Fixes and Code Improvements

1. ✅ Improved error handling

   - Added proper timeout cleanup in event handlers
   - Implemented proper initialization checks
   - Added parameter validation before updates

2. ✅ Enhanced type safety

   - Added missing types and interfaces
   - Fixed incorrect type assertions
   - Improved type checking throughout the codebase

3. ✅ Fixed linter errors in core components
   - Corrected import statements in store files
   - Fixed component path references
   - Resolved type safety issues in ParameterStore implementation
   - Updated SignalEffect implementation to use proper hooks

---

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

7. ✅ Created mock implementation for testing

   - Implemented MockShaderAppFacade with simulated behavior
   - Added parameter validation with type checking
   - Created event simulation for testing event handlers
   - Added preset management for test scenarios
   - Implemented geometry and camera operations for UI testing

8. ✅ Implemented component test helpers

   - Created TestFacadeProvider component for UI testing
   - Implemented ParameterDebugPanel for visualizing parameter values
   - Created EventDebugPanel for monitoring facade events
   - Added FacadeTestUtils with event recording and testing utilities
   - Implemented waitForEvent and applyParameterChanges for async testing

9. ✅ Updated app initialization to use facade

   - Added FacadeProvider to the app component
   - Wrapped ShaderCanvas in FacadeProvider context
   - Added proper error handling for facade initialization failures
   - Added detailed logging for initialization process
   - Properly connected settings system to facade

10. ✅ Fixed component initialization timing issues

    - Refactored components to use facadeSignal instead of useFacade hook
    - Added null checks for facade.value in all components
    - Added conditional rendering to only show components when facade is initialized
    - Updated SidePanel and other key components to avoid initialization race conditions
    - Implemented proper error boundary to catch facade-related errors
    - Improved initialization sequence by using facadeSignal to pass the facade instance
    - Fixed race conditions between component initialization and facade availability
    - Added graceful fallback when facade is not available
    - Applied consistent pattern for facade usage across components
    - Prevented premature component rendering before facade initialization

11. ✅ Refactored panel components to use the facade

    - Updated CameraPanel to use facadeSignal
    - Updated ColorsPanel to use facadeSignal
    - Updated PresetPanel to use facadeSignal
    - Updated GeometryPanel to use facadeSignal
    - Updated DevPanel to use facadeSignal
    - Made facade usage consistent across all panel components

12. ✅ Fixed canvas rendering issues

    - Restructured component hierarchy to prevent initialization conflicts
    - Moved ShaderCanvas outside the FacadeProvider to prevent re-renders affecting it
    - Updated CSS to ensure proper canvas positioning
    - Added proper cleanup mechanism when components unmount
    - Modified FacadeProvider to not dispose facade during internal re-renders
    - Added central cleanup in App component for proper resource management
    - Implemented thorough logging to track initialization and cleanup process

13. ✅ Fixed animation loop issues

    - Removed duplicate animation loops between ShaderApp and ShaderAppFacade
    - Updated ShaderAppFacade to let ShaderApp control the animation loop
    - Modified initialization process to prevent multiple animation loops
    - Fixed animation tracking to properly detect if animation is running
    - Updated dispose method to ensure proper cleanup of animation resources
    - Fixed animation speed to respect browser's refresh rate
    - Added detailed logging for animation state changes

14. ✅ Improved application structure and layout

    - Completely removed unnecessary viewportContainer and main elements
    - Created standalone KeyboardHintsContainer component
    - Moved KeyboardHints directly into the shader-canvas-container
    - Created proper layering with z-index for UI elements on top of canvas
    - Added standalone CSS modules for each extracted component
    - Simplified the component hierarchy for better performance
    - Fixed the placement of the pause badge indicator

15. ✅ Fixed stats visibility and keyboard shortcuts

    - Fixed the 's' key shortcut to correctly toggle Stats.js visibility
    - Updated ShaderApp to hide stats by default on initialization
    - Modified ShaderAppFacade to respect the default stats visibility setting
    - Updated the toggleStats function to find Stats.js DOM element reliably
    - Added proper error handling for stats toggling
    - Created multiple fallback approaches to ensure stats visibility can be toggled

16. ✅ Added comprehensive documentation for facade usage

    - Created detailed README.md with usage examples for all facade features
    - Added clear API reference section documenting all methods
    - Included event documentation with payload types and descriptions
    - Added configuration options documentation with examples
    - Created error handling documentation and examples
    - Included advanced usage patterns for performance optimization

17. ✅ Added unit tests for facade implementation
    - Created mock implementation of ShaderApp for testing
    - Implemented comprehensive test suite for all facade functionality
    - Added tests for parameter management, events, presets, and error handling
    - Implemented performance tests for throttling and batching
    - Added cleanup and disposal tests
    - Created test utilities for component testing

#### Next Steps:

18. Begin planning for Phase 3 implementation
19. Document component architecture for standardized state management
20. Create prototype of signal-based stores

### Next Steps - Phase 3: Standardize State Management

The next phase will focus on standardizing state management with signal stores, implementing consistent UI patterns, and further optimizing performance.

## Phase 3: Standardize State Management - IN PROGRESS 🔄

### Goals for Phase 3:

- Create a standardized state management approach using signal stores
- Implement consistent patterns for UI components and user interactions
- Improve performance with optimized render patterns
- Add comprehensive error handling and recovery mechanisms
- Create reusable UI components for common settings patterns

### Preliminary Tasks:

1. ✅ Document existing state patterns across components
2. ✅ Create prototype of signal store architecture
3. ✅ Define standard patterns for UI components

### Implementation Plan:

1. **Create Signal Store Foundation**

   - ✅ Define store interfaces and types
   - ✅ Implement base store functionality in `StoreBase.ts`
   - ✅ Create utility functions for common operations
   - ✅ Add debugging capabilities for tracking updates

2. **Implement Core Stores**

   - ✅ Create ParameterStore for shader parameters
   - ✅ Implement UIStore for UI state
   - ✅ Create GeometryStore for geometry-specific state
   - ✅ Implement PresetStore for preset management
   - ✅ Add HistoryStore for undo/redo functionality
   - ✅ Implement ExportStore for exporting shaders
   - ✅ Create CameraStore for camera controls

3. **Create UI Component Library**

   - ✅ Implement SettingsGroup component for parameter grouping
   - ✅ Create SettingsField component for consistent field layout
   - ✅ Implement Icon system for UI elements
   - ✅ Create StandardSlider with consistent behavior
   - 🔄 Implement ColorInput with enhanced features
   - 🔄 Create ToggleButton with consistent styling
   - 🔄 Implement TabGroup for panel organization

4. **Add Global Error Handling**

   - 🔄 Create error boundary components
   - 🔄 Implement toast notification system
   - 🔄 Add error logging and reporting
   - 🔄 Create recovery mechanisms for common errors

5. **Optimize Performance**

   - 🔄 Implement virtualization for long lists
   - 🔄 Add memoization for expensive calculations
   - 🔄 Create optimized render patterns for components
   - 🔄 Implement performance monitoring tools

### Timeline for Phase 3:

1. Week 1: Signal Store Foundation and Core Stores ✅
2. Week 2: UI Component Library 🔄
3. Week 3: Error Handling and Recovery
4. Week 4: Performance Optimization

### Accomplished in Phase 3:

1. **Signal Store Foundation**

   - ✅ Created `StoreBase.ts` with common store functionality
   - ✅ Implemented signal-based state management with typed interfaces
   - ✅ Added methods for getting/setting state and creating computed values
   - ✅ Implemented debugging capabilities for tracing state changes

2. **Core Store Implementation**

   - ✅ Created `UIStore` for managing UI state (sidebar visibility, toasts, modals)
   - ✅ Implemented `GeometryStore` for geometry-specific state management
   - ✅ Created `PresetStore` for preset definitions, loading, and saving
   - ✅ Implemented `HistoryStore` for undo/redo functionality
   - ✅ Created `ParameterStore` for shader parameter management
   - ✅ Implemented `ExportStore` for exporting shaders as images or code
   - ✅ Created `CameraStore` for camera position, target, and FOV management

3. **Store Integration System**

   - ✅ Created central store registry in `stores/index.ts`
   - ✅ Implemented consistent initialization patterns
   - ✅ Added facade integration for all stores
   - ✅ Created standardized access patterns through getter functions
   - ✅ Added proper cleanup and disposal for store resources

4. **UI Component Library**

   - ✅ Created `SettingsGroup` and `SettingsField` components
   - ✅ Implemented a complete Icon system with consistent styling
   - ✅ Created `StandardSlider` component with proper styling
   - ✅ Added proper CSS for all new components
   - ✅ Ensured accessibility and usability features in UI components

5. **Panel Refactoring**
   - ✅ Refactored `CameraPanel` to use the new store system
   - ✅ Implemented proper camera controls with two-way binding
   - ✅ Added orbit controls synchronization with camera store
   - ✅ Improved UI feedback and error handling in panels

### Detailed Implementation Plan for Phase 3 Remaining Tasks:

## 1. Complete Signal Store Implementation (Week 2)

### 1.1 UIStore Implementation

- Create `UIStore.ts` to manage UI-specific state:
  - Sidebar visibility and active panel
  - Modal state (active modal, modal data)
  - Toast notifications queue
  - Global UI flags (loading states, error states)
- Add methods for common UI operations:
  - Toggle sidebar, change active panel
  - Open/close modals with data
  - Show/hide notifications
  - Track UI interaction states

### 1.2 GeometryStore Implementation

- Create `GeometryStore.ts` to handle geometry-specific state:
  - Geometry type (plane, sphere, etc.)
  - Resolution settings
  - Adaptive resolution controls
  - Rebuilding status tracking
- Add specialized methods:
  - Rebuild geometry with proper error handling
  - Adjust resolution with performance considerations
  - Track rebuilding state for UI feedback

### 1.3 PresetStore Implementation

- Create `PresetStore.ts` for preset management:
  - Store preset definitions and metadata
  - Track current active preset
  - Handle preset loading states
  - Manage custom user presets
- Implement methods for:
  - Loading presets from different sources
  - Applying presets with proper parameter updates
  - Saving current state as a preset
  - Importing/exporting presets

### 1.4 CameraStore Implementation

- Create `CameraStore.ts` for camera controls:
  - Camera position, target, and rotation
  - Field of view and zoom settings
  - Orbit controls state
  - Animation settings
- Add methods for:
  - Camera movement with proper constraints
  - Smooth camera animations
  - Orbit controls with customizable speed
  - Camera reset operations

### 1.5 Store Integration System

- Create a central store registry in `stores/index.ts`:
  - Register all stores in a central location
  - Provide consistent initialization patterns
  - Enable store debugging and monitoring
  - Create standard access patterns

## 2. UI Component Library Completion (Week 3)

### 2.1 StandardSlider Component

- Create a reusable slider component with:
  - Consistent styling matching FigmaInput
  - Support for continuous and discrete updates
  - Customizable range and step values
  - Proper accessibility attributes
  - Built-in debounce support
  - Visual feedback during interaction

### 2.2 ColorInput Component

- Implement an enhanced color input with:
  - Color swatch preview
  - Hex value input with validation
  - Support for opacity/alpha
  - Consistent styling with other inputs
  - Color picker popup option
  - Keyboard navigation support

### 2.3 ToggleButton Component

- Create a versatile toggle button with:
  - On/off state visualization
  - Support for icons and labels
  - Multiple style variants (primary, secondary, etc.)
  - Size options (small, medium, large)
  - Accessibility support
  - Animation for state changes

### 2.4 TabGroup Component

- Implement a flexible tab navigation system:
  - Horizontal and vertical orientations
  - Support for icons and badges
  - Consistent styling with panel navigation
  - Animation for tab switching
  - Keyboard navigation support
  - Content area with proper ARIA attributes

## 3. Error Handling System (Week 3-4)

### 3.1 Toast Notification System

- Create a toast notification system:
  - Multiple message types (info, success, warning, error)
  - Automatic timeout with configurability
  - Position options (top, bottom, etc.)
  - Animation for appearance/disappearance
  - Action buttons support
  - Queue management for multiple notifications

### 3.2 Error Boundaries

- Implement error boundary components:
  - Component-level error catching
  - Graceful fallback UI
  - Error reporting capabilities
  - Recovery options where possible
  - Context-aware error messaging

### 3.3 Error Logging Service

- Create a centralized error logging service:
  - Consistent error formatting
  - Error categorization
  - Optional remote reporting
  - Debugging information preservation
  - Rate limiting for repeated errors

### 3.4 Recovery Mechanisms

- Implement recovery strategies for common errors:
  - Parameter validation failures
  - Network/loading errors
  - WebGL context issues
  - Out-of-memory situations
  - Auto-retry with backoff for transient errors

## 4. Performance Optimization (Week 4)

### 4.1 Render Optimization

- Implement optimized render patterns:
  - Proper use of memoization for components
  - Fine-grained reactivity with signals
  - Prevent unnecessary re-renders
  - Component lazy loading
  - Batch updates for related state changes

### 4.2 Resource Management

- Improve resource utilization:
  - Proper cleanup of unused resources
  - Texture and geometry pooling
  - Prioritize critical rendering tasks
  - Throttle non-essential updates
  - Manage WebGL context resources efficiently

### 4.3 Performance Monitoring

- Add performance monitoring capabilities:
  - FPS counter with thresholds
  - Render time tracking
  - Memory usage monitoring
  - Update frequency analysis
  - Performance issues detection

### 4.4 Progressive Enhancement

- Implement progressive enhancement techniques:
  - Feature detection for advanced capabilities
  - Adaptive quality settings
  - Load optimized assets based on device capability
  - Prioritize UI responsiveness
  - Intelligent workload distribution

## 5. Panel Refactoring (Throughout Weeks 2-4)

### 5.1 Panel Component Refactoring Strategy

- Define a phased approach for panel refactoring:
  - Start with simpler panels (CameraPanel, PresetPanel)
  - Progress to moderate complexity (LightingPanel, DistortionPanel)
  - End with complex panels (ColorsPanel, GeometryPanel)
  - Use consistent patterns across all panels
  - Maintain existing functionality while improving code quality

### 5.2 Panel Component Pattern

- Establish a standard pattern for all panel components:
  - Use SettingsGroup for logical parameter grouping
  - Access parameters through store hooks
  - Implement consistent update patterns
  - Handle loading and error states uniformly
  - Provide responsive layouts for different screen sizes

### 5.3 Panel-Specific Considerations

- Address unique requirements for each panel:
  - **ColorsPanel**: Handle color pickers and gradient modes
  - **GeometryPanel**: Manage rebuild operations and progress indicators
  - **LightingPanel**: Provide interactive controls for light direction
  - **DistortionPanel**: Handle multiple related parameters
  - **CameraPanel**: Integrate with OrbitControls
  - **PresetPanel**: Manage preset loading states and thumbnails

## Implementation Approach and Best Practices

### Incremental Implementation

- Take an incremental approach to minimize disruption:
  - Implement one store at a time
  - Refactor one panel at a time
  - Add new components alongside existing ones
  - Test thoroughly before moving to the next component
  - Keep the application functional throughout the process

### Code Quality Standards

- Maintain high code quality standards:
  - Comprehensive TypeScript types
  - Clear function and variable names
  - Consistent error handling
  - Proper comments for complex logic
  - Follow established project patterns

### Testing Strategy

- Implement a thorough testing approach:
  - Test stores in isolation
  - Test components with mock stores
  - Verify all error conditions
  - Ensure accessibility compliance
  - Test performance under various conditions

### Documentation

- Provide thorough documentation:
  - Document all store APIs
  - Create usage examples for components
  - Document error handling strategies
  - Explain performance considerations
  - Create contributor guidelines

## Success Criteria for Phase 3

1. **State Management Improvements**

   - All application state managed through signal stores
   - Consistent patterns for state updates
   - Improved debuggability and testability
   - Clear separation of concerns

2. **UI Component Enhancements**

   - Consistent look and feel across all inputs
   - Improved accessibility
   - Better user feedback during interactions
   - Reduced code duplication

3. **Error Handling**

   - Graceful handling of all error conditions
   - Clear user feedback for errors
   - Improved error recovery
   - Comprehensive error logging

4. **Performance**
   - Faster UI response times
   - Reduced unnecessary renders
   - Optimized update patterns
   - Better resource management

## Timeline and Milestones

### Week 1 (Completed)

- ✅ Establish store architecture with `StoreBase`
- ✅ Implement `ParameterStore` with validation
- ✅ Create `SettingsGroup` component
- ✅ Setup foundation for consistent UI patterns

### Week 2

- ✅ Complete core store implementations (UIStore, GeometryStore, PresetStore, HistoryStore, ParameterStore, ExportStore, CameraStore)
- 🔄 Begin panel refactoring with simpler panels (CameraPanel completed)
- ✅ Implement StandardSlider component
- ✅ Create store initialization system

### Week 3

- ✅ Complete remaining stores (PresetStore, HistoryStore, ExportStore, CameraStore)
- 🔄 Implement ColorInput and ToggleButton components
- 🔄 Create toast notification system through UIStore
- 🔄 Continue panel refactoring with moderate complexity panels

### Week 4

- Implement error boundaries and logging
- Complete performance optimizations
- Finish panel refactoring with complex panels
- Final integration and testing

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

3. **Refactored Settings Store**

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
