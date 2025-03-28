uniform float uTime;
uniform float uColorNoiseScale;
uniform float uColorNoiseSpeed;
uniform int uGradientMode;

// Grain effect parameters
uniform bool uEnableGrain;
uniform float uGrainIntensity;
uniform float uGrainScale;
uniform float uGrainDensity;
uniform float uGrainSpeed;
uniform float uGrainThreshold;

// Gradient shift parameters
uniform float uGradientShiftX;
uniform float uGradientShiftY;
uniform float uGradientShiftSpeed;

// Five user-defined colors:
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

// Random function for grain effect
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Generate grain pattern
float generateGrain(vec2 uv, float time, vec2 gradientOffset, float t) {
    // Create a much finer grain effect
    float pixelSize = 500.0 * uGrainScale; // Higher scale = finer grain
    
    // Apply the gradient offset at half speed for the grain effect
    // This makes the grain move at half the speed of the gradient
    vec2 offsetUv = uv + gradientOffset * uGrainSpeed * 0.5;
    
    vec2 pixelatedUv = floor(offsetUv * pixelSize) / pixelSize;
    
    // Add some random offset to each pixel
    vec2 grainUv = pixelatedUv + random(pixelatedUv) * 0.002;
    
    // Generate random noise
    float noise = random(grainUv);
    
    // Apply density - higher density means more grains
    // We use a threshold based on the density parameter
    float densityThreshold = 1.0 - uGrainDensity;
    
    // Make the noise more pronounced near color transitions
    // Calculate how close we are to a transition point (0.25, 0.5, 0.75)
    float transitionFactor = 0.0;
    
    // Check distance to transition points (assuming 4 colors with transitions at 0.25, 0.5, 0.75)
    float d1 = abs(t - 0.25);
    float d2 = abs(t - 0.5);
    float d3 = abs(t - 0.75);
    
    // Find the closest transition point
    float minDist = min(min(d1, d2), d3);
    
    // Create a transition factor that's higher near transitions
    // 0.1 controls how wide the transition area is
    transitionFactor = 1.0 - smoothstep(0.0, 0.1, minDist);
    
    // Adjust noise based on transition factor and density
    // Higher density = more grains (lower threshold)
    float threshold = densityThreshold - transitionFactor * 0.3;
    noise = step(threshold, noise);
    
    return noise;
}

void main() {
    // Basic lighting
    vec3 light = normalize(uLightDir);
    float diffuse = max(0.0, dot(vNormal, light)) * uDiffuseIntensity + uAmbientIntensity;
    
    // Create a gradient shift offset
    vec2 gradientOffset = vec2(
        uTime * uGradientShiftX * uGradientShiftSpeed * 10.0,
        uTime * uGradientShiftY * uGradientShiftSpeed * 10.0
    );
    
    // Sample noise with the gradient shift applied DIRECTLY to the noise coordinate
    float noiseVal = cnoise(vec3(
        vUv.x * uColorNoiseScale + gradientOffset.x,
        vUv.y * uColorNoiseScale + gradientOffset.y,
        uTime * uColorNoiseSpeed
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

    // Apply diffuse lighting
    vec3 finalColor = chosenColor * diffuse;

    // Subtle rim light from Z+ direction
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 2.0) * uRimLightIntensity;
    finalColor += vec3(1.0, 0.9, 0.8) * rim;
    
    // Apply grain effect if enabled
    if (uEnableGrain) {
        // Get the t value (position in gradient) for this pixel
        float t = (noiseVal + 1.0) * 0.5;
        
        // Use the same gradient offset for the grain effect
        float grain = generateGrain(vUv, uTime, gradientOffset, t);
        
        // Instead of just darkening/lightening, we'll create a color variation
        // by sampling nearby colors in the gradient
        
        // Sample colors slightly before and after current position
        float tOffset = uGrainThreshold * grain; // Offset based on grain and threshold parameter
        
        vec3 colorBefore, colorAfter;
        
        // Choose gradient function based on mode (same as main gradient)
        if (uGradientMode == 0) {
            // B-spline
            colorBefore = bSpline(c1, c2, c3, c4, max(0.0, t - tOffset));
            colorAfter = bSpline(c1, c2, c3, c4, min(1.0, t + tOffset));
        } 
        else if (uGradientMode == 1) {
            // Linear interpolation
            if (t < 0.33) {
                colorBefore = linearGradient(c1, c2, max(0.0, t - tOffset) * 3.0);
                colorAfter = linearGradient(c1, c2, min(1.0, t + tOffset) * 3.0);
            } else if (t < 0.66) {
                colorBefore = linearGradient(c2, c3, max(0.0, (t - tOffset) - 0.33) * 3.0);
                colorAfter = linearGradient(c2, c3, min(1.0, (t + tOffset) - 0.33) * 3.0);
            } else {
                colorBefore = linearGradient(c3, c4, max(0.0, (t - tOffset) - 0.66) * 3.0);
                colorAfter = linearGradient(c3, c4, min(1.0, (t + tOffset) - 0.66) * 3.0);
            }
        }
        else if (uGradientMode == 2) {
            // Step function
            colorBefore = stepGradient(uColors, max(0.0, t - tOffset));
            colorAfter = stepGradient(uColors, min(1.0, t + tOffset));
        }
        else if (uGradientMode == 3) {
            // Smooth step
            colorBefore = smoothStepGradient(uColors, max(0.0, t - tOffset));
            colorAfter = smoothStepGradient(uColors, min(1.0, t + tOffset));
        }
        else {
            // Fallback
            colorBefore = bSpline(c1, c2, c3, c4, max(0.0, t - tOffset));
            colorAfter = bSpline(c1, c2, c3, c4, min(1.0, t + tOffset));
        }
        
        // Calculate transition factor (how close we are to a color transition)
        float d1 = abs(t - 0.25);
        float d2 = abs(t - 0.5);
        float d3 = abs(t - 0.75);
        float minDist = min(min(d1, d2), d3);
        float transitionFactor = 1.0 - smoothstep(0.0, 0.1, minDist);
        
        // Mix between the colors based on grain value
        vec3 grainColor;
        if (grain > 0.5) {
            // Use color from slightly ahead in the gradient
            grainColor = colorAfter;
        } else {
            // Use color from slightly behind in the gradient
            grainColor = colorBefore;
        }
        
        // Apply more grain effect near transitions
        float grainStrength = uGrainIntensity * (transitionFactor * 0.7 + 0.3);
        
        // Mix the original color with the grain-affected color
        finalColor = mix(finalColor, grainColor, grainStrength);
    }

    gl_FragColor = vec4(finalColor, 1.0);
}