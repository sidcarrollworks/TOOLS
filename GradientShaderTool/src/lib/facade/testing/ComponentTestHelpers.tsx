/**
 * Component test helpers for UI testing with the mock facade
 */

import { h } from "preact";
import type { ComponentChildren, FunctionComponent, JSX } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import type { IShaderAppFacade } from "../types";
import type { ShaderParams } from "../../ShaderApp";
import { FacadeProvider } from "../FacadeContext";
import { MockShaderAppFacade } from "../__mocks__/MockShaderAppFacade";
import { createTestFacade } from "./FacadeTestUtils";

/**
 * Props for the TestFacadeProvider component
 */
interface TestFacadeProviderProps {
  /**
   * Initial parameter values
   */
  initialParams?: Partial<ShaderParams>;

  /**
   * Events to record
   */
  recordEvents?: string[];

  /**
   * Whether to auto-initialize the facade
   */
  autoInitialize?: boolean;

  /**
   * Callback when facade is created
   */
  onFacadeCreated?: (facade: IShaderAppFacade) => void;

  /**
   * Children to render
   */
  children: JSX.Element | JSX.Element[];
}

/**
 * Test facade provider component for UI testing
 * Provides a mock facade to children via context
 */
export const TestFacadeProvider: FunctionComponent<TestFacadeProviderProps> = ({
  initialParams,
  recordEvents,
  autoInitialize = true,
  onFacadeCreated,
  children,
}) => {
  // Create a container ref for the facade
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a state for the facade
  const [facade, setFacade] = useState<MockShaderAppFacade | null>(null);

  // Create the mock facade
  useEffect(() => {
    const mockFacade = new MockShaderAppFacade(initialParams);
    setFacade(mockFacade);

    if (onFacadeCreated) {
      onFacadeCreated(mockFacade);
    }

    return () => {
      mockFacade.dispose();
    };
  }, []);

  // Render the facade provider with the mock facade
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ display: "none" }} />
      {facade && (
        <FacadeProvider containerRef={containerRef} config={{}}>
          {children}
        </FacadeProvider>
      )}
    </div>
  );
};

/**
 * Props for the ParameterDebugPanel component
 */
interface ParameterDebugPanelProps {
  /**
   * Parameters to display
   */
  paramNames: (keyof ShaderParams)[];

  /**
   * Whether to allow editing parameters
   */
  editable?: boolean;

  /**
   * Style for the panel
   */
  style?: JSX.CSSProperties;
}

/**
 * Simple debug panel that shows parameter values
 * Useful for testing and debugging parameter updates
 */
export const ParameterDebugPanel: FunctionComponent<
  ParameterDebugPanelProps
> = ({ paramNames, editable = false, style = {} }) => {
  // Import hooks lazily to avoid circular dependencies
  const { useFacade } = require("../FacadeContext");
  const { useParameterGroup } = require("../../hooks/useParameter");

  // Get the facade
  const facade = useFacade();

  // Get the parameter values
  const { values, setValue } = useParameterGroup(paramNames);

  // Default panel style
  const defaultStyle: JSX.CSSProperties = {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: 9999,
    maxHeight: "80vh",
    overflowY: "auto",
    ...style,
  };

  // Handle parameter change
  const handleParameterChange = (paramName: keyof ShaderParams, value: any) => {
    if (editable) {
      setValue(paramName, value);
    }
  };

  // Render the debug panel
  return (
    <div style={defaultStyle}>
      <h3 style={{ margin: "0 0 10px 0" }}>Parameter Debug</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "2px 5px" }}>Parameter</th>
            <th style={{ textAlign: "left", padding: "2px 5px" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {paramNames.map((paramName) => (
            <tr key={paramName as string}>
              <td style={{ padding: "2px 5px" }}>{paramName as string}</td>
              <td style={{ padding: "2px 5px" }}>
                {editable ? (
                  <input
                    type={
                      typeof values[paramName] === "number" ? "number" : "text"
                    }
                    value={values[paramName]?.toString() || ""}
                    onChange={(e) => {
                      const input = e.currentTarget;
                      const value =
                        input.type === "number"
                          ? parseFloat(input.value)
                          : input.value;
                      handleParameterChange(paramName, value);
                    }}
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                ) : (
                  <code>{JSON.stringify(values[paramName])}</code>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Props for the EventDebugPanel component
 */
interface EventDebugPanelProps {
  /**
   * Events to display
   */
  eventTypes: string[];

  /**
   * Maximum number of events to display
   */
  maxEvents?: number;

  /**
   * Style for the panel
   */
  style?: JSX.CSSProperties;
}

/**
 * Simple debug panel that shows facade events
 * Useful for testing and debugging event emissions
 */
export const EventDebugPanel: FunctionComponent<EventDebugPanelProps> = ({
  eventTypes,
  maxEvents = 10,
  style = {},
}) => {
  // Import hooks lazily to avoid circular dependencies
  const { useFacade } = require("../FacadeContext");

  // Get the facade
  const facade = useFacade();

  // State for recorded events
  const [events, setEvents] = useState<
    Array<{ type: string; data: any; time: number }>
  >([]);

  // Set up event listeners
  useEffect(() => {
    const handlers: Record<string, (data: any) => void> = {};

    // Create handlers for each event type
    eventTypes.forEach((eventType) => {
      const handler = (data: any) => {
        setEvents((prev) => {
          const newEvents = [
            ...prev,
            { type: eventType, data, time: Date.now() },
          ];

          // Limit the number of events
          if (newEvents.length > maxEvents) {
            return newEvents.slice(-maxEvents);
          }

          return newEvents;
        });
      };

      handlers[eventType] = handler;
      facade.on(eventType as any, handler);
    });

    // Clean up event listeners
    return () => {
      eventTypes.forEach((eventType) => {
        if (handlers[eventType]) {
          facade.off(eventType as any, handlers[eventType]);
        }
      });
    };
  }, [eventTypes, maxEvents]);

  // Default panel style
  const defaultStyle: JSX.CSSProperties = {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    background: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: 9999,
    maxHeight: "50vh",
    maxWidth: "50vw",
    overflowY: "auto",
    ...style,
  };

  // Format time
  const formatTime = (time: number) => {
    const date = new Date(time);
    return (
      date.toLocaleTimeString() +
      "." +
      date.getMilliseconds().toString().padStart(3, "0")
    );
  };

  // Render the debug panel
  return (
    <div style={defaultStyle}>
      <h3 style={{ margin: "0 0 10px 0" }}>Event Debug</h3>
      <div>
        <button onClick={() => setEvents([])}>Clear Events</button>
      </div>
      <div style={{ marginTop: "10px" }}>
        {events.length === 0 ? (
          <div>No events recorded</div>
        ) : (
          events.map((event, index) => (
            <div
              key={index}
              style={{
                marginBottom: "5px",
                borderLeft: "3px solid #666",
                paddingLeft: "5px",
              }}
            >
              <div style={{ color: "#aaa", fontSize: "10px" }}>
                {formatTime(event.time)} - {event.type}
              </div>
              <pre
                style={{ margin: "2px 0", maxWidth: "100%", overflow: "auto" }}
              >
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
