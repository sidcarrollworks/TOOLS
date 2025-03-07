/**
 * SceneManager - Handles Three.js scene setup and management
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ShaderApp } from "../ShaderApp";

export class SceneManager {
  private app: ShaderApp;

  /**
   * Create a SceneManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
  }

  /**
   * Set up Three.js scene
   */
  setupScene(parentElement: HTMLElement): void {
    // Create scene
    this.app.scene = new THREE.Scene();

    // Find the shader-canvas element
    const shaderCanvasElement = document.getElementById("shader-canvas");
    const targetElement = shaderCanvasElement || parentElement;

    // Create camera
    this.app.camera = new THREE.PerspectiveCamera(
      this.app.params.cameraFov,
      parentElement.clientWidth / parentElement.clientHeight,
      0.1,
      1000
    );
    this.app.camera.position.z = this.app.params.cameraDistance;

    // Create renderer
    this.app.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    this.app.renderer.setSize(
      parentElement.clientWidth,
      parentElement.clientHeight
    );

    // Set clear color based on transparent background setting
    if (this.app.params.exportTransparentBg) {
      // Set transparent background (alpha = 0)
      this.app.renderer.setClearColor(0x000000, 0);

      // Apply checkered background to the canvas element
      const canvas = this.app.renderer.domElement;
      canvas.style.backgroundColor = "#191919";
      canvas.style.backgroundImage = `
        linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
        linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
        linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
      `;
      canvas.style.backgroundSize = "20px 20px";
      canvas.style.backgroundPosition = "0 0, 0 10px, 10px -10px, -10px 0px";
    } else {
      // Set solid background color
      this.app.renderer.setClearColor(
        new THREE.Color(this.app.params.backgroundColor)
      );

      // Remove checkered background
      const canvas = this.app.renderer.domElement;
      canvas.style.backgroundColor = "";
      canvas.style.backgroundImage = "";
      canvas.style.backgroundSize = "";
      canvas.style.backgroundPosition = "";
    }
    targetElement.appendChild(this.app.renderer.domElement);

    // Setup OrbitControls
    this.setupOrbitControls();

    // Create material
    this.app.material = new THREE.ShaderMaterial({
      vertexShader: this.app.shaders.vertex,
      fragmentShader: this.app.shaders.fragment,
      uniforms: this.app.uniforms,
      side: THREE.DoubleSide,
    });

    // Create plane
    this.recreatePlane();

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.app.scene.add(ambientLight);

    // Set up window resize handler
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (!this.app.camera || !this.app.renderer || !this.app.parentElement)
      return;

    // Get the current dimensions of the parent element
    const width = this.app.parentElement.clientWidth;
    const height = this.app.parentElement.clientHeight;

    // Update camera aspect ratio
    this.app.camera.aspect = width / height;
    this.app.camera.updateProjectionMatrix();

    // Update renderer size
    this.app.renderer.setSize(width, height);

    // Force a render to update the view immediately
    if (this.app.scene) {
      this.app.renderer.render(this.app.scene, this.app.camera);
    }
  }

  /**
   * Set up OrbitControls
   */
  setupOrbitControls(): void {
    if (!this.app.camera || !this.app.renderer) return;

    // Create OrbitControls
    this.app.controls = new OrbitControls(
      this.app.camera,
      this.app.renderer.domElement
    );

    // Configure controls
    this.app.controls.enableDamping = true; // Add smooth damping
    this.app.controls.dampingFactor = 0.05;
    this.app.controls.rotateSpeed = 0.5;
    this.app.controls.zoomSpeed = 0.5;
    this.app.controls.panSpeed = 0.5;
    this.app.controls.minDistance = 0.5;
    this.app.controls.maxDistance = 10;
    this.app.controls.maxPolarAngle = Math.PI / 1.5; // Limit vertical rotation

    // Set initial position from params
    this.app.controls.target.set(
      this.app.params.cameraTargetX,
      this.app.params.cameraTargetY,
      this.app.params.cameraTargetZ
    );

    this.app.camera.position.set(
      this.app.params.cameraPosX,
      this.app.params.cameraPosY,
      this.app.params.cameraPosZ
    );

    this.app.controls.update();
  }

  /**
   * Recreate the plane with current parameters
   */
  recreatePlane(): void {
    if (!this.app.scene) return;

    if (this.app.plane) {
      this.app.scene.remove(this.app.plane);
    }

    if (this.app.geometry) {
      this.app.geometry.dispose();
    }

    this.app.geometry = new THREE.PlaneGeometry(
      this.app.params.planeWidth,
      this.app.params.planeHeight,
      this.app.params.planeSegments,
      this.app.params.planeSegments
    );

    if (!this.app.material) return;

    this.app.plane = new THREE.Mesh(this.app.geometry, this.app.material);

    this.app.plane.rotation.x = this.app.params.rotationX;
    this.app.plane.rotation.y = this.app.params.rotationY;
    this.app.plane.rotation.z = this.app.params.rotationZ;

    this.app.scene.add(this.app.plane);
  }

  /**
   * Update shader parameters
   */
  updateParams(updateCamera = false): void {
    if (!this.app.renderer) return;

    // Update noise parameters
    this.app.uniforms.uNoiseScaleX.value = this.app.params.normalNoiseScaleX;
    this.app.uniforms.uNoiseScaleY.value = this.app.params.normalNoiseScaleY;
    this.app.uniforms.uNoiseSpeed.value = this.app.params.normalNoiseSpeed;
    this.app.uniforms.uNoiseStrength.value =
      this.app.params.normalNoiseStrength;
    this.app.uniforms.uNoiseShiftX.value = this.app.params.normalNoiseShiftX;
    this.app.uniforms.uNoiseShiftY.value = this.app.params.normalNoiseShiftY;
    this.app.uniforms.uNoiseShiftSpeed.value =
      this.app.params.normalNoiseShiftSpeed;

    // Update color noise parameters
    this.app.uniforms.uColorNoiseScale.value = this.app.params.colorNoiseScale;
    this.app.uniforms.uColorNoiseSpeed.value = this.app.params.colorNoiseSpeed;

    // Update gradient shift parameters
    this.app.uniforms.uGradientShiftX.value = this.app.params.gradientShiftX;
    this.app.uniforms.uGradientShiftY.value = this.app.params.gradientShiftY;
    this.app.uniforms.uGradientShiftSpeed.value =
      this.app.params.gradientShiftSpeed;

    // Update gradient mode
    this.app.uniforms.uGradientMode.value = this.app.params.gradientMode;

    // Convert each color param (hex) to a Three.js Color => Vector3
    const c1 = new THREE.Color(this.app.params.color1);
    const c2 = new THREE.Color(this.app.params.color2);
    const c3 = new THREE.Color(this.app.params.color3);
    const c4 = new THREE.Color(this.app.params.color4);

    this.app.uniforms.uColors.value[0].set(c1.r, c1.g, c1.b);
    this.app.uniforms.uColors.value[1].set(c2.r, c2.g, c2.b);
    this.app.uniforms.uColors.value[2].set(c3.r, c3.g, c3.b);
    this.app.uniforms.uColors.value[3].set(c4.r, c4.g, c4.b);

    // Update lighting
    this.app.uniforms.uLightDir.value
      .set(
        this.app.params.lightDirX,
        this.app.params.lightDirY,
        this.app.params.lightDirZ
      )
      .normalize();
    this.app.uniforms.uDiffuseIntensity.value =
      this.app.params.diffuseIntensity;
    this.app.uniforms.uAmbientIntensity.value =
      this.app.params.ambientIntensity;
    this.app.uniforms.uRimLightIntensity.value =
      this.app.params.rimLightIntensity;

    // Update wireframe
    this.app.uniforms.uShowWireframe.value = this.app.params.showWireframe;
    this.app.uniforms.uWireframeColor.value.set(this.app.params.wireframeColor);

    // Update plane transform
    if (this.app.plane) {
      this.app.plane.rotation.x = this.app.params.rotationX;
      this.app.plane.rotation.y = this.app.params.rotationY;
      this.app.plane.rotation.z = this.app.params.rotationZ;
    }

    // Update camera parameters only if explicitly requested
    if (updateCamera && this.app.camera && this.app.controls) {
      // Update camera FOV
      if (this.app.camera.fov !== this.app.params.cameraFov) {
        this.app.camera.fov = this.app.params.cameraFov;
        this.app.camera.updateProjectionMatrix();
      }

      // Update camera distance if using OrbitControls
      const currentDistance = this.app.camera.position.distanceTo(
        this.app.controls.target
      );
      if (Math.abs(currentDistance - this.app.params.cameraDistance) > 0.01) {
        // Calculate new position while maintaining direction
        const direction = this.app.camera.position
          .clone()
          .sub(this.app.controls.target)
          .normalize();
        const newPosition = direction
          .multiplyScalar(this.app.params.cameraDistance)
          .add(this.app.controls.target);
        this.app.camera.position.copy(newPosition);
        this.app.controls.update();
      }
    }

    // Always save current camera position and target to params
    if (this.app.camera) {
      this.app.params.cameraPosX = this.app.camera.position.x;
      this.app.params.cameraPosY = this.app.camera.position.y;
      this.app.params.cameraPosZ = this.app.camera.position.z;

      if (this.app.controls) {
        this.app.params.cameraTargetX = this.app.controls.target.x;
        this.app.params.cameraTargetY = this.app.controls.target.y;
        this.app.params.cameraTargetZ = this.app.controls.target.z;
      }
    }

    // Update background
    if (this.app.params.exportTransparentBg) {
      // Set transparent background (alpha = 0)
      this.app.renderer.setClearColor(0x000000, 0);

      // Apply checkered background to the canvas element
      const canvas = this.app.renderer.domElement;
      canvas.style.backgroundColor = "#191919";
      canvas.style.backgroundImage = `
        linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
        linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
        linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
      `;
      canvas.style.backgroundSize = "20px 20px";
      canvas.style.backgroundPosition = "0 0, 0 10px, 10px -10px, -10px 0px";
    } else {
      // Set solid background color
      this.app.renderer.setClearColor(
        new THREE.Color(this.app.params.backgroundColor)
      );

      // Remove checkered background
      const canvas = this.app.renderer.domElement;
      canvas.style.backgroundColor = "";
      canvas.style.backgroundImage = "";
      canvas.style.backgroundSize = "";
      canvas.style.backgroundPosition = "";
    }
  }

  /**
   * Clean up Three.js resources
   */
  dispose(): void {
    // Remove window resize handler
    window.removeEventListener("resize", this.handleResize);

    // Dispose of Three.js objects
    if (this.app.geometry) {
      this.app.geometry.dispose();
      this.app.geometry = null;
    }

    if (this.app.material) {
      this.app.material.dispose();
      this.app.material = null;
    }

    // Dispose of controls
    if (this.app.controls) {
      this.app.controls.dispose();
      this.app.controls = null;
    }

    // Clean up scene
    if (this.app.scene) {
      this.app.scene.clear();
      this.app.scene = null;
    }

    // Remove DOM elements and dispose renderer
    if (this.app.renderer) {
      if (
        this.app.renderer.domElement &&
        this.app.renderer.domElement.parentElement
      ) {
        this.app.renderer.domElement.parentElement.removeChild(
          this.app.renderer.domElement
        );
      }
      this.app.renderer.dispose();
      this.app.renderer = null;
    }

    console.log("SceneManager resources cleaned up");
  }
}
