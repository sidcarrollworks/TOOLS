import { ShaderAppFacade } from "../../ShaderAppFacade";
import { MockShaderApp } from "../../__mocks__/MockShaderApp";
import type { FacadeConfig } from "../../FacadeConfig";

// Mock the ShaderApp implementation
jest.mock("../../../ShaderApp", () => {
  return {
    ShaderApp: MockShaderApp,
  };
});

describe("ShaderAppFacade", () => {
  let facade: ShaderAppFacade;
  let mockContainer: HTMLDivElement;
  const defaultConfig: FacadeConfig = {
    performance: {
      throttleEvents: false,
      batchParameterUpdates: false,
    },
    debug: {
      enableLogging: false,
      validateParameters: true,
    },
  };

  beforeEach(() => {
    // Create a mock container element
    mockContainer = document.createElement("div");
    mockContainer.id = "mock-container";
    document.body.appendChild(mockContainer);

    // Create a new facade instance with the container element
    facade = new ShaderAppFacade(mockContainer, defaultConfig);
  });

  afterEach(() => {
    // Clean up
    if (facade) {
      facade.dispose();
    }
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
  });

  describe("Initialization", () => {
    it("should initialize with default configuration", async () => {
      await facade.initialize();
      expect(facade.isInitialized()).toBe(true);
    });

    it("should initialize with custom configuration", async () => {
      const customConfig: FacadeConfig = {
        ...defaultConfig,
        performance: {
          throttleEvents: true,
          throttleDelay: 50,
        },
      };

      const customFacade = new ShaderAppFacade(mockContainer, customConfig);
      await customFacade.initialize();

      expect(customFacade.isInitialized()).toBe(true);
      expect(customFacade.getConfig().performance?.throttleEvents).toBe(true);
      expect(customFacade.getConfig().performance?.throttleDelay).toBe(50);

      customFacade.dispose();
    });

    it("should throw an error when initialized twice", async () => {
      await facade.initialize();
      await expect(facade.initialize()).rejects.toThrow("Already initialized");
    });
  });

  describe("Parameter Management", () => {
    beforeEach(async () => {
      await facade.initialize();
    });

    it("should get and set parameters correctly", () => {
      // Set a parameter
      const result = facade.setParameter("color1", "#ff0000");
      expect(result).toBe(true);

      // Get the parameter
      const value = facade.getParameter("color1");
      expect(value).toBe("#ff0000");
    });

    it("should handle batch parameter updates", () => {
      const updates = {
        color1: "#ff0000",
        color2: "#00ff00",
        noiseScale: 1.5,
      };

      const result = facade.updateParameters(updates);
      expect(result).toBe(true);

      // Verify all parameters were updated
      expect(facade.getParameter("color1")).toBe("#ff0000");
      expect(facade.getParameter("color2")).toBe("#00ff00");
      expect(facade.getParameter("noiseScale")).toBe(1.5);
    });

    it("should validate parameters before setting", () => {
      // Set an invalid parameter (assuming color validation requires # prefix)
      const result = facade.setParameter("color1", "invalid-color");
      expect(result).toBe(false);

      // Parameter should not be updated
      expect(facade.getParameter("color1")).not.toBe("invalid-color");
    });

    it("should reset parameters to defaults", () => {
      // Set some parameters
      facade.setParameter("color1", "#ff0000");
      facade.setParameter("color2", "#00ff00");

      // Reset parameters
      facade.resetParameters();

      // Parameters should be reset to defaults
      expect(facade.getParameter("color1")).not.toBe("#ff0000");
      expect(facade.getParameter("color2")).not.toBe("#00ff00");
    });
  });

  describe("Event System", () => {
    let eventCallback: jest.Mock;

    beforeEach(async () => {
      await facade.initialize();
      eventCallback = jest.fn();
    });

    it("should emit and receive events", () => {
      // Subscribe to an event
      facade.on("parameter:update", eventCallback);

      // Set a parameter to trigger the event
      facade.setParameter("color1", "#ff0000");

      // Callback should be called
      expect(eventCallback).toHaveBeenCalledTimes(1);
      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          parameter: "color1",
          value: "#ff0000",
        })
      );
    });

    it("should unsubscribe from events correctly", () => {
      // Subscribe to an event
      facade.on("parameter:update", eventCallback);

      // Unsubscribe
      facade.off("parameter:update", eventCallback);

      // Set a parameter to potentially trigger the event
      facade.setParameter("color1", "#ff0000");

      // Callback should not be called
      expect(eventCallback).not.toHaveBeenCalled();
    });

    it("should support one-time event subscriptions", () => {
      // Subscribe to an event once
      facade.once("parameter:update", eventCallback);

      // Set a parameter to trigger the event
      facade.setParameter("color1", "#ff0000");

      // Set another parameter
      facade.setParameter("color2", "#00ff00");

      // Callback should be called only once
      expect(eventCallback).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple event subscriptions", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Subscribe to events
      facade.on("parameter:update", callback1);
      facade.on("parameter:update", callback2);

      // Set a parameter to trigger the event
      facade.setParameter("color1", "#ff0000");

      // Both callbacks should be called
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should emit batch update events", () => {
      const batchCallback = jest.fn();

      // Subscribe to batch update event
      facade.on("parameters:batch:update", batchCallback);

      // Update multiple parameters
      facade.updateParameters({
        color1: "#ff0000",
        color2: "#00ff00",
      });

      // Batch callback should be called
      expect(batchCallback).toHaveBeenCalledTimes(1);
      expect(batchCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({
            color1: "#ff0000",
            color2: "#00ff00",
          }),
        })
      );
    });
  });

  describe("Presets", () => {
    beforeEach(async () => {
      await facade.initialize();
    });

    it("should add and apply presets", () => {
      // Set some parameters
      facade.setParameter("color1", "#ff0000");
      facade.setParameter("color2", "#00ff00");

      // Add as preset
      const result = facade.addPreset("TestPreset");
      expect(result).toBe(true);

      // Change parameters
      facade.setParameter("color1", "#0000ff");

      // Apply preset
      const applyResult = facade.applyPreset("TestPreset");
      expect(applyResult).toBe(true);

      // Parameters should be restored
      expect(facade.getParameter("color1")).toBe("#ff0000");
      expect(facade.getParameter("color2")).toBe("#00ff00");
    });

    it("should get all available presets", () => {
      // Add a preset
      facade.addPreset("Preset1");

      // Get presets
      const presets = facade.getPresets();

      // Should include the added preset
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.name === "Preset1")).toBe(true);
    });

    it("should remove presets", () => {
      // Add a preset
      facade.addPreset("TemporaryPreset");

      // Remove the preset
      const result = facade.removePreset("TemporaryPreset");
      expect(result).toBe(true);

      // Get presets
      const presets = facade.getPresets();

      // Should not include the removed preset
      expect(presets.some((p) => p.name === "TemporaryPreset")).toBe(false);
    });
  });

  describe("Rendering and Camera", () => {
    beforeEach(async () => {
      await facade.initialize();
    });

    it("should trigger render", () => {
      const renderCallback = jest.fn();

      // Subscribe to render events
      facade.on("render:start", renderCallback);

      // Trigger render
      facade.render();

      // Event should be emitted
      expect(renderCallback).toHaveBeenCalled();
    });

    it("should reset camera", () => {
      const cameraCallback = jest.fn();

      // Subscribe to camera events
      facade.on("camera:reset", cameraCallback);

      // Reset camera
      facade.resetCamera();

      // Event should be emitted
      expect(cameraCallback).toHaveBeenCalled();
    });

    it("should update camera position", () => {
      const position = { x: 1, y: 2, z: 3 };
      const cameraCallback = jest.fn();

      // Subscribe to camera events
      facade.on("camera:update", cameraCallback);

      // Set camera position
      facade.setCamera(position);

      // Event should be emitted
      expect(cameraCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          position,
        })
      );
    });
  });

  describe("Export and Save", () => {
    beforeEach(async () => {
      await facade.initialize();
    });

    it("should save as image", async () => {
      const exportCallback = jest.fn();

      // Subscribe to export events
      facade.on("export:start", exportCallback);

      // Save as image
      const result = await facade.saveAsImage();

      // Event should be emitted
      expect(exportCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "image",
        })
      );

      // Should return a data URL
      expect(result).toMatch(/^data:/);
    });

    it("should export code", async () => {
      const exportCallback = jest.fn();

      // Subscribe to export events
      facade.on("export:start", exportCallback);

      // Export code
      const result = await facade.exportCode();

      // Event should be emitted
      expect(exportCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "code",
        })
      );

      // Should return a string
      expect(typeof result).toBe("string");
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await facade.initialize();
    });

    it("should handle errors during rendering", async () => {
      // Mock the render method to throw an error
      const mockApp = facade["app"];
      const originalRender = mockApp.render;
      mockApp.render = jest.fn().mockImplementation(() => {
        throw new Error("Render error");
      });

      const errorCallback = jest.fn();

      // Subscribe to error events
      facade.on("render:error", errorCallback);

      // Trigger render
      facade.render();

      // Error event should be emitted
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
        })
      );

      // Restore original method
      mockApp.render = originalRender;
    });

    it("should handle invalid parameter types", () => {
      const errorCallback = jest.fn();

      // Subscribe to error events
      facade.on("error", errorCallback);

      // Set an invalid parameter type
      // @ts-ignore - Intentionally passing wrong type for testing
      const result = facade.setParameter("noiseScale", "not-a-number");

      // Update should fail
      expect(result).toBe(false);

      // Error event should be emitted
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe("Configuration and Performance", () => {
    it("should respect throttleEvents configuration", async () => {
      // Create facade with throttled events
      const throttledFacade = new ShaderAppFacade(mockContainer, {
        ...defaultConfig,
        performance: {
          throttleEvents: true,
          throttleDelay: 100,
        },
      });

      await throttledFacade.initialize();

      const callback = jest.fn();

      // Subscribe to events
      throttledFacade.on("parameter:update", callback);

      // Rapidly update parameters
      throttledFacade.setParameter("noiseScale", 1);
      throttledFacade.setParameter("noiseScale", 2);
      throttledFacade.setParameter("noiseScale", 3);

      // After throttle delay, callback should be called only once
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be called with the last value only
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 3,
        })
      );

      throttledFacade.dispose();
    });

    it("should respect batchParameterUpdates configuration", async () => {
      // Create facade with batched updates
      const batchedFacade = new ShaderAppFacade(mockContainer, {
        ...defaultConfig,
        performance: {
          batchParameterUpdates: true,
          batchDelay: 50,
        },
      });

      await batchedFacade.initialize();

      const callback = jest.fn();
      const batchCallback = jest.fn();

      // Subscribe to events
      batchedFacade.on("parameter:update", callback);
      batchedFacade.on("parameters:batch:update", batchCallback);

      // Rapidly update parameters
      batchedFacade.setParameter("color1", "#ff0000");
      batchedFacade.setParameter("color2", "#00ff00");

      // Individual updates should be queued for batching
      expect(callback).not.toHaveBeenCalled();

      // After batch delay, batch callback should be called
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Individual updates should be suppressed
      expect(callback).not.toHaveBeenCalled();

      // Batch update should be emitted
      expect(batchCallback).toHaveBeenCalledTimes(1);
      expect(batchCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({
            color1: "#ff0000",
            color2: "#00ff00",
          }),
        })
      );

      batchedFacade.dispose();
    });
  });

  describe("Cleanup and Disposal", () => {
    beforeEach(async () => {
      await facade.initialize();
    });

    it("should clean up resources when disposed", () => {
      const callback = jest.fn();

      // Subscribe to events
      facade.on("parameter:update", callback);

      // Dispose
      facade.dispose();

      // Verify facade is no longer initialized
      expect(facade.isInitialized()).toBe(false);

      // Facade should no longer respond to method calls
      facade.setParameter("color1", "#ff0000");

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
