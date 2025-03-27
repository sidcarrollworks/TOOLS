import {
  createContext,
  useContext,
  useState,
  type FC,
  useEffect,
  useRef,
} from "preact/compat";

/**
 * Context for sharing ScrubInput state across components
 * Replaces global variables and improves state management
 */
interface ScrubInputContextType {
  // Whether a preset is currently being applied (for transitions)
  isPresetBeingApplied: boolean;
  setPresetApplying: (applying: boolean) => void;

  // Active instance tracking (replaces instanceManager.ts)
  activeInstance: symbol | null;
  setActiveInstance: (instance: symbol | null) => void;
}

// Create context with default values
const ScrubInputContext = createContext<ScrubInputContextType>({
  isPresetBeingApplied: false,
  setPresetApplying: () => {},
  activeInstance: null,
  setActiveInstance: () => {},
});

// Props for the provider component
interface ScrubInputProviderProps {
  children: preact.ComponentChildren;
}

/**
 * Provider component for ScrubInput context
 * Wrap your application with this to access ScrubInput context
 */
export const ScrubInputProvider: FC<ScrubInputProviderProps> = ({
  children,
}) => {
  const [isPresetBeingApplied, setPresetApplying] = useState(false);
  const [activeInstance, setActiveInstance] = useState<symbol | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for preset apply events to allow external components to trigger preset mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePresetApplyEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (
        customEvent.detail &&
        typeof customEvent.detail.applying === "boolean"
      ) {
        setPresetApplying(customEvent.detail.applying);
      }
    };

    container.addEventListener(
      "scrub-input-preset-apply",
      handlePresetApplyEvent
    );

    return () => {
      container.removeEventListener(
        "scrub-input-preset-apply",
        handlePresetApplyEvent
      );
    };
  }, []);

  return (
    <ScrubInputContext.Provider
      value={{
        isPresetBeingApplied,
        setPresetApplying,
        activeInstance,
        setActiveInstance,
      }}
    >
      <div ref={containerRef} style={{ display: "contents" }}>
        {children}
      </div>
    </ScrubInputContext.Provider>
  );
};

/**
 * Hook to access the ScrubInput context
 * Use this in components that need to access or update ScrubInput state
 */
export const useScrubInputContext = () => useContext(ScrubInputContext);
