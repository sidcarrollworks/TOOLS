import {
  createContext,
  useContext,
  useState,
  type FC,
  useEffect,
  useRef,
} from "preact/compat";

/**
 * Context for sharing FigmaInput state across components
 * Replaces global variables and improves state management
 */
interface FigmaInputContextType {
  // Whether a preset is currently being applied (for transitions)
  isPresetBeingApplied: boolean;
  setPresetApplying: (applying: boolean) => void;

  // Active instance tracking (replaces instanceManager.ts)
  activeInstance: symbol | null;
  setActiveInstance: (instance: symbol | null) => void;
}

// Create context with default values
const FigmaInputContext = createContext<FigmaInputContextType>({
  isPresetBeingApplied: false,
  setPresetApplying: () => {},
  activeInstance: null,
  setActiveInstance: () => {},
});

// Props for the provider component
interface FigmaInputProviderProps {
  children: preact.ComponentChildren;
}

/**
 * Provider component for FigmaInput context
 * Wrap your application with this to access FigmaInput context
 */
export const FigmaInputProvider: FC<FigmaInputProviderProps> = ({
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
      "figma-input-preset-apply",
      handlePresetApplyEvent
    );

    return () => {
      container.removeEventListener(
        "figma-input-preset-apply",
        handlePresetApplyEvent
      );
    };
  }, []);

  return (
    <FigmaInputContext.Provider
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
    </FigmaInputContext.Provider>
  );
};

/**
 * Hook to access the FigmaInput context
 * Use this in components that need to access or update FigmaInput state
 */
export const useFigmaInputContext = () => useContext(FigmaInputContext);
