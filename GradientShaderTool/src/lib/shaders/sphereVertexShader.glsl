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

void main() {
  // Pass the UVs to the fragment shader
  vUv = uv;
  
  // Calculate shift offsets based on time and direction
  float shiftX = uTime * uNoiseShiftX * uNoiseShiftSpeed;
  float shiftY = uTime * uNoiseShiftY * uNoiseShiftSpeed;
  
  // For a sphere, we use the normalized position as input to noise
  // This ensures seamless noise across the sphere surface
  vec3 normalizedPos = normalize(position);
  
  // Create animated noise using spherical coordinates for better seam handling
  // We use the normalized position directly, which maps the sphere to a unit sphere
  // This approach ensures consistent noise sampling across the entire surface
  vec3 noisePosition = vec3(
    normalizedPos.x * uNoiseScaleX + shiftX,
    normalizedPos.y * uNoiseScaleY + shiftY,
    normalizedPos.z * uNoiseScaleX + uTime * uNoiseSpeed
  );
  
  float noiseValue = cnoise(noisePosition) * uNoiseStrength;
  vNoise = noiseValue; // Pass to fragment shader
  
  // Displace vertex position by scaling the normalized position
  // This maintains the spherical structure better than displacing along the normal
  float radius = length(position);
  vec3 transformed = normalizedPos * (radius + noiseValue);
  
  // Calculate new normals for proper lighting
  // For a sphere, the normal after displacement is simply the normalized position to the new point
  vNormal = normalize(transformed);
  
  // Standard projection
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
} 