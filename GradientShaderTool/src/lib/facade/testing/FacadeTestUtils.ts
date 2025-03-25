/**
 * Test utilities for working with the facade in tests
 */

import type { ShaderParams } from "../../ShaderApp";
import type {
  IShaderAppFacade,
  ShaderAppEventType,
  ShaderAppEventMap,
} from "../types";
import { MockShaderAppFacade } from "../__mocks__/MockShaderAppFacade";

/**
 * Event recorder for tracking events emitted by the facade
 */
export class EventRecorder<K extends ShaderAppEventType = ShaderAppEventType> {
  /**
   * Recorded events
   */
  private events: Array<{ type: K; data: ShaderAppEventMap[K] }> = [];

  /**
   * Event handler
   */
  private handler: (data: ShaderAppEventMap[K]) => void;

  /**
   * Constructor
   * @param facade The facade to record events from
   * @param eventType The type of event to record
   */
  constructor(private facade: IShaderAppFacade, private eventType: K) {
    this.handler = (data: ShaderAppEventMap[K]) => {
      this.events.push({ type: this.eventType, data });
    };

    this.facade.on(this.eventType, this.handler);
  }

  /**
   * Get all recorded events
   */
  public getEvents(): Array<{ type: K; data: ShaderAppEventMap[K] }> {
    return [...this.events];
  }

  /**
   * Get the most recent event
   */
  public getLastEvent(): { type: K; data: ShaderAppEventMap[K] } | undefined {
    return this.events[this.events.length - 1];
  }

  /**
   * Check if any events have been recorded
   */
  public hasEvents(): boolean {
    return this.events.length > 0;
  }

  /**
   * Get the number of recorded events
   */
  public count(): number {
    return this.events.length;
  }

  /**
   * Clear all recorded events
   */
  public clear(): void {
    this.events = [];
  }

  /**
   * Dispose of the recorder and stop listening for events
   */
  public dispose(): void {
    this.facade.off(this.eventType, this.handler);
    this.events = [];
  }
}

/**
 * Options for creating a test facade
 */
export interface TestFacadeOptions {
  /**
   * Initial parameter values
   */
  initialParams?: Partial<ShaderParams>;

  /**
   * Whether to auto-initialize the facade
   */
  autoInitialize?: boolean;

  /**
   * Record specific events
   */
  recordEvents?: ShaderAppEventType[];
}

/**
 * Test facade with event recorders
 */
export interface TestFacade {
  /**
   * The mock facade instance
   */
  facade: IShaderAppFacade;

  /**
   * Event recorders for registered events
   */
  recorders: Partial<Record<ShaderAppEventType, EventRecorder>>;

  /**
   * Clean up resources
   */
  cleanup: () => void;
}

/**
 * Create a test facade with event recorders
 * @param options Options for creating the test facade
 */
export function createTestFacade(options: TestFacadeOptions = {}): TestFacade {
  // Create the mock facade
  const facade = new MockShaderAppFacade(options.initialParams);

  // Initialize if requested
  if (options.autoInitialize) {
    const container = document.createElement("div");
    facade.initialize(container);
  }

  // Create event recorders
  const recorders: Partial<Record<ShaderAppEventType, EventRecorder>> = {};

  // Set up requested event recorders
  if (options.recordEvents) {
    for (const eventType of options.recordEvents) {
      recorders[eventType] = new EventRecorder(facade, eventType);
    }
  }

  // Return the test facade
  return {
    facade,
    recorders,
    cleanup: () => {
      // Dispose of event recorders
      Object.values(recorders).forEach((recorder) => recorder?.dispose());

      // Dispose of facade
      facade.dispose();
    },
  };
}

/**
 * Wait for an event to be emitted
 * @param facade The facade to wait for events from
 * @param eventType The type of event to wait for
 * @param timeout Maximum time to wait (ms)
 */
export function waitForEvent<K extends ShaderAppEventType>(
  facade: IShaderAppFacade,
  eventType: K,
  timeout = 1000
): Promise<ShaderAppEventMap[K]> {
  return new Promise<ShaderAppEventMap[K]>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out waiting for event: ${eventType}`));
    }, timeout);

    const handler = (data: ShaderAppEventMap[K]) => {
      clearTimeout(timeoutId);
      facade.off(eventType, handler);
      resolve(data);
    };

    facade.on(eventType, handler);
  });
}

/**
 * Apply multiple parameter changes in sequence with delays
 * @param facade The facade to update
 * @param changes Array of parameter changes to apply
 * @param delay Delay between changes (ms)
 */
export async function applyParameterChanges(
  facade: IShaderAppFacade,
  changes: Array<{ paramName: keyof ShaderParams; value: any }>,
  delay = 50
): Promise<void> {
  for (const change of changes) {
    facade.updateParam(change.paramName, change.value);

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
