/**
 * Testing utilities for the ShaderAppFacade
 * Makes it easier to test components that use the facade
 */

// Export all testing utilities
export * from "./FacadeTestUtils";
export * from "./ComponentTestHelpers";

// Export mock facade
export { MockShaderAppFacade } from "../__mocks__/MockShaderAppFacade";

/**
 * Simple test example that can be copied and modified for reference:
 *
 * ```tsx
 * import { h } from 'preact';
 * import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
 * import {
 *   TestFacadeProvider,
 *   ParameterDebugPanel,
 *   EventDebugPanel,
 *   createTestFacade,
 *   waitForEvent
 * } from '../lib/facade/testing';
 *
 * // Example component to test
 * const ColorControl = () => {
 *   const { useFacade } = require('../lib/facade/FacadeContext');
 *   const { useParameter } = require('../lib/hooks/useParameter');
 *
 *   const facade = useFacade();
 *   const { value, setValue } = useParameter('color1');
 *
 *   return (
 *     <div>
 *       <input
 *         type="color"
 *         value={value}
 *         onChange={e => setValue(e.target.value)}
 *         data-testid="color-input"
 *       />
 *     </div>
 *   );
 * };
 *
 * describe('ColorControl', () => {
 *   it('should update color parameter when input changes', async () => {
 *     // Create test facade with event recording
 *     const { facade, recorders, cleanup } = createTestFacade({
 *       initialParams: { color1: '#ff0000' },
 *       recordEvents: ['parameter:update']
 *     });
 *
 *     // Render component with test provider
 *     render(
 *       <TestFacadeProvider initialParams={{ color1: '#ff0000' }}>
 *         <ColorControl />
 *         <ParameterDebugPanel paramNames={['color1']} />
 *       </TestFacadeProvider>
 *     );
 *
 *     // Find the color input
 *     const colorInput = screen.getByTestId('color-input');
 *
 *     // Change the color
 *     fireEvent.change(colorInput, { target: { value: '#0000ff' } });
 *
 *     // Wait for parameter update event
 *     await waitForEvent(recorders.get('parameter:update'), event =>
 *       event.name === 'color1' && event.value === '#0000ff'
 *     );
 *
 *     // Verify parameter was updated
 *     expect(facade.getParameter('color1')).toBe('#0000ff');
 *
 *     // Clean up
 *     cleanup();
 *   });
 * });
 * ```
 */
