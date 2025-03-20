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
    // For a sphere, we use the normalized normal vector for noise sampling
    // This ensures seamless noise across the sphere surface
    vec3 normalizedNormal = normalize(vNormal);
    
    // Create a gradient shift offset
    vec2 gradientOffset = vec2(
        uTime * uGradientShiftX * uGradientShiftSpeed * 10.0,
        uTime * uGradientShiftY * uGradientShiftSpeed * 10.0
    );
    
    // Sample noise with the gradient shift applied to the normalized normal
    // This approach prevents seams at the poles and edges
    float noiseVal = cnoise(vec3(
        normalizedNormal.x * uColorNoiseScale + gradientOffset.x,
        normalizedNormal.y * uColorNoiseScale + gradientOffset.y,
        normalizedNormal.z * uColorNoiseScale + uTime * uColorNoiseSpeed
    ));
    
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

    // Balanced lighting for sphere
    vec3 light = normalize(uLightDir);
    
    // Calculate diffuse lighting
    float diffuseFactor = max(0.0, dot(normalizedNormal, light));
    
    // Apply a balanced lighting model for spheres
    // Use a moderate ambient boost to prevent colors from becoming too dark
    float enhancedAmbient = uAmbientIntensity * 1.2;
    float enhancedDiffuse = diffuseFactor * uDiffuseIntensity;
    
    // Combine lighting with a bias toward preserving color vibrancy
    float lightingFactor = enhancedDiffuse + enhancedAmbient;
    
    // Apply a subtle gamma correction to enhance color vibrancy without distortion
    vec3 gammaCorrectedColor = pow(chosenColor, vec3(0.9));
    
    // Apply lighting with color preservation
    vec3 finalColor = gammaCorrectedColor * lightingFactor;
    
    // Add a more controlled rim light that doesn't overpower the base colors
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0) - normalizedNormal);
    float rim = 1.0 - max(0.0, dot(normalizedNormal, viewDir));
    
    // Use a more subtle rim light with tighter falloff
    rim = pow(rim, 2.0) * uRimLightIntensity * 0.1;
    
    // Use a more neutral rim light color that doesn't shift the overall color balance
    finalColor += vec3(0.9, 0.9, 0.9) * rim;
    
    // Apply a more subtle color boost to ensure vibrancy without washing out
    finalColor = mix(finalColor, gammaCorrectedColor, 0.2);
    
    gl_FragColor = vec4(finalColor, 1.0);
} 