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
  targetVx: number; // Target velocity X component
  targetVy: number; // Target velocity Y component
  size: number;
  speed: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; age: number }>;
  trailLength: number;
  id: number; // Add unique ID for each particle to help with distance checks
}

// Performance optimization constants
const ACTIVE_PARTICLE_COUNT = 100; // Increased from 60 for better grid coverage
const IDLE_PARTICLE_COUNT = 60; // Increased from 35 for better grid coverage
const MAX_TRAIL_POINTS = 20; // Maximum number of trail points to store
const TRAIL_POINT_INTERVAL = 2; // Only add a trail point every N frames
const LOW_PERFORMANCE_THRESHOLD = 30; // FPS threshold for low performance mode
const PARTICLE_MOVEMENT_SCALE = 0.05; // Scale factor for particle movement speed
const MAX_TRAIL_AGE = 800; // Maximum age for trail points in milliseconds
const FPS_SAMPLE_SIZE = 10; // Number of frames to average for FPS calculation
const DIRECTION_CHANGE_INERTIA = 0.02; // How quickly particles adjust to new direction (0-1)
const MIN_PARTICLE_DISTANCE = 15; // Increased from 10 for better grid spacing
const PARTICLE_SIZE = 2; // Adjusted for better circle appearance

export const ParticleFlow: FunctionalComponent<ParticleFlowProps> = ({
  magnitude = 0.5,
  width = 100,
  height = 100,
  particleCount = 100,
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
  // Add refs to track current direction values
  const currentDirectionXRef = useRef<number>(directionX);
  const currentDirectionYRef = useRef<number>(directionY);

  // Update direction refs when props change
  useEffect(() => {
    currentDirectionXRef.current = directionX;
    currentDirectionYRef.current = directionY;
  }, [directionX, directionY]);

  // Utility function to normalize direction vector
  const getNormalizedDirection = () => {
    // If signals are available, use them directly for the most up-to-date values
    // Otherwise fall back to refs which track the most recent prop values
    const dx = signals ? -signals.valueX.value : currentDirectionXRef.current;
    const dy = signals ? -signals.valueY.value : currentDirectionYRef.current;

    const dirLength = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      x: dx / dirLength,
      y: -dy / dirLength, // Flip Y direction to match visual representation
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

      // Update IDs of new particles to ensure uniqueness
      for (let i = 0; i < newParticles.length; i++) {
        newParticles[i].id = currentCount + i;
      }

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

    // Calculate normalized direction vector
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();

    // Use the current base speed from the ref
    const baseSpeed = baseSpeedRef.current;

    // Always use the most current magnitude value - prefer signal if available
    const isAtOrigin = signals
      ? signals.magnitude.value < 0.01
      : currentMagnitudeRef.current < 0.01;

    // Create a grid of particles within the circle
    // Calculate grid spacing based on the circle size and desired particle count
    // This ensures we have enough grid points to accommodate all particles
    const diameter = radius * 2;
    const gridPointsPerSide = Math.ceil(Math.sqrt(count * 1.5)); // Add 50% more grid points than particles
    const gridSpacing = diameter / gridPointsPerSide;

    // Calculate how many grid cells we need in each direction
    // We'll create a square grid and then filter out points outside the circle
    const gridSize = Math.ceil((radius * 2) / gridSpacing);

    // Calculate the starting position for the grid (top-left corner)
    const startX = centerX - (gridSize * gridSpacing) / 2;
    const startY = centerY - (gridSize * gridSpacing) / 2;

    // Calculate the angle of the control point direction
    const controlAngle = Math.atan2(normalizedDirY, normalizedDirX);
    // The opposite angle is controlAngle + PI
    const oppositeAngle = controlAngle + Math.PI;

    // Create a list of grid positions
    const gridPositions: Array<{
      x: number;
      y: number;
      distanceFromCenter: number;
      oppositenessFactor: number;
    }> = [];

    // Generate all possible grid positions
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = startX + i * gridSpacing;
        const y = startY + j * gridSpacing;

        // Calculate distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        // Only include points inside the circle
        if (distanceFromCenter <= radius) {
          // Calculate angle from center
          const angle = Math.atan2(dy, dx);

          // Calculate how opposite this point is to the control direction
          const angleDiff = Math.abs(
            ((angle - oppositeAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
          );
          const oppositenessFactor = 1 - angleDiff / Math.PI; // 1 when directly opposite, 0 when same direction

          gridPositions.push({
            x,
            y,
            distanceFromCenter,
            oppositenessFactor,
          });
        }
      }
    }

    // Sort grid positions by oppositenessFactor (higher values first)
    // This ensures we prioritize positions opposite to the control direction
    gridPositions.sort((a, b) => b.oppositenessFactor - a.oppositenessFactor);

    // Take only the number of positions we need
    const selectedPositions = gridPositions.slice(0, count);

    // Create particles at the selected positions
    for (let i = 0; i < selectedPositions.length; i++) {
      const position = selectedPositions[i];

      // Use consistent speed for all particles (no randomness)
      const speed = baseSpeed;

      // Initial velocity based on direction
      const vx = isAtOrigin ? 0 : normalizedDirX * speed;
      const vy = isAtOrigin ? 0 : normalizedDirY * speed;

      // Set target velocity same as initial velocity
      const targetVx = vx;
      const targetVy = vy;

      // Random life duration
      const maxLife = 8000 + Math.random() * 7000;

      particles.push({
        x: position.x,
        y: position.y,
        vx,
        vy,
        targetVx,
        targetVy,
        size: PARTICLE_SIZE,
        speed,
        life: 0,
        maxLife,
        trail: [{ x: position.x, y: position.y, age: 0 }],
        trailLength: Math.floor(8 + Math.random() * 12),
        id: i,
      });
    }

    // If we couldn't create enough particles with the grid, add more randomly
    if (particles.length < count) {
      const remainingCount = count - particles.length;
      console.log(
        `Grid created ${particles.length} particles, adding ${remainingCount} more randomly`
      );

      // Helper function to check if a position is too close to existing particles
      const isTooClose = (x: number, y: number): boolean => {
        for (const particle of particles) {
          const dx = particle.x - x;
          const dy = particle.y - y;
          const distSquared = dx * dx + dy * dy;
          if (distSquared < MIN_PARTICLE_DISTANCE * MIN_PARTICLE_DISTANCE) {
            return true;
          }
        }
        return false;
      };

      for (let i = 0; i < remainingCount; i++) {
        // Try to find a position that's not too close to other particles
        let x = 0,
          y = 0,
          attempts = 0;
        let validPosition = false;

        // Maximum attempts to find a valid position
        const maxAttempts = 10;

        while (!validPosition && attempts < maxAttempts) {
          // Generate a random angle
          const angle = Math.random() * Math.PI * 2;

          // Use square root distribution for radial gradient effect
          const distance = Math.sqrt(Math.random()) * radius * 0.95;

          x = centerX + Math.cos(angle) * distance;
          y = centerY + Math.sin(angle) * distance;

          // Check if this position is valid (not too close to other particles)
          validPosition = !isTooClose(x, y);
          attempts++;
        }

        // Use consistent speed for all particles (no randomness)
        const speed = baseSpeed;

        // Initial velocity based on direction
        const vx = isAtOrigin ? 0 : normalizedDirX * speed;
        const vy = isAtOrigin ? 0 : normalizedDirY * speed;

        // Set target velocity same as initial velocity
        const targetVx = vx;
        const targetVy = vy;

        // Random life duration
        const maxLife = 8000 + Math.random() * 7000;

        particles.push({
          x,
          y,
          vx,
          vy,
          targetVx,
          targetVy,
          size: PARTICLE_SIZE,
          speed,
          life: 0,
          maxLife,
          trail: [{ x, y, age: 0 }],
          trailLength: Math.floor(8 + Math.random() * 12),
          id: particles.length,
        });
      }
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
  }, [magnitude, directionX, directionY, signals, isDragging]);

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

    // Debug log to understand what's happening with direction values
    console.log("Updating particle velocities:", {
      propDirectionX: directionX,
      propDirectionY: directionY,
      signalValueX: signals?.valueX.value,
      signalValueY: signals?.valueY.value,
      normalizedDirX,
      normalizedDirY,
      isDragging,
    });

    // Update all particles with new target velocity
    particles.forEach((particle) => {
      // Use consistent speed for all particles (no randomness)
      particle.speed = baseSpeed;

      // Set target velocity to zero when at origin, otherwise update based on direction
      if (!isAtOrigin) {
        particle.targetVx = normalizedDirX * particle.speed;
        particle.targetVy = normalizedDirY * particle.speed;
      } else {
        particle.targetVx = 0;
        particle.targetVy = 0;
      }

      // Note: We don't immediately update vx/vy here anymore
      // That will happen gradually in updateParticles
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

    // Recalculate normalized direction vector on every frame to ensure it's up-to-date
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();

    // Use the current base speed from the ref
    const baseSpeed = baseSpeedRef.current;

    // Always use the most current magnitude value - prefer signal if available
    const isAtOrigin = signals
      ? signals.magnitude.value < 0.01
      : currentMagnitudeRef.current < 0.01;

    // If at origin, immediately stop all particle movement
    if (isAtOrigin) {
      particles.forEach((particle) => {
        particle.vx = 0;
        particle.vy = 0;
        particle.targetVx = 0;
        particle.targetVy = 0;

        // Clear trails when at origin to prevent any visual artifacts
        if (particle.trail.length > 1) {
          particle.trail = [{ x: particle.x, y: particle.y, age: 0 }];
        }
      });
    }

    // Calculate grid parameters for respawning particles
    const diameter = radius * 2;
    const gridPointsPerSide = Math.ceil(Math.sqrt(particles.length * 1.5)); // Add 50% more grid points than particles
    const gridSpacing = diameter / gridPointsPerSide;
    const gridSize = Math.ceil((radius * 2) / gridSpacing);
    const startX = centerX - (gridSize * gridSpacing) / 2;
    const startY = centerY - (gridSize * gridSpacing) / 2;

    // Calculate the angle of the control point direction
    const controlAngle = Math.atan2(normalizedDirY, normalizedDirX);
    // The opposite angle is controlAngle + PI
    const oppositeAngle = controlAngle + Math.PI;

    // Create a counter for respawned particles to distribute them evenly
    let respawnCounter = 0;
    // Calculate angle step based on estimated number of particles that might respawn
    // Using a fraction of total particles as an estimate
    const estimatedRespawnCount = Math.max(
      5,
      Math.floor(particles.length / 10)
    );
    const angleStep = (Math.PI * 2) / estimatedRespawnCount;

    // Helper function to check if a position is too close to existing particles
    const isTooClose = (
      x: number,
      y: number,
      currentParticleId: number
    ): boolean => {
      for (const particle of particles) {
        // Skip checking against itself
        if (particle.id === currentParticleId) continue;

        const dx = particle.x - x;
        const dy = particle.y - y;
        const distSquared = dx * dx + dy * dy;
        if (distSquared < MIN_PARTICLE_DISTANCE * MIN_PARTICLE_DISTANCE) {
          return true;
        }
      }
      return false;
    };

    // Helper function to find the nearest available grid position
    const findNearestGridPosition = (
      particleId: number
    ): { x: number; y: number } => {
      // Generate all possible grid positions
      const gridPositions: Array<{
        x: number;
        y: number;
        distanceFromCenter: number;
        oppositenessFactor: number;
      }> = [];

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const x = startX + i * gridSpacing;
          const y = startY + j * gridSpacing;

          // Calculate distance from center
          const dx = x - centerX;
          const dy = y - centerY;
          const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

          // Only include points inside the circle
          if (distanceFromCenter <= radius) {
            // Calculate angle from center
            const angle = Math.atan2(dy, dx);

            // Calculate how opposite this point is to the control direction
            const angleDiff = Math.abs(
              ((angle - oppositeAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
            );
            const oppositenessFactor = 1 - angleDiff / Math.PI; // 1 when directly opposite, 0 when same direction

            // Check if this position is available (not too close to other particles)
            if (!isTooClose(x, y, particleId)) {
              gridPositions.push({
                x,
                y,
                distanceFromCenter,
                oppositenessFactor,
              });
            }
          }
        }
      }

      // Sort grid positions by oppositenessFactor (higher values first)
      // This ensures we prioritize positions opposite to the control direction
      gridPositions.sort((a, b) => b.oppositenessFactor - a.oppositenessFactor);

      // If we found any valid grid positions, return the first one (most opposite to control direction)
      if (gridPositions.length > 0) {
        return gridPositions[0];
      }

      // If no valid grid positions found, return a random position
      // This is a fallback to ensure we always have a position
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius * 0.7;
      return {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
      };
    };

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

    // Scale deltaTime to ensure consistent movement speed regardless of frame rate
    const timeScale = deltaTime / 16.67; // Normalized to 60fps

    // Update each particle
    particles.forEach((particle) => {
      // Skip position updates if at origin
      if (!isAtOrigin) {
        // Gradually adjust velocity toward target velocity (simulates inertia)
        const inertiaFactor = DIRECTION_CHANGE_INERTIA;
        particle.vx += (particle.targetVx - particle.vx) * inertiaFactor;
        particle.vy += (particle.targetVy - particle.vy) * inertiaFactor;

        // Update position based on velocity
        particle.x += particle.vx * timeScale;
        particle.y += particle.vy * timeScale;
      }

      // Update life
      particle.life += deltaTime;

      // If particle has exceeded its lifespan, reset it
      if (particle.life > particle.maxLife) {
        if (!isAtOrigin) {
          // Find a new grid position for this particle
          const newPosition = findNearestGridPosition(particle.id);

          // Update particle position with the new position
          particle.x = newPosition.x;
          particle.y = newPosition.y;

          // Set fixed particle size
          particle.size = PARTICLE_SIZE;
        } else {
          // When at origin, keep current position but refresh trail
          // No need for random movement when at origin
          // Just keep the particle in place

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

        // Use consistent speed for all particles (no randomness)
        particle.speed = baseSpeed;

        // Update velocity components - zero velocity when at origin
        if (!isAtOrigin) {
          particle.targetVx = normalizedDirX * particle.speed;
          particle.targetVy = normalizedDirY * particle.speed;
          // Reset actual velocity to match target for immediate response after reset
          particle.vx = particle.targetVx;
          particle.vy = particle.targetVy;
        } else {
          particle.targetVx = 0;
          particle.targetVy = 0;
          particle.vx = 0;
          particle.vy = 0;
        }

        particle.life = 0;
        particle.trail = [{ x: particle.x, y: particle.y, age: 0 }];
      } else {
        // When magnitude is near zero, we want particles to stay in place
        if (!isAtOrigin) {
          // Position updates are now handled at the beginning of updateParticles
          // No need to update position here as it's already done
        } else {
          // No random movement when at origin - keep particles completely still
        }

        // Only add trail points periodically to reduce memory usage
        if (shouldAddTrailPoint && !isAtOrigin) {
          // Only add trail points when not at origin
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
          // Find a new grid position for this particle
          const newPosition = findNearestGridPosition(particle.id);

          // Update particle position with the new position
          particle.x = newPosition.x;
          particle.y = newPosition.y;
          particle.size = PARTICLE_SIZE; // Set fixed particle size

          particle.trail = [{ x: particle.x, y: particle.y, age: 0 }];

          // Use consistent speed for all particles (no randomness)
          particle.speed = baseSpeed;

          // Update velocity components - zero velocity when at origin
          if (!isAtOrigin) {
            particle.targetVx = normalizedDirX * particle.speed;
            particle.targetVy = normalizedDirY * particle.speed;
            // Reset actual velocity to match target for immediate response after reset
            particle.vx = particle.targetVx;
            particle.vy = particle.targetVy;
          } else {
            particle.targetVx = 0;
            particle.targetVy = 0;
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

    // Get the magnitude to determine if we're at origin
    const isAtOrigin = signals
      ? signals.magnitude.value < 0.01
      : currentMagnitudeRef.current < 0.01;

    // Draw particles
    particlesRef.current.forEach((particle) => {
      // When at origin or when particle has no movement, draw a full circle
      if (
        isAtOrigin ||
        (Math.abs(particle.vx) < 0.01 && Math.abs(particle.vy) < 0.01)
      ) {
        // Draw a full circle for stationary particles
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      } else if (particle.trail.length >= 2) {
        // For moving particles, draw a trail with a circle at the end
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
        ctx.lineWidth = PARTICLE_SIZE;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Draw a circle at the current position
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      } else {
        // Fallback for particles with insufficient trail points
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      }
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

      // Update particle velocities with current direction values
      updateParticleVelocities();

      // Start animation
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (!isVisible && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }, [isVisible]);

  // Ensure particle velocities are updated when dragging stops
  useEffect(() => {
    // Only run this effect when transitioning from dragging to not dragging
    if (!isDragging && particlesRef.current.length > 0) {
      // Update particle velocities with the final direction values
      updateParticleVelocities();
    }
  }, [isDragging]);

  // Update particle velocities when signals change
  useEffect(() => {
    if (signals && particlesRef.current.length > 0) {
      // Use a timeout to ensure this runs after the signal values have been updated
      const timeoutId = setTimeout(() => {
        updateParticleVelocities();
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [signals?.valueX.value, signals?.valueY.value, signals?.magnitude.value]);

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
