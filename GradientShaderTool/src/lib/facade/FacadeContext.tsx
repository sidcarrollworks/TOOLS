/**
 * FacadeContext - React/Preact context for providing and consuming the ShaderAppFacade
 */

import { createContext, Component } from "preact";
import { useContext, useRef, useEffect, useState } from "preact/hooks";
import type { FunctionComponent, JSX } from "preact";
import { ShaderAppFacade } from "./ShaderAppFacade";
import type { IShaderAppFacade } from "./types";
import type { FacadeConfig } from "./FacadeConfig";

// Create a context for the facade
const FacadeContext = createContext<IShaderAppFacade | null>(null);

/**
 * Props for the FacadeProvider component
 */
interface FacadeProviderProps {
  /** Container ref for rendering the shader */
  containerRef: { current: HTMLElement | null };

  /** Custom configuration for the facade */
  config?: Partial<FacadeConfig>;

  /** Children components that will consume the facade */
  children: JSX.Element | JSX.Element[];

  /** Callback when facade is initialized */
  onInitialized?: (facade: IShaderAppFacade) => void;

  /** Callback when facade fails to initialize */
  onError?: (error: Error) => void;
}

/**
 * Provider component for the ShaderAppFacade
 * Initializes the facade and provides it to child components via context
 */
export const FacadeProvider: FunctionComponent<FacadeProviderProps> = ({
  containerRef,
  config,
  children,
  onInitialized,
  onError,
}) => {
  // Create a ref to store the facade instance
  const facadeRef = useRef<IShaderAppFacade | null>(null);

  // Track initialization status
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize the facade when the component mounts or container changes
  useEffect(() => {
    // Skip if no container or already initialized
    if (!containerRef.current || facadeRef.current?.isInitialized()) {
      return;
    }

    const initFacade = async () => {
      try {
        // Create a new facade instance if needed
        if (!facadeRef.current) {
          facadeRef.current = new ShaderAppFacade(undefined, config);
        }

        // Initialize the facade with the container
        await facadeRef.current.initialize(containerRef.current!);

        // Update state and call callback
        setIsInitialized(true);
        setError(null);

        if (onInitialized) {
          onInitialized(facadeRef.current);
        }
      } catch (err) {
        // Handle initialization errors
        const error = err instanceof Error ? err : new Error(String(err));

        setError(error);
        setIsInitialized(false);

        if (onError) {
          onError(error);
        } else {
          console.error("Failed to initialize ShaderAppFacade:", error);
        }
      }
    };

    // Initialize the facade
    initFacade();

    // Clean up when the component unmounts
    return () => {
      if (facadeRef.current) {
        facadeRef.current.dispose();

        // We don't set facadeRef.current to null here
        // because we might want to reuse it if the component remounts
      }
    };
  }, [containerRef.current, config]);

  // Provide the facade to child components
  return (
    <FacadeContext.Provider value={facadeRef.current}>
      {children}
    </FacadeContext.Provider>
  );
};

/**
 * Custom hook for consuming the facade from context
 * @returns The facade instance
 * @throws Error if used outside of a FacadeProvider
 */
export function useFacade(): IShaderAppFacade {
  const facade = useContext(FacadeContext);

  if (!facade) {
    throw new Error("useFacade must be used within a FacadeProvider");
  }

  return facade;
}

/**
 * Error boundary component for handling facade errors
 */
interface FacadeErrorBoundaryProps {
  /** Children components */
  children: JSX.Element | JSX.Element[];

  /** Fallback UI to show when an error occurs */
  fallback: JSX.Element | ((error: Error) => JSX.Element);

  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

interface FacadeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for handling facade errors
 * Catches and displays errors that occur when interacting with the facade
 */
export class FacadeErrorBoundary extends Component<
  FacadeErrorBoundaryProps,
  FacadeErrorBoundaryState
> {
  constructor(props: FacadeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render the fallback UI
      return typeof this.props.fallback === "function"
        ? this.props.fallback(this.state.error!)
        : this.props.fallback;
    }

    return this.props.children;
  }
}
