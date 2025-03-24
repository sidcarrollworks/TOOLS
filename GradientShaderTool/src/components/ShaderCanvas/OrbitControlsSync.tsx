import { useEffect, useRef } from "preact/hooks";
import type { FunctionComponent } from "preact";
import { facadeSignal } from "../../app";
import { getCameraInitializer } from "../../lib/stores/CameraInitializer";
import type { IShaderAppFacade } from "../../lib/facade/types";

/**
 * Component to sync orbit controls changes with camera parameters
 * Acts as a bridge between the Three.js orbit controls and our state management
 * This is primarily needed for export functionality to properly capture camera state
 */
export const OrbitControlsSync: FunctionComponent = () => {
  const cameraInitializer = getCameraInitializer();
  // Keep track of the interval
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("OrbitControlsSync: Setting up effect");

    // Clean up any existing interval
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up the polling if we have an initialized facade
    if (!facadeSignal.value || !facadeSignal.value.isInitialized()) {
      console.log("OrbitControlsSync: Facade not ready yet");
      return;
    }

    console.log("OrbitControlsSync: Facade is ready, setting up polling");

    // Function to update initializer from orbit controls
    const handleOrbitControlsChange = () => {
      const facade = facadeSignal.value;
      if (!facade || !facade.isInitialized()) {
        return;
      }

      try {
        // Get current values from facade parameters
        const posX = facade.getParam("cameraPosX");
        const posY = facade.getParam("cameraPosY");
        const posZ = facade.getParam("cameraPosZ");

        const targetX = facade.getParam("cameraTargetX");
        const targetY = facade.getParam("cameraTargetY");
        const targetZ = facade.getParam("cameraTargetZ");

        // Get current FOV value
        let fov;
        try {
          // Try to get the FOV directly using the correct parameter name
          fov = facade.getParam("cameraFov");
        } catch (e) {
          // If that fails, use the default value
          fov = 75;
        }

        // Update camera initializer directly
        cameraInitializer.updateFromFacade(
          posX,
          posY,
          posZ,
          targetX,
          targetY,
          targetZ,
          fov
        );
      } catch (error) {
        console.error("Error syncing orbit controls:", error);
      }
    };

    // Set up polling interval to check for camera changes
    intervalRef.current = window.setInterval(handleOrbitControlsChange, 200);

    // Run it once immediately
    handleOrbitControlsChange();

    return () => {
      console.log("OrbitControlsSync: Cleaning up polling interval");
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [facadeSignal.value]); // Re-run effect when facadeSignal changes

  // This is a utility component that doesn't render anything
  return null;
};
