import { h } from "preact";
import type { FunctionComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import styles from "./DevPanel.module.css";
import type { ShaderParams } from "../../lib/ShaderApp";
import type { ShaderAppEventType } from "../../lib/facade/types";
import {
  ParameterDebugPanel,
  EventDebugPanel,
  TestFacadeProvider,
} from "../../lib/facade/testing/ComponentTestHelpers";
import { MockShaderAppFacade } from "../../lib/facade/testing";
import type { IShaderAppFacade } from "../../lib/facade/types";

interface FacadeTestPanelProps {
  visible: boolean;
}

/**
 * Wrapper component that provides a test panel using a mock facade
 * This completely avoids using the FacadeContext so it won't throw errors
 */
export const FacadeTestPanel: FunctionComponent<FacadeTestPanelProps> = ({
  visible,
}) => {
  // Create a local state for the mock facade
  const [mockFacade, setMockFacade] = useState<MockShaderAppFacade | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Create the mock facade on mount
  useEffect(() => {
    // Create a new mock facade with some initial parameters for testing
    const facade = new MockShaderAppFacade({
      color1: "#ff0000",
      color2: "#0000ff",
      geometryType: "sphere",
    });

    setMockFacade(facade);

    // Clean up when unmounting
    return () => {
      facade.dispose();
    };
  }, []);

  if (!visible || !mockFacade) return null;

  return (
    <div className={styles.facadeTestPanel}>
      <div className={styles.facadeTestPanelHeader}>
        <h2>
          Facade Test Panel <span className={styles.mockBadge}>(MOCK)</span>
        </h2>
        <div className={styles.facadeTestPanelControls}>
          <button className={styles.active}>Mock Panel</button>
        </div>
      </div>

      <div className={styles.mockNotice}>
        Using mock facade for testing. This is not connected to the actual
        shader.
      </div>

      {/* Main content with mock facade */}
      <MockFacadeTestContent facade={mockFacade} />
    </div>
  );
};

/**
 * Component that uses a directly passed facade instead of using useFacade()
 */
const MockFacadeTestContent: FunctionComponent<{
  facade: IShaderAppFacade;
}> = ({ facade }) => {
  const [activePanels, setActivePanels] = useState<Record<string, boolean>>({
    parameters: true,
    events: true,
    playground: false,
  });
  const [paramCategories, setParamCategories] = useState<
    Record<string, (keyof ShaderParams)[]>
  >({
    geometry: [
      "geometryType",
      "planeWidth",
      "planeHeight",
      "planeSegments",
      "sphereRadius",
      "sphereWidthSegments",
      "sphereHeightSegments",
      "cubeSize",
      "cubeWidthSegments",
      "cubeHeightSegments",
      "cubeDepthSegments",
    ],
    rotation: ["rotationX", "rotationY", "rotationZ"],
    camera: [
      "cameraDistance",
      "cameraFov",
      "cameraPosX",
      "cameraPosY",
      "cameraPosZ",
      "cameraTargetX",
      "cameraTargetY",
      "cameraTargetZ",
    ],
    colors: [
      "gradientMode",
      "color1",
      "color2",
      "color3",
      "color4",
      "backgroundColor",
    ],
    lighting: [
      "lightDirX",
      "lightDirY",
      "lightDirZ",
      "diffuseIntensity",
      "ambientIntensity",
      "rimLightIntensity",
    ],
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("geometry");
  const [monitoredEvents, setMonitoredEvents] = useState<ShaderAppEventType[]>([
    "parameter-changed",
    "geometry-changed",
    "render-complete",
    "error",
  ]);
  const [customEventToMonitor, setCustomEventToMonitor] = useState<string>("");

  // Playground state
  const [customEventType, setCustomEventType] = useState<string>("");
  const [customEventData, setCustomEventData] = useState<string>("{}");
  const [customParamName, setCustomParamName] = useState<string>("");
  const [customParamValue, setCustomParamValue] = useState<string>("");
  const [testOutput, setTestOutput] = useState<string>("");
  const [testError, setTestError] = useState<string>("");

  // Toggle panels
  const togglePanel = (panelName: string) => {
    setActivePanels((prev) => ({
      ...prev,
      [panelName]: !prev[panelName],
    }));
  };

  // Add event to monitor
  const addEventToMonitor = () => {
    if (
      customEventToMonitor &&
      !monitoredEvents.includes(customEventToMonitor as any)
    ) {
      setMonitoredEvents((prev) => [
        ...prev,
        customEventToMonitor as ShaderAppEventType,
      ]);
      setCustomEventToMonitor("");
    }
  };

  // Remove event from monitoring
  const removeEvent = (eventType: ShaderAppEventType) => {
    setMonitoredEvents((prev) => prev.filter((e) => e !== eventType));
  };

  // Emit a custom event for testing
  const emitCustomEvent = () => {
    try {
      setTestError("");

      // Parse the event data
      const eventData =
        customEventData === "{}" || customEventData.trim() === ""
          ? undefined
          : JSON.parse(customEventData);

      // Emit the custom event
      facade.emit(customEventType as any, eventData);
      setTestOutput(`Event "${customEventType}" emitted successfully`);
    } catch (error) {
      setTestError(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Set a custom parameter value
  const setCustomParam = () => {
    try {
      setTestError("");

      // Parse the parameter value
      let parsedValue: any = customParamValue;

      // Try to convert to number if it looks like a number
      if (!isNaN(Number(customParamValue))) {
        parsedValue = Number(customParamValue);
      }
      // Try to parse as JSON if it starts with { or [
      else if (
        (customParamValue.startsWith("{") && customParamValue.endsWith("}")) ||
        (customParamValue.startsWith("[") && customParamValue.endsWith("]"))
      ) {
        try {
          parsedValue = JSON.parse(customParamValue);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }

      // Set the parameter using standard methods that should be available
      const result =
        "setParam" in facade
          ? (facade as any).setParam(customParamName, parsedValue)
          : "updateParam" in facade
          ? (facade as any).updateParam(customParamName, parsedValue)
          : false;

      setTestOutput(
        `Parameter "${customParamName}" ${result ? "updated" : "update failed"}`
      );
    } catch (error) {
      setTestError(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Record a short parameter sequence
  const recordSequence = () => {
    // Implementation for recording a parameter change sequence
    // This would allow developers to create and test parameter animations
    setTestOutput("Sequence recording started...");
    setTimeout(() => {
      setTestOutput("Sequence recording completed (demo)");
    }, 3000);
  };

  // Add a useful quick action button
  const quickActions = [
    {
      name: "Reset Camera",
      action: () => {
        try {
          if ("resetCamera" in facade) {
            (facade as any).resetCamera();
          }
        } catch (e) {
          console.error("Failed to reset camera:", e);
        }
      },
    },
    {
      name: "Toggle Animation",
      action: () => {
        try {
          if ("isAnimating" in facade) {
            if ((facade as any).isAnimating()) {
              (facade as any).stopAnimation();
            } else {
              (facade as any).startAnimation();
            }
          } else if ("startAnimation" in facade) {
            (facade as any).startAnimation();
          }
        } catch (e) {
          console.error("Failed to toggle animation:", e);
        }
      },
    },
    {
      name: "Render Frame",
      action: () => {
        try {
          if ("renderFrame" in facade) {
            (facade as any).renderFrame();
          }
        } catch (e) {
          console.error("Failed to render frame:", e);
        }
      },
    },
    {
      name: "Switch to Sphere",
      action: () => {
        try {
          if ("setGeometryType" in facade) {
            (facade as any).setGeometryType("sphere");
          } else if ("setParam" in facade) {
            (facade as any).setParam("geometryType", "sphere");
          } else if ("updateParam" in facade) {
            (facade as any).updateParam("geometryType", "sphere");
          }
        } catch (e) {
          console.error("Failed to switch geometry:", e);
        }
      },
    },
    {
      name: "Switch to Cube",
      action: () => {
        try {
          if ("setGeometryType" in facade) {
            (facade as any).setGeometryType("cube");
          } else if ("setParam" in facade) {
            (facade as any).setParam("geometryType", "cube");
          } else if ("updateParam" in facade) {
            (facade as any).updateParam("geometryType", "cube");
          }
        } catch (e) {
          console.error("Failed to switch geometry:", e);
        }
      },
    },
    {
      name: "Switch to Plane",
      action: () => {
        try {
          if ("setGeometryType" in facade) {
            (facade as any).setGeometryType("plane");
          } else if ("setParam" in facade) {
            (facade as any).setParam("geometryType", "plane");
          } else if ("updateParam" in facade) {
            (facade as any).updateParam("geometryType", "plane");
          }
        } catch (e) {
          console.error("Failed to switch geometry:", e);
        }
      },
    },
  ];

  return (
    <>
      {/* Quick Actions */}
      <div className={styles.quickActions}>
        {quickActions.map((action, index) => (
          <button key={index} onClick={action.action}>
            {action.name}
          </button>
        ))}
      </div>

      {activePanels.parameters && (
        <div className={styles.paramsPanel}>
          <div className={styles.categorySelector}>
            <label>Parameter Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
            >
              {Object.keys(paramCategories).map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Use TestFacadeProvider directly to wrap the debug panel */}
          <div
            style={{
              position: "relative",
              maxHeight: "300px",
              width: "100%",
              overflow: "auto",
              margin: "10px 0",
              padding: "10px",
              boxSizing: "border-box",
              background: "rgba(30, 30, 30, 0.9)",
            }}
          >
            <MockParameterPanel
              facade={facade}
              parameters={paramCategories[selectedCategory]}
            />
          </div>
        </div>
      )}

      {activePanels.events && (
        <div className={styles.eventsPanel}>
          <div className={styles.eventControls}>
            <div className={styles.eventInput}>
              <input
                type="text"
                value={customEventToMonitor}
                onChange={(e) => setCustomEventToMonitor(e.currentTarget.value)}
                placeholder="Add event type to monitor..."
              />
              <button onClick={addEventToMonitor}>Add</button>
            </div>

            <div className={styles.eventTags}>
              {monitoredEvents.map((eventType) => (
                <span key={eventType} className={styles.eventTag}>
                  {eventType}
                  <button onClick={() => removeEvent(eventType)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              maxHeight: "300px",
              width: "100%",
              overflow: "auto",
              margin: "10px 0",
              padding: "10px",
              boxSizing: "border-box",
              background: "rgba(30, 30, 30, 0.9)",
            }}
          >
            <MockEventPanel
              facade={facade}
              eventTypes={monitoredEvents as string[]}
            />
          </div>
        </div>
      )}

      {activePanels.playground && (
        <div className={styles.playgroundPanel}>
          <h3>Test Playground</h3>

          {/* Custom Event Emitter */}
          <div className={styles.playgroundSection}>
            <h4>Emit Custom Event</h4>
            <div className={styles.playgroundForm}>
              <div className={styles.formGroup}>
                <label>Event Type:</label>
                <input
                  type="text"
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.currentTarget.value)}
                  placeholder="e.g., parameter-changed"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Event Data (JSON):</label>
                <textarea
                  value={customEventData}
                  onChange={(e) => setCustomEventData(e.currentTarget.value)}
                  placeholder="{}"
                  rows={3}
                />
              </div>
              <button onClick={emitCustomEvent}>Emit Event</button>
            </div>
          </div>

          {/* Custom Parameter Setter */}
          <div className={styles.playgroundSection}>
            <h4>Set Custom Parameter</h4>
            <div className={styles.playgroundForm}>
              <div className={styles.formGroup}>
                <label>Parameter Name:</label>
                <input
                  type="text"
                  value={customParamName}
                  onChange={(e) => setCustomParamName(e.currentTarget.value)}
                  placeholder="e.g., color1"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Parameter Value:</label>
                <input
                  type="text"
                  value={customParamValue}
                  onChange={(e) => setCustomParamValue(e.currentTarget.value)}
                  placeholder="e.g., #ff0000 or 5.0"
                />
              </div>
              <button onClick={setCustomParam}>Set Parameter</button>
            </div>
          </div>

          {/* Sequence Recorder (placeholder) */}
          <div className={styles.playgroundSection}>
            <h4>Parameter Sequence</h4>
            <div className={styles.playgroundForm}>
              <p>
                Record a sequence of parameter changes for testing animations
                and transitions.
              </p>
              <button onClick={recordSequence}>Start Recording</button>
            </div>
          </div>

          {/* Output and Errors */}
          <div className={styles.playgroundOutput}>
            {testOutput && (
              <div className={styles.outputSuccess}>{testOutput}</div>
            )}
            {testError && <div className={styles.outputError}>{testError}</div>}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * A simplified version of the ParameterDebugPanel that doesn't use hooks
 */
const MockParameterPanel: FunctionComponent<{
  facade: IShaderAppFacade;
  parameters: (keyof ShaderParams)[];
}> = ({ facade, parameters }) => {
  const [values, setValues] = useState<Record<string, any>>({});

  // Fetch initial values
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    parameters.forEach((param) => {
      if ("getParam" in facade) {
        initialValues[param as string] = (facade as any).getParam(param);
      }
    });
    setValues(initialValues);
  }, [facade, parameters]);

  // Handle parameter change
  const handleChange = (param: keyof ShaderParams, value: any) => {
    try {
      // Update the facade
      if ("setParam" in facade) {
        (facade as any).setParam(param, value);
      } else if ("updateParam" in facade) {
        (facade as any).updateParam(param, value);
      }

      // Update local state
      setValues((prev) => ({
        ...prev,
        [param as string]: value,
      }));
    } catch (e) {
      console.error(`Failed to update parameter ${String(param)}:`, e);
    }
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 10px 0" }}>Parameter Debug</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "2px 5px" }}>Parameter</th>
            <th style={{ textAlign: "left", padding: "2px 5px" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param) => {
            const paramName = param as string;
            const value = values[paramName];
            const isColor = paramName.toLowerCase().includes("color");
            const isNumber = typeof value === "number";

            return (
              <tr key={paramName}>
                <td style={{ padding: "2px 5px" }}>{paramName}</td>
                <td style={{ padding: "2px 5px" }}>
                  {isColor ? (
                    <input
                      type="color"
                      value={value || "#000000"}
                      onChange={(e) =>
                        handleChange(param, e.currentTarget.value)
                      }
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  ) : isNumber ? (
                    <input
                      type="number"
                      value={value || 0}
                      onChange={(e) =>
                        handleChange(param, parseFloat(e.currentTarget.value))
                      }
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value || ""}
                      onChange={(e) =>
                        handleChange(param, e.currentTarget.value)
                      }
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/**
 * A simplified version of the EventDebugPanel that doesn't use hooks
 */
const MockEventPanel: FunctionComponent<{
  facade: IShaderAppFacade;
  eventTypes: string[];
}> = ({ facade, eventTypes }) => {
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
          if (newEvents.length > 15) {
            return newEvents.slice(-15);
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
  }, [facade, eventTypes.join(",")]);

  // Format time
  const formatTime = (time: number) => {
    const date = new Date(time);
    return (
      date.toLocaleTimeString() +
      "." +
      date.getMilliseconds().toString().padStart(3, "0")
    );
  };

  return (
    <div>
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
