import { useRef, useEffect, useState, useMemo } from "preact/hooks";
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
  targetVx: number;
  targetVy: number;
  size: number;
  speed: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; age: number }>;
  trailLength: number;
  id: number;
}

// Performance optimization constants
const ACTIVE_PARTICLE_COUNT = 400;
const IDLE_PARTICLE_COUNT = 280;
const TRAIL_POINT_INTERVAL = 2;
const LOW_PERFORMANCE_THRESHOLD = 30;
const MAX_TRAIL_AGE = 800;
const FPS_SAMPLE_SIZE = 10;
const DIRECTION_CHANGE_INERTIA = 0.02;
const MIN_PARTICLE_DISTANCE = 6;
const PARTICLE_SIZE = 2;

export const ParticleFlow: FunctionalComponent<ParticleFlowProps> = ({
  magnitude = 0.5,
  width = 100,
  height = 100,
  particleCount = 250,
  particleColor = "rgba(200, 200, 200, 0.6)",
  isVisible = false,
  directionX = 0,
  directionY = 1,
  isDragging = false,
  signals,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const baseSpeedRef = useRef<number>(0.3 + magnitude * 1.7);
  const currentMagnitudeRef = useRef<number>(magnitude);
  const fpsRef = useRef<number>(60);
  const lastFpsUpdateRef = useRef<number>(0);
  const framesSinceLastTrailPointRef = useRef<number>(0);
  const isLowPerformanceModeRef = useRef<boolean>(false);
  const fpsHistoryRef = useRef<number[]>([]);
  const currentDirectionXRef = useRef<number>(directionX);
  const currentDirectionYRef = useRef<number>(directionY);

  // Track actual particle count based on interaction state
  const [actualParticleCount, setActualParticleCount] = useState(
    isDragging
      ? Math.min(particleCount, ACTIVE_PARTICLE_COUNT)
      : Math.min(particleCount, IDLE_PARTICLE_COUNT)
  );

  // Update direction refs when props change
  useEffect(() => {
    currentDirectionXRef.current = directionX;
    currentDirectionYRef.current = directionY;
  }, [directionX, directionY]);

  // Memoize center and radius calculations
  const { centerX, centerY, radius, radiusSquared } = useMemo(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 5;
    return { centerX, centerY, radius, radiusSquared: radius * radius };
  }, [width, height]);

  // Utility function to normalize direction vector
  const getNormalizedDirection = () => {
    const dx = signals ? -signals.valueX.value : currentDirectionXRef.current;
    const dy = signals ? -signals.valueY.value : currentDirectionYRef.current;
    const dirLength = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      x: dx / dirLength,
      y: -dy / dirLength,
    };
  };

  // Check if magnitude is effectively zero
  const isAtOrigin = () => {
    return signals
      ? signals.magnitude.value < 0.01
      : currentMagnitudeRef.current < 0.01;
  };

  // Update particle count based on interaction state and particleCount changes
  useEffect(() => {
    const targetCount = isDragging
      ? Math.min(particleCount, ACTIVE_PARTICLE_COUNT)
      : Math.min(particleCount, IDLE_PARTICLE_COUNT);

    if (targetCount !== actualParticleCount) {
      setActualParticleCount(targetCount);
      if (particlesRef.current.length > 0) {
        adjustParticleCount(targetCount);
      }
    }
  }, [isDragging, particleCount, actualParticleCount]);

  // Initialize particles
  const initParticles = () => {
    particlesRef.current = initializeNewParticles(actualParticleCount);
  };

  // Initialize a specific number of new particles
  const initializeNewParticles = (count: number): Particle[] => {
    const particles: Particle[] = [];
    const diameter = radius * 2;

    // Calculate appropriate grid size to fit more particles
    const gridPointsPerSide = Math.ceil(Math.sqrt(count * 3)); // Increased multiplier for denser grid
    const gridSpacing = diameter / gridPointsPerSide;
    const gridSize = Math.ceil((radius * 2) / gridSpacing);
    const startX = centerX - (gridSize * gridSpacing) / 2;
    const startY = centerY - (gridSize * gridSpacing) / 2;

    // Calculate direction for positioning - only used for velocity, not positioning
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();
    const baseSpeed = baseSpeedRef.current;
    const atOrigin = isAtOrigin();

    // Create grid positions with uniform distribution
    const gridPositions = [];

    // Collect all valid grid positions within the circle - no jitter for perfect grid
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = startX + i * gridSpacing; // Removed jitter for perfect grid
        const y = startY + j * gridSpacing; // Removed jitter for perfect grid
        const dx = x - centerX;
        const dy = y - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        if (distanceFromCenter <= radius) {
          // Only consider position within the circle
          gridPositions.push({
            x,
            y,
            distanceFromCenter,
          });
        }
      }
    }

    // Shuffle all positions for randomness while maintaining grid structure
    shuffleArray(gridPositions);

    // Take as many positions as needed, up to the count or available positions
    const selectedPositions = gridPositions.slice(
      0,
      Math.min(count, gridPositions.length)
    );

    // Create particles from the selected positions
    for (let i = 0; i < selectedPositions.length; i++) {
      const position = selectedPositions[i];
      const speed = baseSpeed;
      const vx = atOrigin ? 0 : normalizedDirX * speed;
      const vy = atOrigin ? 0 : normalizedDirY * speed;
      const maxLife = 8000 + Math.random() * 7000;

      particles.push({
        x: position.x,
        y: position.y,
        vx,
        vy,
        targetVx: vx,
        targetVy: vy,
        size: PARTICLE_SIZE,
        speed,
        life: 0,
        maxLife,
        trail: [{ x: position.x, y: position.y, age: 0 }],
        trailLength: Math.floor(8 + Math.random() * 12),
        id: i,
      });
    }

    // Add additional particles if needed - this is our fallback
    if (particles.length < count) {
      const remainingCount = count - particles.length;

      // Helper function for checking particle proximity
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
        let x = centerX;
        let y = centerY;
        let attempts = 0;
        let validPosition = false;

        while (!validPosition && attempts < 10) {
          const angle = Math.random() * Math.PI * 2;
          const normalizedRadius = Math.sqrt(Math.random()); // Uniform by area
          const distance = normalizedRadius * radius * 0.95;
          x = centerX + Math.cos(angle) * distance;
          y = centerY + Math.sin(angle) * distance;
          validPosition = !isTooClose(x, y);
          attempts++;
        }

        const speed = baseSpeed;
        const vx = atOrigin ? 0 : normalizedDirX * speed;
        const vy = atOrigin ? 0 : normalizedDirY * speed;
        const maxLife = 8000 + Math.random() * 7000;

        particles.push({
          x,
          y,
          vx,
          vy,
          targetVx: vx,
          targetVy: vy,
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

  // Initialize and start animation - update to include particleCount as a dependency
  useEffect(() => {
    if (!canvasRef.current) return;

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    fpsHistoryRef.current = Array(FPS_SAMPLE_SIZE).fill(60);
    initParticles();

    if (isVisible) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [width, height, isVisible, particleCount]);

  // Helper function to shuffle an array (Fisher-Yates algorithm)
  const shuffleArray = <T,>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Adjust particle count without full reinitialization
  const adjustParticleCount = (targetCount: number) => {
    const currentParticles = particlesRef.current;
    const currentCount = currentParticles.length;

    if (targetCount === currentCount) return;

    if (targetCount > currentCount) {
      const newParticles = initializeNewParticles(targetCount - currentCount);
      for (let i = 0; i < newParticles.length; i++) {
        newParticles[i].id = currentCount + i;
      }
      particlesRef.current = [...currentParticles, ...newParticles];
    } else {
      particlesRef.current = currentParticles.slice(0, targetCount);
    }
  };

  // Update the refs when magnitude changes
  useEffect(() => {
    if (!signals) {
      currentMagnitudeRef.current = magnitude;
    }
    baseSpeedRef.current = 0.3 + magnitude * 1.7;
    updateParticleVelocities();
  }, [magnitude, directionX, directionY, signals, isDragging]);

  // Update particle velocities based on current magnitude and direction
  const updateParticleVelocities = () => {
    const particles = particlesRef.current;
    if (particles.length === 0) return;

    const atOrigin = isAtOrigin();
    const baseSpeed = baseSpeedRef.current;
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();

    particles.forEach((particle) => {
      particle.speed = baseSpeed;
      if (!atOrigin) {
        particle.targetVx = normalizedDirX * particle.speed;
        particle.targetVy = normalizedDirY * particle.speed;
      } else {
        particle.targetVx = 0;
        particle.targetVy = 0;
      }
    });
  };

  // Find new position for respawning particles
  const findRespawnPosition = (
    particleId: number
  ): { x: number; y: number } => {
    // Calculate grid parameters
    const diameter = radius * 2;
    const gridPointsPerSide = Math.ceil(
      Math.sqrt(particlesRef.current.length * 3)
    );
    const gridSpacing = diameter / gridPointsPerSide;
    const gridSize = Math.ceil((radius * 2) / gridSpacing);
    const startX = centerX - (gridSize * gridSpacing) / 2;
    const startY = centerY - (gridSize * gridSpacing) / 2;

    // Helper to check proximity
    const isTooClose = (x: number, y: number, currentId: number): boolean => {
      for (const particle of particlesRef.current) {
        if (particle.id === currentId) continue;
        const dx = particle.x - x;
        const dy = particle.y - y;
        const distSquared = dx * dx + dy * dy;
        if (distSquared < MIN_PARTICLE_DISTANCE * MIN_PARTICLE_DISTANCE) {
          return true;
        }
      }
      return false;
    };

    // Generate possible positions uniformly across the circle - no jitter for perfect grid
    const positions = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = startX + i * gridSpacing; // Removed jitter for perfect grid
        const y = startY + j * gridSpacing; // Removed jitter for perfect grid
        const dx = x - centerX;
        const dy = y - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        if (distanceFromCenter <= radius && !isTooClose(x, y, particleId)) {
          // Only consider position within the circle
          positions.push({
            x,
            y,
            distanceFromCenter,
          });
        }
      }
    }

    // Shuffle and select a random position
    if (positions.length > 0) {
      shuffleArray(positions);
      return positions[0];
    }

    // Fallback to random position with collision avoidance
    let attempts = 0;
    let x = centerX;
    let y = centerY;
    let validPosition = false;

    while (!validPosition && attempts < 15) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      // Use uniform distribution across the entire circle area
      const normalizedRadius = Math.sqrt(Math.random()); // Square root for uniform area distribution
      const distance = normalizedRadius * radius * 0.9;
      x = centerX + Math.cos(angle) * distance;
      y = centerY + Math.sin(angle) * distance;

      validPosition = !isTooClose(x, y, particleId);
    }

    if (validPosition) {
      return { x, y };
    }

    // Last resort - just pick a random position and force it
    const angle = Math.random() * Math.PI * 2;
    const normalizedRadius = Math.sqrt(Math.random());
    const distance = normalizedRadius * radius * 0.8;
    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
    };
  };

  // Update particle positions and properties
  const updateParticles = (deltaTime: number) => {
    const particles = particlesRef.current;
    const atOrigin = isAtOrigin();
    const { x: normalizedDirX, y: normalizedDirY } = getNormalizedDirection();
    const baseSpeed = baseSpeedRef.current;

    // Handle origin case
    if (atOrigin) {
      particles.forEach((particle) => {
        particle.vx = 0;
        particle.vy = 0;
        particle.targetVx = 0;
        particle.targetVy = 0;
        if (particle.trail.length > 1) {
          particle.trail = [{ x: particle.x, y: particle.y, age: 0 }];
        }
      });
    }

    // Trail point management
    framesSinceLastTrailPointRef.current++;
    const shouldAddTrailPoint =
      framesSinceLastTrailPointRef.current >=
      (isLowPerformanceModeRef.current
        ? TRAIL_POINT_INTERVAL * 2
        : TRAIL_POINT_INTERVAL);

    if (shouldAddTrailPoint) {
      framesSinceLastTrailPointRef.current = 0;
    }

    // Time scaling for consistent movement
    const timeScale = deltaTime / 16.67;

    // Update each particle
    particles.forEach((particle) => {
      // Update velocity and position
      if (!atOrigin) {
        // Apply inertia to velocity
        particle.vx +=
          (particle.targetVx - particle.vx) * DIRECTION_CHANGE_INERTIA;
        particle.vy +=
          (particle.targetVy - particle.vy) * DIRECTION_CHANGE_INERTIA;

        // Update position
        particle.x += particle.vx * timeScale;
        particle.y += particle.vy * timeScale;
      }

      // Update life
      particle.life += deltaTime;

      // Handle particle lifespan expiration
      if (particle.life > particle.maxLife) {
        // Respawn particle
        const newPosition = findRespawnPosition(particle.id);
        particle.x = newPosition.x;
        particle.y = newPosition.y;
        particle.size = PARTICLE_SIZE;
        particle.speed = baseSpeed;

        // Reset velocity
        if (!atOrigin) {
          particle.targetVx = normalizedDirX * particle.speed;
          particle.targetVy = normalizedDirY * particle.speed;
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
        // Manage trail
        if (shouldAddTrailPoint && !atOrigin) {
          // Add trail point
          particle.trail.push({
            x: particle.x,
            y: particle.y,
            age: 0,
          });

          // Limit trail length
          if (particle.trail.length > particle.trailLength) {
            particle.trail = particle.trail.slice(-particle.trailLength);
          }
        }

        // Age trail points
        particle.trail.forEach((point) => {
          point.age += deltaTime;
        });

        // Remove old trail points
        particle.trail = particle.trail.filter((point) => {
          if (point.age >= MAX_TRAIL_AGE) return false;

          const dx = point.x - centerX;
          const dy = point.y - centerY;
          const distSquared = dx * dx + dy * dy;

          return distSquared <= radiusSquared;
        });

        // Check if particle is outside boundary
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distSquared = dx * dx + dy * dy;

        if (distSquared > radiusSquared) {
          const newPosition = findRespawnPosition(particle.id);
          particle.x = newPosition.x;
          particle.y = newPosition.y;
          particle.trail = [{ x: particle.x, y: particle.y, age: 0 }];

          if (!atOrigin) {
            particle.targetVx = normalizedDirX * particle.speed;
            particle.targetVy = normalizedDirY * particle.speed;
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

    // Clear with fade effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(0, 0, width, height);

    // Set clipping region
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.clearRect(0, 0, width, height);

    // Parse color
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

    const atOrigin = isAtOrigin();

    // Draw particles
    particlesRef.current.forEach((particle) => {
      const isStationary =
        atOrigin ||
        (Math.abs(particle.vx) < 0.01 && Math.abs(particle.vy) < 0.01);

      if (isStationary) {
        // Draw circle for stationary particles
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      } else if (particle.trail.length >= 2) {
        // Draw trail for moving particles
        ctx.beginPath();
        const startIndex = Math.max(
          0,
          particle.trail.length - particle.trailLength
        );
        ctx.moveTo(particle.trail[startIndex].x, particle.trail[startIndex].y);

        for (let i = startIndex + 1; i < particle.trail.length; i++) {
          ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }

        // Create gradient
        const gradient = ctx.createLinearGradient(
          particle.trail[startIndex].x,
          particle.trail[startIndex].y,
          particle.x,
          particle.y
        );

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

        // Draw circle at end
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      } else {
        // Fallback for particles without trail
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
      }
    });

    ctx.restore();
  };

  // Update FPS calculation
  const updateFPS = (timestamp: number) => {
    const currentFps = 1000 / (timestamp - lastTimeRef.current);
    fpsHistoryRef.current.push(currentFps);

    if (fpsHistoryRef.current.length > FPS_SAMPLE_SIZE) {
      fpsHistoryRef.current.shift();
    }

    if (timestamp - lastFpsUpdateRef.current > 500) {
      const avgFps =
        fpsHistoryRef.current.reduce((sum, fps) => sum + fps, 0) /
        fpsHistoryRef.current.length;

      fpsRef.current = avgFps;
      lastFpsUpdateRef.current = timestamp;
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

  // Handle visibility changes
  useEffect(() => {
    if (isVisible && !animationFrameRef.current) {
      lastTimeRef.current = 0;
      updateParticleVelocities();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (!isVisible && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }, [isVisible]);

  // Update velocities when dragging stops
  useEffect(() => {
    if (!isDragging && particlesRef.current.length > 0) {
      updateParticleVelocities();
    }
  }, [isDragging]);

  // Update velocities when signals change
  useEffect(() => {
    if (signals && particlesRef.current.length > 0) {
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
