/**
 * EventEmitter implementation for the ShaderAppFacade
 * Provides a robust and type-safe event system for the facade
 */

import type {
  ShaderAppEventType,
  ShaderAppEventMap,
  EventCallback,
  IEventEmitter,
} from "./types";

/**
 * Implementation of the IEventEmitter interface
 * Provides methods for subscribing to and emitting events
 */
export class EventEmitter implements IEventEmitter {
  /**
   * Map of event types to arrays of callbacks
   * @private
   */
  private eventCallbacks: {
    [K in ShaderAppEventType]?: Array<EventCallback<ShaderAppEventMap[K]>>;
  } = {};

  /**
   * Subscribe to an event
   * @param event The event type to subscribe to
   * @param callback The callback to invoke when the event is emitted
   */
  public on<K extends ShaderAppEventType>(
    event: K,
    callback: EventCallback<ShaderAppEventMap[K]>
  ): void {
    // Create an array for this event type if it doesn't exist
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }

    // Add the callback to the array
    this.eventCallbacks[event]?.push(callback as any);
  }

  /**
   * Unsubscribe from an event
   * @param event The event type to unsubscribe from
   * @param callback The callback to remove
   */
  public off<K extends ShaderAppEventType>(
    event: K,
    callback: EventCallback<ShaderAppEventMap[K]>
  ): void {
    // If no callbacks exist for this event, do nothing
    if (!this.eventCallbacks[event]) {
      return;
    }

    // Filter out the callback from the array
    this.eventCallbacks[event] = this.eventCallbacks[event]?.filter(
      (cb) => cb !== callback
    ) as any;
  }

  /**
   * Emit an event with data
   * @param event The event type to emit
   * @param data The data to pass to callbacks
   */
  public emit<K extends ShaderAppEventType>(
    event: K,
    data: ShaderAppEventMap[K]
  ): void {
    // If no callbacks exist for this event, do nothing
    if (!this.eventCallbacks[event]) {
      return;
    }

    // Invoke all callbacks with the data
    this.eventCallbacks[event]?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        // Handle errors from callbacks (prevent one error from breaking others)
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  /**
   * Check if an event has any subscribers
   * @param event The event type to check
   * @returns Whether the event has any subscribers
   */
  public hasListeners<K extends ShaderAppEventType>(event: K): boolean {
    return !!this.eventCallbacks[event]?.length;
  }

  /**
   * Remove all event listeners for a specific event type
   * @param event The event type to clear listeners for (optional, clears all if not provided)
   */
  public clearListeners(event?: ShaderAppEventType): void {
    if (event) {
      // Clear listeners for a specific event
      this.eventCallbacks[event] = [];
    } else {
      // Clear all event listeners
      this.eventCallbacks = {};
    }
  }
}
