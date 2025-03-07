import { type ComponentType } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ShaderApp } from "../lib/ShaderApp";

interface HomeProps {
  path?: string;
}

export const Home: ComponentType<HomeProps> = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const shaderAppRef = useRef<ShaderApp | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize the shader app
    if (canvasRef.current && !shaderAppRef.current) {
      const app = new ShaderApp();
      shaderAppRef.current = app;

      // Short delay to simulate loading
      setTimeout(() => {
        app.init(canvasRef.current!);
        setIsLoading(false);
      }, 500);
    }

    // Cleanup function
    return () => {
      if (shaderAppRef.current) {
        shaderAppRef.current.dispose();
        shaderAppRef.current = null;
      }
    };
  }, []);

  return (
    <div class="home-container">
      <div ref={canvasRef} class="canvas-container">
        {isLoading ? (
          <div class="loading">Loading shader...</div>
        ) : (
          <div class="canvas-placeholder">Shader will be initialized here</div>
        )}
      </div>
    </div>
  );
};
