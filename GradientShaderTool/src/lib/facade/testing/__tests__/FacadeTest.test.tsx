/**
 * Example test patterns for ShaderAppFacade (FOR DOCUMENTATION ONLY)
 *
 * IMPORTANT: This file is NOT meant to be executed and contains only example code
 * for demonstration purposes. It shows the patterns that could be used with a
 * test framework like Jest to test components using the facade.
 *
 * The code below intentionally uses simplified types and test patterns to illustrate
 * the concepts without triggering type errors. In a real test file, you would use
 * the proper types and actual test framework.
 */

// @ts-nocheck
/* eslint-disable */

import { h } from "preact";
import type { IShaderAppFacade } from "../../types";
import type { ShaderParams } from "../../../ShaderApp";

/**
 * Example illustrating how to test components with the facade
 *
 * In a real test file, you would:
 * 1. Import the actual components and utilities
 * 2. Use proper test framework functions (describe, it, expect)
 * 3. Use the correct types for all parameters and returns
 *
 * This example is simplified for clarity and documentation.
 */

/**
 * Example: Testing parameter updates
 *
 * ```ts
 * // Import your test utilities
 * import {
 *   createTestFacade,
 *   TestFacadeProvider,
 *   waitForEvent
 * } from "../lib/facade/testing";
 *
 * // Test a component that uses the facade
 * describe("ColorControl", () => {
 *   it("should update color parameter when changed", async () => {
 *     // Create test facade with event recording
 *     const { facade, recorders, cleanup } = createTestFacade({
 *       initialParams: { color1: "#ff0000" },
 *       recordEvents: ["parameter:update"]
 *     });
 *
 *     // Update a parameter
 *     facade.setParameter("color1", "#00ff00");
 *
 *     // Check event was recorded
 *     const events = recorders.get("parameter:update").getEvents();
 *     expect(events[0].name).toBe("color1");
 *     expect(events[0].value).toBe("#00ff00");
 *
 *     // Clean up when done
 *     cleanup();
 *   });
 * });
 * ```
 */

/**
 * Example: Testing components with the TestFacadeProvider
 *
 * ```tsx
 * import { h } from "preact";
 * import { render, screen, fireEvent } from "@testing-library/preact";
 * import { TestFacadeProvider, ParameterDebugPanel } from "../lib/facade/testing";
 * import { ColorControl } from "../components/ColorControl";
 *
 * describe("ColorControl", () => {
 *   it("should render with initial color", () => {
 *     // Render component with test provider
 *     render(
 *       <TestFacadeProvider initialParams={{ color1: "#ff0000" }}>
 *         <ColorControl />
 *         <ParameterDebugPanel paramNames={["color1"]} />
 *       </TestFacadeProvider>
 *     );
 *
 *     // Find the color input
 *     const colorInput = screen.getByTestId("color-input");
 *
 *     // Check initial value
 *     expect(colorInput.value).toBe("#ff0000");
 *   });
 *
 *   it("should update color when changed", () => {
 *     // Create a mock facade
 *     const mockFacade = new MockShaderAppFacade({
 *       color1: "#ff0000"
 *     });
 *
 *     // Set up event tracking
 *     const updateSpy = jest.fn();
 *     mockFacade.on("parameter:update", updateSpy);
 *
 *     // Render with our test facade
 *     render(
 *       <TestFacadeProvider facade={mockFacade}>
 *         <ColorControl />
 *       </TestFacadeProvider>
 *     );
 *
 *     // Find the color input
 *     const colorInput = screen.getByTestId("color-input");
 *
 *     // Change the color
 *     fireEvent.change(colorInput, { target: { value: "#0000ff" } });
 *
 *     // Check event was fired
 *     expect(updateSpy).toHaveBeenCalledWith(
 *       expect.objectContaining({
 *         name: "color1",
 *         value: "#0000ff"
 *       })
 *     );
 *   });
 * });
 * ```
 */

/**
 * Example: Testing event handling with waitForEvent
 *
 * ```ts
 * describe("EventHandling", () => {
 *   it("should wait for specific events", async () => {
 *     // Create test facade with event recording
 *     const { facade, recorders, cleanup } = createTestFacade({
 *       recordEvents: ["parameter:update"]
 *     });
 *
 *     // Set up test to wait for an event
 *     const eventPromise = waitForEvent(
 *       recorders.get("parameter:update"),
 *       event => event.name === "color1" && event.value === "#0000ff"
 *     );
 *
 *     // Update parameter in the background
 *     setTimeout(() => {
 *       facade.setParameter("color1", "#0000ff");
 *     }, 10);
 *
 *     // Wait for the event
 *     await eventPromise;
 *
 *     // Clean up
 *     cleanup();
 *   });
 * });
 * ```
 */

/**
 * Example: Testing sequential parameter changes
 *
 * ```ts
 * describe("ParameterChanges", () => {
 *   it("should apply parameter changes sequentially", async () => {
 *     // Create test facade
 *     const { facade, cleanup } = createTestFacade();
 *
 *     // Apply multiple parameter changes
 *     await applyParameterChanges(facade, [
 *       { name: "color1", value: "#ff0000" },
 *       { name: "color2", value: "#00ff00" },
 *       { name: "numStops", value: 5 }
 *     ]);
 *
 *     // Check parameters were updated
 *     expect(facade.getParameter("color1")).toBe("#ff0000");
 *     expect(facade.getParameter("color2")).toBe("#00ff00");
 *     expect(facade.getParameter("numStops")).toBe(5);
 *
 *     // Clean up
 *     cleanup();
 *   });
 * });
 * ```
 */
