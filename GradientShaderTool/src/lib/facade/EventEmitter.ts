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
   * Track pending async responses for debugging
   * @private
   */
  private pendingAsyncResponses: Map<
    string,
    {
      event: string;
      timestamp: number;
      callbackInfo: string;
    }
  > = new Map();

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

    // Debug log subscriber count
    if (typeof window !== "undefined" && (window as any).__SHADER_DEBUG__) {
      console.log(
        `EventEmitter: Added listener for "${event}", total: ${this.eventCallbacks[event]?.length}`
      );
    }
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

    // Filter out the specified callback
    this.eventCallbacks[event] = this.eventCallbacks[event]?.filter(
      (cb) => cb !== callback
    ) as any; // Type assertion needed to satisfy TypeScript

    // Debug log subscriber count
    if (typeof window !== "undefined" && (window as any).__SHADER_DEBUG__) {
      console.log(
        `EventEmitter: Removed listener for "${event}", remaining: ${this.eventCallbacks[event]?.length}`
      );
    }
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
    this.eventCallbacks[event]?.forEach((callback, index) => {
      try {
        const callbackId = `${event}_${index}_${Date.now()}`;
        const callbackInfo = callback.name || `Anonymous_${index}`;

        // Track potential promise-returning callbacks
        const result: unknown = callback(data);

        // Check if result is boolean true (indicating async response)
        if (result === true) {
          // Callback indicated async response by returning true
          // This is dangerous and could cause the "message channel closed" error
          console.warn(
            `EventEmitter: Listener for "${event}" returned true, indicating async response. This pattern is error-prone.`,
            {
              callbackInfo,
              event,
              data,
            }
          );

          // Track this pending async response for diagnostics
          this.pendingAsyncResponses.set(callbackId, {
            event: String(event),
            timestamp: Date.now(),
            callbackInfo,
          });

          // Clean up after a timeout (30 seconds)
          setTimeout(() => {
            if (this.pendingAsyncResponses.has(callbackId)) {
              console.warn(
                `EventEmitter: Async response for "${event}" never completed after 30s`,
                {
                  callbackInfo,
                  pendingTime:
                    Date.now() -
                    this.pendingAsyncResponses.get(callbackId)!.timestamp,
                }
              );
              this.pendingAsyncResponses.delete(callbackId);
            }
          }, 30000);
        }

        // Handle promises returned from callbacks
        // We need to check if result is a Promise-like object
        if (
          result &&
          typeof result === "object" &&
          "then" in result &&
          typeof result.then === "function"
        ) {
          console.warn(
            `EventEmitter: Listener for "${event}" returned a Promise. This may cause issues with message channels.`,
            {
              callbackInfo,
              event,
            }
          );

          // Track and handle the promise
          const promiseId = `${event}_promise_${index}_${Date.now()}`;
          this.pendingAsyncResponses.set(promiseId, {
            event: String(event),
            timestamp: Date.now(),
            callbackInfo,
          });

          // TypeScript doesn't know this is a Promise, so we need to cast
          const promise = result as Promise<unknown>;
          promise
            .then(() => {
              this.pendingAsyncResponses.delete(promiseId);
            })
            .catch((error: Error) => {
              console.error(
                `EventEmitter: Promise from listener for "${event}" rejected:`,
                error
              );
              this.pendingAsyncResponses.delete(promiseId);
            });
        }
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
    if (typeof window !== "undefined" && (window as any).__SHADER_DEBUG__) {
      if (event) {
        console.log(`EventEmitter: Clearing all listeners for "${event}"`);
      } else {
        console.log(`EventEmitter: Clearing ALL listeners for ALL events`);
      }
    }

    if (event) {
      // Clear listeners for a specific event
      this.eventCallbacks[event] = [];
    } else {
      // Clear all event listeners
      this.eventCallbacks = {};
    }

    // Log any pending async responses that might now be orphaned
    if (this.pendingAsyncResponses.size > 0) {
      console.warn(
        `EventEmitter: Clearing listeners while ${this.pendingAsyncResponses.size} async responses are pending:`,
        Array.from(this.pendingAsyncResponses.values())
      );

      // Clean up pending responses to avoid memory leaks
      this.pendingAsyncResponses.clear();
    }
  }

  /**
   * Get diagnostic information about event listeners
   */
  public getDiagnostics(): Record<string, any> {
    const listenerCounts: Record<string, number> = {};
    let totalListeners = 0;

    // Count listeners per event type
    for (const [event, callbacks] of Object.entries(this.eventCallbacks)) {
      if (callbacks) {
        listenerCounts[event] = callbacks.length;
        totalListeners += callbacks.length;
      }
    }

    return {
      totalListeners,
      listenerCounts,
      pendingAsyncResponses: this.pendingAsyncResponses.size,
      pendingDetails: Array.from(this.pendingAsyncResponses.values()),
    };
  }
}
