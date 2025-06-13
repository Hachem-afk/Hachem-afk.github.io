/**
 * Crystal Fractal Raytracing Simulation
 * Advanced crystal rendering with recursive raytracing and chromatic dispersion
 */
class CrystalSimulation extends RaytracingEngine {
    constructor() {
        super();
        
        // Crystal-specific parameters
        this.crystalParams = {
            fractalIterations: 8,
            fractalPower: 8.0,
            crystalScale: 2.0,
            refractionIndex: 1.52, // Glass-like refraction
            dispersionStrength: 0.15,
            reflectionBounces: 3,
            crystalRotationSpeed: 0.3,
            growthAnimation: 1.0,
            crystalComplexity: 0.8
        };
        
        // Camera parameters
        this.camera = {
            position: [0, 0, 8],
            target: [0, 0, 0],
            fov: 45
        };
        
        // Lighting parameters
        this.lighting = {
            lightPosition: [5, 5, 5],
            lightColor: [1.0, 1.0, 1.0],
            lightIntensity: 1.5,
            ambientColor: [0.1, 0.1, 0.2],
            ambientIntensity: 0.3,
            environmentColor: [0.2, 0.3, 0.5]
        };
        
        // Fractal animation state
        this.fractalState = {
            rotation: [0, 0, 0],
            morphing: 0,
            pulsePhase: 0
        };
    }

    /**
     * Get vertex shader source
     */
    getVertexShader() {
        return `
            attribute vec2 a_position;
            varying vec2 v_uv;
            varying vec3 v_rayDir;
            
            uniform vec2 u_resolution;
            uniform vec3 u_cameraPos;
            uniform vec3 u_cameraTarget;
            uniform float u_fov;
            
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                
                // Calculate ray direction for raytracing
                vec2 screenPos = a_position;
                float aspect = u_resolution.x / u_resolution.y;
                float fovRad = radians(u_fov);
                
                // Camera setup
                vec3 forward = normalize(u_cameraTarget - u_cameraPos);
                vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
                vec3 up = cross(right, forward);
                
                // Ray direction
                vec3 rayDir = normalize(
                    right * screenPos.x * tan(fovRad * 0.5) * aspect +
                    up * screenPos.y * tan(fovRad * 0.5) +
                    forward
                );
                
                v_rayDir = rayDir;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
    }

    /**
     * Get fragment shader source with advanced crystal fractal raytracing
     */
    getFragmentShader() {
        return `
            precision highp float;
            
            varying vec2 v_uv;
            varying vec3 v_rayDir;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec3 u_cameraPos;
            
            // Crystal parameters
            uniform int u_fractalIterations;
            uniform float u_fractalPower;
            uniform float u_crystalScale;
            uniform float u_refractionIndex;
            uniform float u_dispersionStrength;
            uniform int u_reflectionBounces;
            uniform float u_crystalRotationSpeed;
            uniform float u_growthAnimation;
            uniform float u_crystalComplexity;
            
            // Lighting parameters
            uniform vec3 u_lightPosition;
            uniform vec3 u_lightColor;
            uniform float u_lightIntensity;
            uniform vec3 u_ambientColor;
            uniform float u_ambientIntensity;
            uniform vec3 u_environmentColor;
            
            // Fractal animation
            uniform vec3 u_fractalRotation;
            uniform float u_morphing;
            uniform float u_pulsePhase;
            
            const int MAX_STEPS = 128;
            const float MIN_DISTANCE = 0.001;
            const float MAX_DISTANCE = 20.0;
            const float PI = 3.14159265359;
            const float TAU = 6.28318530718;
            
            // Rotation matrices
            mat3 rotateX(float angle) {
                float c = cos(angle);
                float s = sin(angle);
                return mat3(
                    1.0, 0.0, 0.0,
                    0.0, c, -s,
                    0.0, s, c
                );
            }
            
            mat3 rotateY(float angle) {
                float c = cos(angle);
                float s = sin(angle);
                return mat3(
                    c, 0.0, s,
                    0.0, 1.0, 0.0,
                    -s, 0.0, c
                );
            }
            
            mat3 rotateZ(float angle) {
                float c = cos(angle);
                float s = sin(angle);
                return mat3(
                    c, -s, 0.0,
                    s, c, 0.0,
                    0.0, 0.0, 1.0
                );
            }
            
            // Complex number operations for fractals
            vec2 cmul(vec2 a, vec2 b) {
                return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
            }
            
            vec2 cdiv(vec2 a, vec2 b) {
                float denom = dot(b, b);
                return vec2(dot(a, b), a.y * b.x - a.x * b.y) / denom;
            }
            
            // Mandelbulb distance function
            float mandelbulbDE(vec3 pos) {
                vec3 z = pos;
                float dr = 1.0;
                float r = 0.0;
                
                for (int i = 0; i < MAX_STEPS && i < u_fractalIterations; i++) {
                    r = length(z);
                    if (r > 2.0) break;
                    
                    // Convert to polar coordinates
                    float theta = acos(z.z / r);
                    float phi = atan(z.y, z.x);
                    dr = pow(r, u_fractalPower - 1.0) * u_fractalPower * dr + 1.0;
                    
                    // Scale and rotate
                    float zr = pow(r, u_fractalPower);
                    theta = theta * u_fractalPower;
                    phi = phi * u_fractalPower;
                    
                    // Convert back to cartesian coordinates
                    z = zr * vec3(
                        sin(theta) * cos(phi),
                        sin(phi) * sin(theta),
                        cos(theta)
                    );
                    z += pos;
                }
                
                return 0.5 * log(r) * r / dr;
            }
            
            // Julia set distance function
            float juliaDE(vec3 pos) {
                vec2 z = pos.xy;
                vec2 c = vec2(-0.8, 0.156 + u_morphing * 0.1);
                float dr = 1.0;
                
                for (int i = 0; i < 32; i++) {
                    if (dot(z, z) > 4.0) break;
                    
                    // dz = 2 * z * dz + 1
                    dr = 2.0 * length(z) * dr + 1.0;
                    
                    // z = z^2 + c
                    z = cmul(z, z) + c;
                }
                
                float r = length(z);
                return 0.5 * log(r) * r / dr;
            }
            
            // Crystal geometry with multiple fractal components
            float crystalSDF(vec3 pos) {
                // Apply rotation animation
                mat3 rot = rotateX(u_fractalRotation.x) * 
                          rotateY(u_fractalRotation.y) * 
                          rotateZ(u_fractalRotation.z);
                vec3 p = rot * pos;
                
                // Scale based on growth animation
                p /= u_crystalScale * u_growthAnimation;
                
                // Combine multiple fractal types
                float d1 = mandelbulbDE(p);
                float d2 = juliaDE(p + vec3(sin(u_time * 0.5), 0, 0)) * 2.0;
                
                // Morphing between different shapes
                float crystal = mix(d1, d2, sin(u_morphing) * 0.5 + 0.5);
                
                // Add crystal facets using octahedral symmetry
                vec3 fp = abs(p);
                float octahedron = (fp.x + fp.y + fp.z - 1.0) * 0.5;
                
                // Blend fractal with geometric crystal shape
                crystal = max(crystal, octahedron);
                
                // Add surface detail with noise
                float noise = sin(p.x * 10.0) * sin(p.y * 10.0) * sin(p.z * 10.0) * 0.02;
                crystal += noise * u_crystalComplexity;
                
                return crystal * u_crystalScale * u_growthAnimation;
            }
            
            // Calculate normal using gradient
            vec3 getNormal(vec3 pos) {
                float eps = MIN_DISTANCE;
                vec3 normal = vec3(
                    crystalSDF(pos + vec3(eps, 0.0, 0.0)) - crystalSDF(pos - vec3(eps, 0.0, 0.0)),
                    crystalSDF(pos + vec3(0.0, eps, 0.0)) - crystalSDF(pos - vec3(0.0, eps, 0.0)),
                    crystalSDF(pos + vec3(0.0, 0.0, eps)) - crystalSDF(pos - vec3(0.0, 0.0, eps))
                );
                return normalize(normal);
            }
            
            // Raymarching
            float raymarch(vec3 rayPos, vec3 rayDir) {
                float t = 0.0;
                
                for (int i = 0; i < MAX_STEPS; i++) {
                    vec3 pos = rayPos + rayDir * t;
                    float dist = crystalSDF(pos);
                    
                    if (dist < MIN_DISTANCE) {
                        return t;
                    }
                    
                    if (t > MAX_DISTANCE) {
                        break;
                    }
                    
                    t += dist * 0.8; // Conservative step size for accuracy
                }
                
                return -1.0;
            }
            
            // Fresnel reflection calculation
            float fresnel(vec3 incident, vec3 normal, float ior) {
                float cosI = -dot(incident, normal);
                float sinT2 = ior * ior * (1.0 - cosI * cosI);
                
                if (sinT2 > 1.0) return 1.0; // Total internal reflection
                
                float cosT = sqrt(1.0 - sinT2);
                float rs = (ior * cosI - cosT) / (ior * cosI + cosT);
                float rp = (cosI - ior * cosT) / (cosI + ior * cosT);
                
                return (rs * rs + rp * rp) * 0.5;
            }
            
            // Calculate refracted ray
            vec3 refract(vec3 incident, vec3 normal, float ior) {
                float cosI = -dot(incident, normal);
                float sinT2 = ior * ior * (1.0 - cosI * cosI);
                
                if (sinT2 > 1.0) {
                    return reflect(incident, normal); // Total internal reflection
                }
                
                float cosT = sqrt(1.0 - sinT2);
                return ior * incident + (ior * cosI - cosT) * normal;
            }
            
            // Environment mapping for reflections
            vec3 getEnvironmentColor(vec3 rayDir) {
                // Simple procedural environment
                float y = rayDir.y * 0.5 + 0.5;
                vec3 horizon = vec3(0.7, 0.9, 1.0);
                vec3 zenith = vec3(0.2, 0.4, 0.8);
                
                vec3 envColor = mix(horizon, zenith, y);
                
                // Add some stars
                float stars = smoothstep(0.95, 1.0, 
                    sin(rayDir.x * 100.0) * sin(rayDir.y * 100.0) * sin(rayDir.z * 100.0));
                envColor += vec3(stars) * 0.5;
                
                return envColor * u_environmentColor;
            }
            
            // Chromatic dispersion effect
            vec3 getDispersedColor(vec3 rayPos, vec3 rayDir, vec3 normal, int bounces) {
                vec3 color = vec3(0.0);
                
                // Sample multiple wavelengths for dispersion
                float wavelengths[3];
                wavelengths[0] = 650.0; // Red
                wavelengths[1] = 550.0; // Green
                wavelengths[2] = 450.0; // Blue
                
                for (int i = 0; i < 3; i++) {
                    // Wavelength-dependent refractive index
                    float ior = u_refractionIndex + u_dispersionStrength * (550.0 - wavelengths[i]) / 200.0;
                    
                    vec3 refractedDir = refract(rayDir, normal, ior);
                    
                    // Trace refracted ray
                    float t = raymarch(rayPos + normal * MIN_DISTANCE * 2.0, refractedDir);
                    
                    if (t > 0.0) {
                        vec3 hitPos = rayPos + normal * MIN_DISTANCE * 2.0 + refractedDir * t;
                        vec3 hitNormal = getNormal(hitPos);
                        
                        // Exit the crystal
                        vec3 exitDir = refract(refractedDir, -hitNormal, 1.0 / ior);
                        vec3 exitColor = getEnvironmentColor(exitDir);
                        
                        // Apply Beer's law for absorption
                        float absorption = exp(-t * 0.1);
                        
                        if (i == 0) color.r += exitColor.r * absorption;
                        else if (i == 1) color.g += exitColor.g * absorption;
                        else color.b += exitColor.b * absorption;
                    } else {
                        // Ray didn't hit anything, use environment
                        vec3 envColor = getEnvironmentColor(refractedDir);
                        if (i == 0) color.r += envColor.r;
                        else if (i == 1) color.g += envColor.g;
                        else color.b += envColor.b;
                    }
                }
                
                return color;
            }
            
            // Main lighting calculation
            vec3 calculateLighting(vec3 pos, vec3 normal, vec3 viewDir) {
                vec3 lightDir = normalize(u_lightPosition - pos);
                float NdotL = max(0.0, dot(normal, lightDir));
                
                // Diffuse lighting
                vec3 diffuse = u_lightColor * u_lightIntensity * NdotL;
                
                // Specular lighting (Blinn-Phong)
                vec3 halfDir = normalize(lightDir + viewDir);
                float NdotH = max(0.0, dot(normal, halfDir));
                float specular = pow(NdotH, 64.0);
                vec3 specularColor = u_lightColor * specular * 0.8;
                
                // Ambient lighting
                vec3 ambient = u_ambientColor * u_ambientIntensity;
                
                return diffuse + specularColor + ambient;
            }
            
            void main() {
                vec3 rayPos = u_cameraPos;
                vec3 rayDir = normalize(v_rayDir);
                
                // Initial ray intersection
                float t = raymarch(rayPos, rayDir);
                
                if (t > 0.0) {
                    vec3 hitPos = rayPos + rayDir * t;
                    vec3 normal = getNormal(hitPos);
                    
                    // Calculate Fresnel reflection
                    float fresnelFactor = fresnel(rayDir, normal, u_refractionIndex);
                    
                    // Reflection component
                    vec3 reflectedDir = reflect(rayDir, normal);
                    vec3 reflectionColor = getEnvironmentColor(reflectedDir);
                    
                    // Enhanced reflection for crystal surfaces
                    reflectionColor *= 1.5;
                    
                    // Refraction component with chromatic dispersion
                    vec3 refractionColor = getDispersedColor(hitPos, rayDir, normal, u_reflectionBounces);
                    
                    // Base crystal color with internal lighting
                    vec3 lighting = calculateLighting(hitPos, normal, -rayDir);
                    vec3 crystalColor = vec3(0.9, 0.95, 1.0) * lighting;
                    
                    // Internal caustics effect
                    float caustics = sin(hitPos.x * 20.0 + u_time) * 
                                   sin(hitPos.y * 15.0 + u_time * 1.2) * 
                                   sin(hitPos.z * 18.0 + u_time * 0.8);
                    caustics = max(0.0, caustics) * 0.3;
                    
                    // Combine reflection and refraction
                    vec3 finalColor = mix(refractionColor, reflectionColor, fresnelFactor);
                    finalColor += crystalColor * 0.3;
                    finalColor += vec3(caustics) * u_lightColor;
                    
                    // Add subtle rainbow dispersion on edges
                    float edgeFactor = 1.0 - abs(dot(normal, -rayDir));
                    vec3 rainbowColor = vec3(
                        sin(edgeFactor * PI + u_time),
                        sin(edgeFactor * PI + u_time + 2.0),
                        sin(edgeFactor * PI + u_time + 4.0)
                    ) * 0.5 + 0.5;
                    
                    finalColor += rainbowColor * edgeFactor * edgeFactor * 0.2;
                    
                    // Enhance brightness for crystal effect
                    finalColor *= 1.2;
                    
                    // Tone mapping
                    finalColor = finalColor / (finalColor + vec3(1.0));
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                } else {
                    // Render environment
                    vec3 envColor = getEnvironmentColor(rayDir);
                    gl_FragColor = vec4(envColor, 1.0);
                }
            }
        `;
    }

    /**
     * Update shader uniforms with crystal-specific parameters
     */
    updateUniforms() {
        super.updateUniforms();
        
        const gl = this.gl;
        if (!this.program) return;
        
        gl.useProgram(this.program);
        
        // Camera uniforms
        let location = gl.getUniformLocation(this.program, 'u_cameraPos');
        if (location) gl.uniform3fv(location, this.camera.position);
        
        location = gl.getUniformLocation(this.program, 'u_cameraTarget');
        if (location) gl.uniform3fv(location, this.camera.target);
        
        location = gl.getUniformLocation(this.program, 'u_fov');
        if (location) gl.uniform1f(location, this.camera.fov);
        
        // Crystal parameter uniforms
        location = gl.getUniformLocation(this.program, 'u_fractalIterations');
        if (location) gl.uniform1i(location, this.crystalParams.fractalIterations);
        
        location = gl.getUniformLocation(this.program, 'u_fractalPower');
        if (location) gl.uniform1f(location, this.crystalParams.fractalPower);
        
        location = gl.getUniformLocation(this.program, 'u_crystalScale');
        if (location) gl.uniform1f(location, this.crystalParams.crystalScale);
        
        location = gl.getUniformLocation(this.program, 'u_refractionIndex');
        if (location) gl.uniform1f(location, this.crystalParams.refractionIndex);
        
        location = gl.getUniformLocation(this.program, 'u_dispersionStrength');
        if (location) gl.uniform1f(location, this.crystalParams.dispersionStrength);
        
        location = gl.getUniformLocation(this.program, 'u_reflectionBounces');
        if (location) gl.uniform1i(location, this.crystalParams.reflectionBounces);
        
        location = gl.getUniformLocation(this.program, 'u_crystalRotationSpeed');
        if (location) gl.uniform1f(location, this.crystalParams.crystalRotationSpeed);
        
        location = gl.getUniformLocation(this.program, 'u_growthAnimation');
        if (location) gl.uniform1f(location, this.crystalParams.growthAnimation);
        
        location = gl.getUniformLocation(this.program, 'u_crystalComplexity');
        if (location) gl.uniform1f(location, this.crystalParams.crystalComplexity);
        
        // Lighting uniforms
        location = gl.getUniformLocation(this.program, 'u_lightPosition');
        if (location) gl.uniform3fv(location, this.lighting.lightPosition);
        
        location = gl.getUniformLocation(this.program, 'u_lightColor');
        if (location) gl.uniform3fv(location, this.lighting.lightColor);
        
        location = gl.getUniformLocation(this.program, 'u_lightIntensity');
        if (location) gl.uniform1f(location, this.lighting.lightIntensity);
        
        location = gl.getUniformLocation(this.program, 'u_ambientColor');
        if (location) gl.uniform3fv(location, this.lighting.ambientColor);
        
        location = gl.getUniformLocation(this.program, 'u_ambientIntensity');
        if (location) gl.uniform1f(location, this.lighting.ambientIntensity);
        
        location = gl.getUniformLocation(this.program, 'u_environmentColor');
        if (location) gl.uniform3fv(location, this.lighting.environmentColor);
        
        // Fractal animation uniforms
        location = gl.getUniformLocation(this.program, 'u_fractalRotation');
        if (location) gl.uniform3fv(location, this.fractalState.rotation);
        
        location = gl.getUniformLocation(this.program, 'u_morphing');
        if (location) gl.uniform1f(location, this.fractalState.morphing);
        
        location = gl.getUniformLocation(this.program, 'u_pulsePhase');
        if (location) gl.uniform1f(location, this.fractalState.pulsePhase);
    }

    /**
     * Render crystal simulation
     */
    render() {
        // Update crystal animation
        this.updateCrystalAnimation();
        
        // Update camera animation
        this.updateCamera();
        
        // Update lighting
        this.updateLighting();
        
        // Call parent render method
        super.render();
        
        // Update ray count for crystal simulation
        const steps = Math.min(128, this.quality.raySteps);
        const iterations = this.crystalParams.fractalIterations;
        const bounces = this.crystalParams.reflectionBounces;
        this.rayCount = this.canvas.width * this.canvas.height * steps * iterations * bounces;
    }

    /**
     * Update crystal fractal animation
     */
    updateCrystalAnimation() {
        const time = this.currentTime;
        const speed = this.crystalParams.crystalRotationSpeed;
        
        // Rotate the crystal on multiple axes
        this.fractalState.rotation[0] = time * speed * 0.7;
        this.fractalState.rotation[1] = time * speed * 0.5;
        this.fractalState.rotation[2] = time * speed * 0.3;
        
        // Morphing between different fractal parameters
        this.fractalState.morphing = Math.sin(time * 0.2) * 2.0;
        
        // Pulsing effect for growth animation
        this.fractalState.pulsePhase = time * 1.5;
        this.crystalParams.growthAnimation = 0.8 + Math.sin(this.fractalState.pulsePhase) * 0.2;
        
        // Animate fractal power for shape morphing
        this.crystalParams.fractalPower = 8.0 + Math.sin(time * 0.1) * 2.0;
        
        // Animate crystal complexity
        this.crystalParams.crystalComplexity = 0.8 + Math.sin(time * 0.15) * 0.2;
    }

    /**
     * Update camera animation
     */
    updateCamera() {
        const time = this.currentTime;
        
        // Orbit camera around the crystal
        const radius = 8.0;
        const height = Math.sin(time * 0.2) * 2.0;
        const angle = time * 0.1;
        
        this.camera.position[0] = Math.cos(angle) * radius;
        this.camera.position[1] = height;
        this.camera.position[2] = Math.sin(angle) * radius;
        
        // Always look at the center
        this.camera.target = [0, 0, 0];
        
        // Animate field of view for dramatic effect
        this.camera.fov = 45 + Math.sin(time * 0.3) * 5;
    }

    /**
     * Update dynamic lighting
     */
    updateLighting() {
        const time = this.currentTime;
        
        // Animate light position in a complex pattern
        this.lighting.lightPosition[0] = Math.cos(time * 0.3) * 8 + Math.sin(time * 0.7) * 3;
        this.lighting.lightPosition[1] = 5 + Math.sin(time * 0.4) * 3;
        this.lighting.lightPosition[2] = Math.sin(time * 0.3) * 8 + Math.cos(time * 0.5) * 3;
        
        // Animate light intensity
        this.lighting.lightIntensity = 1.5 + Math.sin(time * 0.8) * 0.3;
        
        // Color cycling for dramatic effect
        const hue = time * 0.1;
        this.lighting.lightColor[0] = 0.8 + Math.sin(hue) * 0.2;
        this.lighting.lightColor[1] = 0.8 + Math.sin(hue + 2.0) * 0.2;
        this.lighting.lightColor[2] = 0.8 + Math.sin(hue + 4.0) * 0.2;
        
        // Animate ambient lighting
        this.lighting.ambientIntensity = 0.3 + Math.sin(time * 0.2) * 0.1;
        
        // Environment color shifts
        this.lighting.environmentColor[0] = 0.2 + Math.sin(time * 0.05) * 0.1;
        this.lighting.environmentColor[1] = 0.3 + Math.sin(time * 0.07 + 1.0) * 0.1;
        this.lighting.environmentColor[2] = 0.5 + Math.sin(time * 0.09 + 2.0) * 0.1;
    }

    /**
     * Adjust quality for crystal simulation
     */
    adjustQuality() {
        super.adjustQuality();
        
        // Crystal-specific quality adjustments
        const performance = this.performanceMonitor.getPerformanceLevel();
        
        switch (performance) {
            case 'poor':
                this.crystalParams.fractalIterations = 4;
                this.crystalParams.reflectionBounces = 1;
                this.crystalParams.dispersionStrength = 0.05;
                break;
                
            case 'fair':
                this.crystalParams.fractalIterations = 6;
                this.crystalParams.reflectionBounces = 2;
                this.crystalParams.dispersionStrength = 0.1;
                break;
                
            case 'good':
                this.crystalParams.fractalIterations = 8;
                this.crystalParams.reflectionBounces = 3;
                this.crystalParams.dispersionStrength = 0.15;
                break;
                
            case 'excellent':
                this.crystalParams.fractalIterations = 12;
                this.crystalParams.reflectionBounces = 4;
                this.crystalParams.dispersionStrength = 0.2;
                break;
        }
    }

    /**
     * Get crystal simulation specific statistics
     */
    getStats() {
        const baseStats = super.getStats();
        
        return {
            ...baseStats,
            crystalParams: { ...this.crystalParams },
            camera: { ...this.camera },
            lighting: { ...this.lighting },
            fractalState: { ...this.fractalState },
            estimatedFractals: this.crystalParams.fractalIterations
        };
    }

    /**
     * Handle interactive controls (for future enhancement)
     */
    setInteractiveMode(enabled) {
        this.interactiveMode = enabled;
        if (enabled) {
            console.log('Crystal interactive mode enabled');
            // Could add mouse controls for crystal rotation, etc.
        }
    }

    /**
     * Export crystal parameters for saving/loading
     */
    exportParameters() {
        return {
            crystalParams: { ...this.crystalParams },
            lighting: { ...this.lighting },
            camera: { ...this.camera }
        };
    }

    /**
     * Import crystal parameters
     */
    importParameters(params) {
        if (params.crystalParams) {
            this.crystalParams = { ...this.crystalParams, ...params.crystalParams };
        }
        if (params.lighting) {
            this.lighting = { ...this.lighting, ...params.lighting };
        }
        if (params.camera) {
            this.camera = { ...this.camera, ...params.camera };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrystalSimulation;
}