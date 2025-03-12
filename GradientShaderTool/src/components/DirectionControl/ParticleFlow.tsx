import { useRef, useEffect, useState } from "preact/hooks";
import type { FunctionalComponent } from "preact";
import styles from "./ParticleFlow.module.css";
import type { DirectionSignals } from "./";

interface ParticleFlowProps {
  magnitude: number; // Magnitude of the flow (0 to 1)
  width: number; // Canvas width
  height: number; // Canvas height
  particleCount?: number; // Number of particles
  particleColor?: string; // Base color of particles
  isVisible?: boolean; // Whether the component is visible
  directionX?: number; // Direction X component (-1 to 1)
  directionY?: number; // Direction Y component (-1 to 1)
  isDragging?: boolean; // Whether the user is dragging the control point
  signals?: DirectionSignals; // Signals from DirectionControl
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  speed: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; age: number }>;
  trailLength: number;
}

// Performance optimization constants
const ACTIVE_PARTICLE_COUNT = 25; // Number of particles when actively interacting
const IDLE_PARTICLE_COUNT = 15; // Reduced number when just hovering
const MAX_TRAIL_POINTS = 20; // Maximum number of trail points to store
const TRAIL_POINT_INTERVAL = 2; // Only add a trail point every N frames
const LOW_PERFORMANCE_THRESHOLD = 30; // FPS threshold for low performance mode
const PARTICLE_MOVEMENT_SCALE = 0.05; // Scale factor for particle movement speed
const MAX_TRAIL_AGE = 800; // Maximum age for trail points in milliseconds
const FPS_SAMPLE_SIZE = 10; // Number of frames to average for FPS calculation

export const ParticleFlow: FunctionalComponent<ParticleFlowProps> = ({
  magnitude = 0.5,
  width = 100,
  height = 100,
  particleCount = 25,
  particleColor = "rgba(200, 200, 200, 0.6)",
  isVisible = false,
  directionX = 0,
  directionY = 1, // Default direction is downward
  isDragging = false,
  signals,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const baseSpeedRef = useRef<number>(0.3 + magnitude * 1.7);
  // Use signals if available, otherwise fall back to ref
  const currentMagnitudeRef = useRef<number>(magnitude);
  const fpsRef = useRef<number>(60);
  const lastFpsUpdateRef = useRef<number>(0);
  const framesSinceLastTrailPointRef = useRef<number>(0);
  const isLowPerformanceModeRef = useRef<boolean>(false);
  const fpsHistoryRef = useRef<number[]>([]);

  // Utility function to normalize direction vector
  const getNormalizedDirection = () => {
    const dirLength =
      Math.sqrt(directionX * directionX + directionY * directionY) || 1;
    return {
      x: directionX / dirLength,
      y: directionY / dirLength,
    };
  };

  // Track actual particle count based on interaction state
  const [actualParticleCount, setActualParticleCount] = useState(
    isDragging
      ? Math.min(particleCount, ACTIVE_PARTICLE_COUNT)
      : Math.min(particleCount, IDLE_PARTICLE_COUNT)
  );

  // Update particle count based on interaction state
  useEffect(() => {
    // Use more particles when dragging, fewer when just hovering
    // But respect the particleCount prop as an upper limit
    const targetCount = isDragging
      ? Math.min(particleCount, ACTIVE_PARTICLE_COUNT)
      : Math.min(particleCount, IDLE_PARTICLE_COUNT);

    // Only update if different to avoid unnecessary re-initializations
    if (targetCount !== actualParticleCount) {
      setActualParticleCount(targetCount);

      // If particles already exist, adjust their count
      if (particlesRef.current.length > 0) {
        adjustParticleCount(targetCount);
      }
    }
  }, [isDragging, particleCount]);

  // Adjust the number of particles without full reinitialization
  const adjustParticleCount = (targetCount: number) => {
    const currentParticles = particlesRef.current;
    const currentCount = currentParticles.length;

    if (targetCount === currentCount) return;

    if (targetCount > currentCount) {
      // Add more particles
      const newParticles = initializeNewParticles(targetCount - currentCount);
      particlesRef.current = [...currentParticles, ...newParticles];
    } else {
      // Remove excess particles
      particlesRef.current = currentParticles.slice(0, targetCount);
    }
  };

  // Initialize a specific number of new particles
  const initializeNewParticles = (count: number): Particle[] => {
    const particles: Particle[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 5;
    const baseSpeed = baseSpeedRef.current;
    // Use signal if available, otherwise use ref
    const isAtOrigin = signals
      ? signals.magnitude.value < 0.01
      : currentMagnitudeRef.current < 0.01;

    // Calculate normalized direction vector
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();

    for (let i = 0; i < count; i++) {
      // Random position within the circular area
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;

      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      // Add some randomness to speed
      const speed = baseSpeed * (0.8 + Math.random() * 0.4);

      // Calculate velocity components - zero if at origin
      const vx = isAtOrigin ? 0 : normalizedDirX * speed;
      const vy = isAtOrigin ? 0 : normalizedDirY * speed;

      // Random lifespan - significantly increased for longer trails
      const maxLife = 500 + Math.random() * 150;

      particles.push({
        x,
        y,
        vx,
        vy,
        size: 0.8 + Math.random() * 1.2,
        speed,
        life: Math.random() * maxLife,
        maxLife,
        trail: [{ x, y, age: 0 }],
        trailLength: Math.min(
          15 + Math.floor(Math.random() * 5),
          MAX_TRAIL_POINTS
        ),
      });
    }

    return particles;
  };

  // Update the refs when magnitude changes
  useEffect(() => {
    // If using signals, we don't need to update the ref as we'll read directly from the signal
    if (!signals) {
      currentMagnitudeRef.current = magnitude;
    }
    baseSpeedRef.current = 0.3 + magnitude * 1.7;

    // Force immediate update of all particles when magnitude changes
    updateParticleVelocities();
  }, [magnitude, directionX, directionY, signals]);

  // Helper function to update particle velocities based on current magnitude
  const updateParticleVelocities = () => {
    const particles = particlesRef.current;
    if (particles.length === 0) return;

    // Use signal if available, otherwise use ref
    const isAtOrigin = signals
      ? signals.magnitude.value < 0.01
      : currentMagnitudeRef.current < 0.01;
    const baseSpeed = baseSpeedRef.current;

    // Calculate normalized direction vector
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();

    // Update all particles with new velocity
    particles.forEach((particle) => {
      // Add some randomness to speed
      particle.speed = baseSpeed * (0.8 + Math.random() * 0.4);

      // Set velocity to zero when at origin, otherwise update based on direction
      if (!isAtOrigin) {
        particle.vx = normalizedDirX * particle.speed;
        particle.vy = normalizedDirY * particle.speed;
      } else {
        particle.vx = 0;
        particle.vy = 0;
      }
    });
  };

  // Initialize particles
  const initParticles = () => {
    particlesRef.current = initializeNewParticles(actualParticleCount);
  };

  // Update particle positions and properties
  const updateParticles = (deltaTime: number) => {
    const particles = particlesRef.current;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 5;
    const radiusSquared = radius * radius; // Pre-calculate squared radius for performance

    // Calculate normalized direction vector
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();

    // Use the current base speed from the ref
    const baseSpeed = baseSpeedRef.current;

    // Always use the most current magnitude value - prefer signal if available
    const isAtOrigin = signals
      ? signals.magnitude.value < 0.01
      : currentMagnitudeRef.current < 0.01;

    // Increment frame counter for trail point throttling
    framesSinceLastTrailPointRef.current++;
    const shouldAddTrailPoint =
      framesSinceLastTrailPointRef.current >=
      (isLowPerformanceModeRef.current
        ? TRAIL_POINT_INTERVAL * 2
        : TRAIL_POINT_INTERVAL);

    if (shouldAddTrailPoint) {
      framesSinceLastTrailPointRef.current = 0;
    }

    particles.forEach((particle) => {
      // Update life
      particle.life += deltaTime;

      // If particle has exceeded its lifespan, reset it
      if (particle.life > particle.maxLife) {
        if (!isAtOrigin) {
          // Normal reset behavior - new random position
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * radius;

          particle.x = centerX + Math.cos(angle) * distance;
          particle.y = centerY + Math.sin(angle) * distance;
        } else {
          // When at origin, keep current position but refresh trail
          // Small random offset for visual interest
          const smallOffset = 2; // 2px max offset
          particle.x += (Math.random() * 2 - 1) * smallOffset;
          particle.y += (Math.random() * 2 - 1) * smallOffset;

          // Keep particles within the circle
          const dx = particle.x - centerX;
          const dy = particle.y - centerY;
          const distSquared = dx * dx + dy * dy;
          const radiusThreshold = radius * 0.9;
          const radiusThresholdSquared = radiusThreshold * radiusThreshold;

          if (distSquared > radiusThresholdSquared) {
            // Move back toward center if getting too close to edge
            const angle = Math.atan2(dy, dx);
            const safeRadius = radius * 0.8;
            particle.x = centerX + Math.cos(angle) * safeRadius;
            particle.y = centerY + Math.sin(angle) * safeRadius;
          }
        }

        // Add some randomness to speed
        particle.speed = baseSpeed * (0.8 + Math.random() * 0.4);

        // Update velocity components - zero velocity when at origin
        if (!isAtOrigin) {
          particle.vx = normalizedDirX * particle.speed;
          particle.vy = normalizedDirY * particle.speed;
        } else {
          particle.vx = 0;
          particle.vy = 0;
        }

        particle.life = 0;
        particle.trail = [{ x: particle.x, y: particle.y, age: 0 }];
      } else {
        // When magnitude is near zero, we want particles to stay in place
        if (!isAtOrigin) {
          // Update position - slower movement for more visible trails
          particle.x += particle.vx * deltaTime * PARTICLE_MOVEMENT_SCALE;
          particle.y += particle.vy * deltaTime * PARTICLE_MOVEMENT_SCALE;
        } else {
          // Add barely perceptible random movement for visual interest
          const microMovement = 0.002; // Very small movement
          particle.x += (Math.random() * 2 - 1) * microMovement * deltaTime;
          particle.y += (Math.random() * 2 - 1) * microMovement * deltaTime;
        }

        // Only add trail points periodically to reduce memory usage
        if (shouldAddTrailPoint) {
          // Add current position to trail
          particle.trail.push({
            x: particle.x,
            y: particle.y,
            age: 0,
          });

          // Limit trail length to reduce memory usage
          if (particle.trail.length > particle.trailLength) {
            particle.trail = particle.trail.slice(-particle.trailLength);
          }
        }

        // Age all trail points
        particle.trail.forEach((point) => {
          point.age += deltaTime;
        });

        // Remove old trail points - optimize by avoiding sqrt for distance check
        particle.trail = particle.trail.filter((point) => {
          // Check age first as it's a cheaper operation
          if (point.age >= MAX_TRAIL_AGE) return false;

          // Calculate squared distance from center (avoid sqrt for performance)
          const dx = point.x - centerX;
          const dy = point.y - centerY;
          const distSquared = dx * dx + dy * dy;

          // Compare with squared radius
          return distSquared <= radiusSquared;
        });

        // If particle goes outside the circular boundary, reset it
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distSquared = dx * dx + dy * dy;

        if (distSquared > radiusSquared) {
          // Random position within the circular area
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * radius * 0.5; // Start closer to center

          particle.x = centerX + Math.cos(angle) * distance;
          particle.y = centerY + Math.sin(angle) * distance;

          particle.trail = [{ x: particle.x, y: particle.y, age: 0 }];

          // Also update the particle speed with the current base speed when it resets
          particle.speed = baseSpeed * (0.8 + Math.random() * 0.4);

          // Update velocity components - zero velocity when at origin
          if (!isAtOrigin) {
            particle.vx = normalizedDirX * particle.speed;
            particle.vy = normalizedDirY * particle.speed;
          } else {
            particle.vx = 0;
            particle.vy = 0;
          }
        }
      }
    });
  };

  // Draw particles on canvas
  const drawParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Clear canvas with a slight fade effect instead of completely clearing
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)"; // Slight fade for trail effect
    ctx.fillRect(0, 0, width, height);

    // Set clipping region to be circular
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      width / 2,
      height / 2,
      Math.min(width, height) / 2 - 1,
      0,
      Math.PI * 2
    );
    ctx.clip();

    // Clear the clipped area completely
    ctx.clearRect(0, 0, width, height);

    // Parse the particleColor to extract RGB values
    let r = 200,
      g = 200,
      b = 200;
    if (particleColor) {
      const rgbaMatch = particleColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
      );
      if (rgbaMatch) {
        r = parseInt(rgbaMatch[1], 10);
        g = parseInt(rgbaMatch[2], 10);
        b = parseInt(rgbaMatch[3], 10);
      }
    }

    // Draw particles
    particlesRef.current.forEach((particle) => {
      if (particle.trail.length < 2) return;

      // Draw trail
      ctx.beginPath();

      // Start from the oldest point
      const startIndex = Math.max(
        0,
        particle.trail.length - particle.trailLength
      );

      ctx.moveTo(particle.trail[startIndex].x, particle.trail[startIndex].y);

      // Draw line through all points
      for (let i = startIndex + 1; i < particle.trail.length; i++) {
        const point = particle.trail[i];
        ctx.lineTo(point.x, point.y);
      }

      // Create gradient for trail
      const gradient = ctx.createLinearGradient(
        particle.trail[startIndex].x,
        particle.trail[startIndex].y,
        particle.x,
        particle.y
      );

      // Fade from transparent to the particle color with improved gradient
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.05)`);
      gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.2)`);
      gradient.addColorStop(0.9, `rgba(${r}, ${g}, ${b}, 0.4)`);
      gradient.addColorStop(1, particleColor);

      ctx.strokeStyle = gradient;
      ctx.lineWidth =
        particle.size * (0.5 + (particle.life / particle.maxLife) * 0.5); // Thinner at the end of life
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });

    ctx.restore();
  };

  // Calculate and update FPS
  const updateFPS = (timestamp: number) => {
    // Calculate current frame's FPS
    const currentFps = 1000 / (timestamp - lastTimeRef.current);

    // Add to history
    fpsHistoryRef.current.push(currentFps);

    // Keep history at desired size
    if (fpsHistoryRef.current.length > FPS_SAMPLE_SIZE) {
      fpsHistoryRef.current.shift();
    }

    // Only update FPS every 500ms to avoid excessive calculations
    if (timestamp - lastFpsUpdateRef.current > 500) {
      // Calculate average FPS from history
      const avgFps =
        fpsHistoryRef.current.reduce((sum, fps) => sum + fps, 0) /
        fpsHistoryRef.current.length;

      fpsRef.current = avgFps;
      lastFpsUpdateRef.current = timestamp;

      // Check if we should enter low performance mode
      isLowPerformanceModeRef.current = avgFps < LOW_PERFORMANCE_THRESHOLD;
    }
  };

  // Animation loop
  const animate = (timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
      lastFpsUpdateRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Update FPS tracking
    updateFPS(timestamp);

    // Skip frames in low performance mode
    frameCountRef.current++;
    if (isLowPerformanceModeRef.current && frameCountRef.current % 2 !== 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    updateParticles(deltaTime);
    drawParticles();

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Initialize and start animation
  useEffect(() => {
    if (!canvasRef.current) return;

    // Set canvas dimensions
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    // Initialize FPS history
    fpsHistoryRef.current = Array(FPS_SAMPLE_SIZE).fill(60);

    // Initialize particles with current direction values
    initParticles();

    // Start animation if visible
    if (isVisible) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      // Clean up animation frame on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [width, height, isVisible, actualParticleCount]);

  // Start/stop animation when visibility changes
  useEffect(() => {
    if (isVisible && !animationFrameRef.current) {
      // Reset time tracking
      lastTimeRef.current = 0;

      // Start animation
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (!isVisible && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }, [isVisible]);

  return (
    <div
      className={styles.particleContainer}
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <canvas
        ref={canvasRef}
        className={styles.particleCanvas}
        width={width}
        height={height}
      />
    </div>
  );
};
