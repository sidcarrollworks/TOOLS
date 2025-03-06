uniform float uTime;
uniform float uNoiseScaleX;
uniform float uNoiseScaleY;
uniform float uNoiseSpeed;
uniform float uNoiseStrength;
uniform float uNoiseShiftSpeed;

// We'll include the Perlin noise code via JavaScript

varying vec2 vUv;
varying vec3 vNormal;
varying float vNoise;

void main() {
    // Pass the UVs to the fragment shader
    vUv = uv;

    // Create animated noise used to displace the vertices
    vec3 noisePosition = vec3(position.x * uNoiseScaleX + uTime * uNoiseShiftSpeed, position.y * uNoiseScaleY, uTime * uNoiseSpeed);
    float noiseValue = cnoise(noisePosition) * uNoiseStrength;
    vNoise = noiseValue; // We can also use this in the fragment shader if desired

    // Displace vertex position along its normal
    vec3 transformed = position + normal * noiseValue;

    // Approximate a new normal based on local perturbation:
    // Sample two slightly offset positions for building tangents
    vec3 pos1 = position + vec3(0.01, 0.0, 0.0);
    vec3 pos2 = position + vec3(0.0, 0.01, 0.0);

    float noise1 = cnoise(vec3(pos1.x * uNoiseScaleX + uTime * uNoiseShiftSpeed, pos1.y * uNoiseScaleY, uTime * uNoiseSpeed)) * uNoiseStrength;
    float noise2 = cnoise(vec3(pos2.x * uNoiseScaleX + uTime * uNoiseShiftSpeed, pos2.y * uNoiseScaleY, uTime * uNoiseSpeed)) * uNoiseStrength;

    vec3 disp1 = pos1 + normal * noise1;
    vec3 disp2 = pos2 + normal * noise2;

    // Build tangent/bitangent to reconstruct a normal
    vec3 tangent = normalize(disp1 - transformed);
    vec3 bitangent = normalize(disp2 - transformed);
    vec3 newNormal = normalize(cross(tangent, bitangent));

    vNormal = newNormal;

    // Standard projection
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
} 