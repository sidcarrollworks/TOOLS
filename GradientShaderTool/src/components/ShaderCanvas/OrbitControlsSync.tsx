import { useEffect, useRef } from "preact/hooks";
import type { FunctionComponent } from "preact";
import { facadeSignal } from "../../app";
import { getCameraStore } from "../../lib/stores/CameraStore";
import type { IShaderAppFacade } from "../../lib/facade/types";

/**
 * Component to sync orbit controls changes with the CameraStore
 * Acts as a bridge between the Three.js orbit controls and our state management
 */
export const OrbitControlsSync: FunctionComponent = () => {
  const cameraStore = getCameraStore();
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

    // Function to update store from orbit controls
    const handleOrbitControlsChange = () => {
      const facade = facadeSignal.value;
      if (!facade || !facade.isInitialized()) {
        return;
      }

      // Skip if we're updating from UI to prevent loops
      if (cameraStore.get("updatingFromUI")) {
        return;
      }

      try {
        // Get current values from facade parameters
        const cameraPosX = facade.getParam("cameraPosX");
        const cameraPosY = facade.getParam("cameraPosY");
        const cameraPosZ = facade.getParam("cameraPosZ");

        const cameraTargetX = facade.getParam("cameraTargetX");
        const cameraTargetY = facade.getParam("cameraTargetY");
        const cameraTargetZ = facade.getParam("cameraTargetZ");

        // Update camera store without recording in history
        cameraStore.updateFromFacade(
          cameraPosX,
          cameraPosY,
          cameraPosZ,
          cameraTargetX,
          cameraTargetY,
          cameraTargetZ
        );
      } catch (error) {
        console.error("Error syncing orbit controls to store:", error);
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
