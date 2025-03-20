uniform float uTime;
uniform float uColorNoiseScale;
uniform float uColorNoiseSpeed;
uniform int uGradientMode;

// Gradient shift parameters
uniform float uGradientShiftX;
uniform float uGradientShiftY;
uniform float uGradientShiftSpeed;

// Four user-defined colors:
uniform vec3 uColors[4];

uniform vec3 uLightDir;
uniform float uDiffuseIntensity;
uniform float uAmbientIntensity;
uniform float uRimLightIntensity;

// We'll include the Perlin noise code via JavaScript

varying vec2 vUv;
varying vec3 vNormal;
varying float vNoise;
varying vec3 vPosition;

// Linear interpolation between two colors
vec3 linearGradient(vec3 colorA, vec3 colorB, float t) {
    return mix(colorA, colorB, t);
}

// Step function between colors (hard transitions)
vec3 stepGradient(vec3 colors[4], float t) {
    if (t < 0.25) return colors[0];
    if (t < 0.5) return colors[1];
    if (t < 0.75) return colors[2];
    return colors[3];
}

// Smoother step function (softer transitions)
vec3 smoothStepGradient(vec3 colors[4], float t) {
    if (t < 0.33) {
        return mix(colors[0], colors[1], smoothstep(0.0, 1.0, t / 0.33));
    } else if (t < 0.66) {
        return mix(colors[1], colors[2], smoothstep(0.0, 1.0, (t - 0.33) / 0.33));
    } else {
        return mix(colors[2], colors[3], smoothstep(0.0, 1.0, (t - 0.66) / 0.34));
    }
}

// Cubic B-spline basis function for t in [0..1] and 4 control points P0..P3.
vec3 bSpline(vec3 P0, vec3 P1, vec3 P2, vec3 P3, float t) {
    // For a uniform cubic B-spline, the basis can be written as:
    // w0 = (-t^3 + 3t^2 - 3t + 1) / 6
    // w1 = (3t^3 - 6t^2 + 4) / 6
    // w2 = (-3t^3 + 3t^2 + 3t + 1) / 6
    // w3 = t^3 / 6
    float t2 = t * t;
    float t3 = t2 * t;
    
    float w0 = (1.0 / 6.0) * (-t3 + 3.0 * t2 - 3.0 * t + 1.0);
    float w1 = (1.0 / 6.0) * (3.0 * t3 - 6.0 * t2 + 4.0);
    float w2 = (1.0 / 6.0) * (-3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0);
    float w3 = (1.0 / 6.0) * (t3);
    
    return P0 * w0 + P1 * w1 + P2 * w2 + P3 * w3;
}

void main() {
    // Ensure we have a properly normalized normal for lighting
    vec3 normalizedNormal = normalize(vNormal);
    
    // Create a gradient shift offset
    vec2 gradientOffset = vec2(
        uTime * uGradientShiftX * uGradientShiftSpeed * 10.0,
        uTime * uGradientShiftY * uGradientShiftSpeed * 10.0
    );
    
    // Normalize the position for consistent noise sampling across the cube
    vec3 normalizedPos = normalize(vPosition);
    
    // Use normalized position for noise sampling
    vec3 noiseCoord = vec3(
        normalizedPos.x * uColorNoiseScale + gradientOffset.x,
        normalizedPos.y * uColorNoiseScale + gradientOffset.y,
        normalizedPos.z * uColorNoiseScale + uTime * uColorNoiseSpeed
    );
    
    // Sample noise
    float noiseVal = cnoise(noiseCoord);
    
    // Map to [0,1] range
    float t = (noiseVal + 1.0) * 0.5;
    
    // Get our 4 colors
    vec3 c1 = uColors[0];
    vec3 c2 = uColors[1];
    vec3 c3 = uColors[2];
    vec3 c4 = uColors[3];
    
    // Choose gradient function based on mode
    vec3 chosenColor;
    
    if (uGradientMode == 0) {
        // B-spline (original)
        chosenColor = bSpline(c1, c2, c3, c4, t);
    } 
    else if (uGradientMode == 1) {
        // Linear interpolation between all 4 colors
        if (t < 0.33) {
            chosenColor = linearGradient(c1, c2, t * 3.0);
        } else if (t < 0.66) {
            chosenColor = linearGradient(c2, c3, (t - 0.33) * 3.0);
        } else {
            chosenColor = linearGradient(c3, c4, (t - 0.66) * 3.0);
        }
    }
    else if (uGradientMode == 2) {
        // Step function (hard transitions)
        chosenColor = stepGradient(uColors, t);
    }
    else if (uGradientMode == 3) {
        // Smooth step (softer transitions)
        chosenColor = smoothStepGradient(uColors, t);
    }
    else {
        // Fallback to B-spline
        chosenColor = bSpline(c1, c2, c3, c4, t);
    }

    // Lighting for cube - sharper than sphere, softer than plane
    vec3 light = normalize(uLightDir);
    
    // Calculate diffuse lighting
    float diffuseFactor = max(0.0, dot(normalizedNormal, light));
    
    // Apply lighting model appropriate for a cube
    float ambient = uAmbientIntensity;
    float diffuse = diffuseFactor * uDiffuseIntensity;
    
    // Combine lighting
    float lightingFactor = diffuse + ambient;
    
    // Apply lighting
    vec3 finalColor = chosenColor * lightingFactor;
    
    // Add a subtle rim light for edge definition
    // For a cube, we want a sharper rim light than a sphere but still subtle
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0) - normalizedNormal);
    float rim = 1.0 - max(0.0, dot(normalizedNormal, viewDir));
    rim = pow(rim, 3.0) * uRimLightIntensity * 0.2;
    
    // Add rim light
    finalColor += vec3(0.9, 0.9, 0.9) * rim;
    
    gl_FragColor = vec4(finalColor, 1.0);
} 