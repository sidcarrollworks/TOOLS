uniform float uTime;
uniform float uNoiseScaleX;
uniform float uNoiseScaleY;
uniform float uNoiseSpeed;
uniform float uNoiseStrength;
uniform float uNoiseShiftX;
uniform float uNoiseShiftY;
uniform float uNoiseShiftSpeed;

// We'll include the Perlin noise code via JavaScript

varying vec2 vUv;
varying vec3 vNormal;
varying float vNoise;
varying vec3 vPosition;

void main() {
  // Pass the UVs to the fragment shader
  vUv = uv;
  
  // Store the original position for use in the fragment shader
  vPosition = position;
  
  // Calculate shift offsets based on time and direction
  float shiftX = uTime * uNoiseShiftX * uNoiseShiftSpeed;
  float shiftY = uTime * uNoiseShiftY * uNoiseShiftSpeed;
  
  // Normalize the position for consistent noise sampling across the cube
  vec3 normalizedPos = normalize(position);
  
  // Create noise coordinates using the normalized position
  // This ensures that vertices at the edges/corners get the same noise value
  vec3 noiseCoord = vec3(
    normalizedPos.x * uNoiseScaleX + shiftX,
    normalizedPos.y * uNoiseScaleY + shiftY,
    normalizedPos.z * uNoiseScaleX + uTime * uNoiseSpeed
  );
  
  // Calculate noise value
  float noiseValue = cnoise(noiseCoord) * uNoiseStrength;
  vNoise = noiseValue; // Pass to fragment shader
  
  // The key to keeping vertices connected is to ensure that:
  // 1. Vertices at the same position get the same displacement
  // 2. The displacement preserves the structure of the cube
  
  // We'll use a simple scaling approach:
  // - Calculate the original distance from center
  // - Add the noise value to this distance
  // - Scale the normalized position by this new distance
  float distance = length(position);
  float newDistance = distance + noiseValue;
  
  // Apply the new distance to the normalized position
  vec3 transformed = normalizedPos * newDistance;
  
  // Calculate new normals for proper lighting
  // For a cube that's been deformed by scaling from the center,
  // the new normal is the same as the normalized position
  // This gives us a smooth, rounded look while maintaining the cube's structure
  vNormal = mix(normal, normalizedPos, abs(noiseValue) * 0.5);
  vNormal = normalize(vNormal);
  
  // Standard projection
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
} 