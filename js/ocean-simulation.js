/**
 * Ocean Raytracing Simulation
 * Advanced ocean surface rendering with volumetric effects and caustics
 */
class OceanSimulation extends RaytracingEngine {
    constructor() {
        super();
        
        // Ocean-specific parameters
        this.oceanParams = {
            waveHeight: 0.8,
            waveFrequency: 0.5,
            waveSpeed: 1.2,
            foamAmount: 0.3,
            transparency: 0.7,
            refractionIndex: 1.33,
            causticsIntensity: 0.8,
            volumetricDensity: 0.4
        };
        
        // Camera parameters
        this.camera = {
            position: [0, 5, 10],
            target: [0, 0, 0],
            fov: 60
        };
        
        // Light parameters
        this.lighting = {
            sunDirection: [-0.3, -0.8, -0.5],
            sunColor: [1.0, 1.0, 1.0],
            sunIntensity: 1.0,
            skyColor: [0.4, 0.7, 1.0],
            oceanDeepColor: [0.02, 0.1, 0.3],
            oceanShallowColor: [0.1, 0.4, 0.7]
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
     * Get fragment shader source
     */
    getFragmentShader() {
        return `
            precision highp float;
            
            varying vec2 v_uv;
            varying vec3 v_rayDir;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec3 u_cameraPos;
            
            // Ocean parameters
            uniform float u_waveHeight;
            uniform float u_waveFrequency;
            uniform float u_waveSpeed;
            uniform float u_foamAmount;
            uniform float u_transparency;
            uniform float u_refractionIndex;
            uniform float u_causticsIntensity;
            uniform float u_volumetricDensity;
            
            // Lighting parameters
            uniform vec3 u_sunDirection;
            uniform vec3 u_sunColor;
            uniform float u_sunIntensity;
            uniform vec3 u_skyColor;
            uniform vec3 u_oceanDeepColor;
            uniform vec3 u_oceanShallowColor;
            
            const int MAX_STEPS = 64;
            const float MIN_DISTANCE = 0.001;
            const float MAX_DISTANCE = 100.0;
            const float PI = 3.14159265359;
            
            // Noise functions
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for (int i = 0; i < 4; i++) {
                    value += amplitude * noise(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                
                return value;
            }
            
            // Ocean height function
            float getOceanHeight(vec2 pos) {
                vec2 wavePos = pos * u_waveFrequency + u_time * u_waveSpeed;
                
                float height = 0.0;
                
                // Primary waves
                height += sin(wavePos.x * 2.0 + u_time * 1.5) * 0.4;
                height += sin(wavePos.y * 1.5 + u_time * 1.2) * 0.3;
                height += sin((wavePos.x + wavePos.y) * 1.0 + u_time * 0.8) * 0.2;
                
                // Secondary waves using noise
                height += fbm(wavePos * 2.0) * 0.3;
                height += fbm(wavePos * 4.0) * 0.15;
                
                return height * u_waveHeight;
            }
            
            // Calculate ocean normal
            vec3 getOceanNormal(vec2 pos) {
                float eps = 0.01;
                float h0 = getOceanHeight(pos);
                float hx = getOceanHeight(pos + vec2(eps, 0.0));
                float hy = getOceanHeight(pos + vec2(0.0, eps));
                
                vec3 normal = normalize(vec3(h0 - hx, eps, h0 - hy));
                return normal;
            }
            
            // Ray-ocean intersection
            float intersectOcean(vec3 rayPos, vec3 rayDir) {
                float t = 0.0;
                
                for (int i = 0; i < MAX_STEPS; i++) {
                    vec3 pos = rayPos + rayDir * t;
                    float oceanHeight = getOceanHeight(pos.xz);
                    float height = pos.y - oceanHeight;
                    
                    if (height < MIN_DISTANCE) {
                        return t;
                    }
                    
                    if (t > MAX_DISTANCE) {
                        break;
                    }
                    
                    t += max(height * 0.5, MIN_DISTANCE);
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
            
            // Sky color calculation
            vec3 getSkyColor(vec3 rayDir) {
                float sunDot = max(0.0, dot(rayDir, -u_sunDirection));
                vec3 color = u_skyColor;
                
                // Sun disc - pure white
                color += vec3(1.0) * pow(sunDot, 512.0) * 3.0;
                
                // Sun glow - slight blue tint
                color += vec3(1.0, 1.0, 1.1) * pow(sunDot, 64.0) * 0.8;
                
                // Horizon gradient - more realistic blue
                float horizon = abs(rayDir.y);
                vec3 horizonColor = vec3(0.8, 0.9, 1.0);
                color = mix(horizonColor, color, pow(horizon, 0.3));
                
                return color;
            }
            
            // Caustics calculation
            float getCaustics(vec3 pos, vec3 normal) {
                vec2 causticsPos = pos.xz * 3.0 + u_time * 0.5;
                
                // Multiple layers of caustics
                float caustics = 0.0;
                caustics += max(0.0, sin(causticsPos.x * 8.0) * cos(causticsPos.y * 6.0));
                caustics += max(0.0, sin((causticsPos.x + causticsPos.y) * 4.0)) * 0.5;
                caustics += fbm(causticsPos * 2.0) * 0.3;
                
                // Modulate by surface normal
                caustics *= max(0.0, dot(normal, -u_sunDirection));
                
                return caustics * u_causticsIntensity;
            }
            
            // Volumetric scattering in water
            vec3 getVolumetricScattering(vec3 rayPos, vec3 rayDir, float depth) {
                vec3 scattering = vec3(0.0);
                float stepSize = depth / 8.0;
                
                for (int i = 0; i < 8; i++) {
                    vec3 pos = rayPos + rayDir * (float(i) * stepSize);
                    float density = u_volumetricDensity * exp(-pos.y * 0.1);
                    
                    // Light scattering - pure white light
                    float sunScatter = max(0.0, dot(rayDir, -u_sunDirection));
                    vec3 scatter = vec3(1.0) * pow(sunScatter, 4.0) * density * stepSize;
                    
                    scattering += scatter;
                }
                
                return scattering * 0.1;
            }
            
            void main() {
                vec3 rayPos = u_cameraPos;
                vec3 rayDir = normalize(v_rayDir);
                
                // Intersect with ocean
                float t = intersectOcean(rayPos, rayDir);
                
                if (t > 0.0) {
                    vec3 hitPos = rayPos + rayDir * t;
                    vec3 normal = getOceanNormal(hitPos.xz);
                    
                    // Lighting calculations
                    vec3 lightDir = -u_sunDirection;
                    float NdotL = max(0.0, dot(normal, lightDir));
                    
                    // Ocean surface color
                    float depth = max(0.0, -hitPos.y);
                    vec3 waterColor = mix(u_oceanShallowColor, u_oceanDeepColor, 
                                         min(depth / 10.0, 1.0));
                    
                    // Fresnel reflection
                    float fresnelFactor = fresnel(rayDir, normal, u_refractionIndex);
                    vec3 reflectedDir = reflect(rayDir, normal);
                    vec3 skyReflection = getSkyColor(reflectedDir);
                    
                    // Caustics
                    float caustics = getCaustics(hitPos, normal);
                    
                    // Foam calculation
                    float foam = 0.0;
                    float waveGradient = length(vec2(
                        getOceanHeight(hitPos.xz + vec2(0.1, 0.0)) - getOceanHeight(hitPos.xz - vec2(0.1, 0.0)),
                        getOceanHeight(hitPos.xz + vec2(0.0, 0.1)) - getOceanHeight(hitPos.xz - vec2(0.0, 0.1))
                    ));
                    foam = smoothstep(0.5, 1.0, waveGradient) * u_foamAmount;
                    
                    // Combine lighting - more realistic water
                    vec3 diffuse = waterColor * vec3(1.0) * NdotL * u_sunIntensity;
                    vec3 ambient = waterColor * u_skyColor * 0.2;
                    vec3 reflection = skyReflection * fresnelFactor * 1.2;
                    
                    // Add caustics - pure white light
                    diffuse += vec3(1.0) * caustics * 0.3;
                    
                    // Add foam
                    vec3 foamColor = vec3(1.0) * foam;
                    
                    // Volumetric scattering
                    vec3 volumetric = getVolumetricScattering(rayPos, rayDir, t);
                    
                    // Final color composition
                    vec3 finalColor = diffuse + ambient + reflection + foamColor + volumetric;
                    
                    // Atmospheric perspective - use pure blue
                    float distance = t / MAX_DISTANCE;
                    vec3 atmosphericColor = vec3(0.4, 0.7, 1.0);
                    finalColor = mix(finalColor, atmosphericColor, distance * distance * 0.3);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                } else {
                    // Render sky
                    vec3 skyColor = getSkyColor(rayDir);
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            }
        `;
    }

    /**
     * Update shader uniforms with ocean-specific parameters
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
        
        // Ocean parameter uniforms
        location = gl.getUniformLocation(this.program, 'u_waveHeight');
        if (location) gl.uniform1f(location, this.oceanParams.waveHeight);
        
        location = gl.getUniformLocation(this.program, 'u_waveFrequency');
        if (location) gl.uniform1f(location, this.oceanParams.waveFrequency);
        
        location = gl.getUniformLocation(this.program, 'u_waveSpeed');
        if (location) gl.uniform1f(location, this.oceanParams.waveSpeed);
        
        location = gl.getUniformLocation(this.program, 'u_foamAmount');
        if (location) gl.uniform1f(location, this.oceanParams.foamAmount);
        
        location = gl.getUniformLocation(this.program, 'u_transparency');
        if (location) gl.uniform1f(location, this.oceanParams.transparency);
        
        location = gl.getUniformLocation(this.program, 'u_refractionIndex');
        if (location) gl.uniform1f(location, this.oceanParams.refractionIndex);
        
        location = gl.getUniformLocation(this.program, 'u_causticsIntensity');
        if (location) gl.uniform1f(location, this.oceanParams.causticsIntensity);
        
        location = gl.getUniformLocation(this.program, 'u_volumetricDensity');
        if (location) gl.uniform1f(location, this.oceanParams.volumetricDensity);
        
        // Lighting uniforms
        location = gl.getUniformLocation(this.program, 'u_sunDirection');
        if (location) gl.uniform3fv(location, this.lighting.sunDirection);
        
        location = gl.getUniformLocation(this.program, 'u_sunColor');
        if (location) gl.uniform3fv(location, this.lighting.sunColor);
        
        location = gl.getUniformLocation(this.program, 'u_sunIntensity');
        if (location) gl.uniform1f(location, this.lighting.sunIntensity);
        
        location = gl.getUniformLocation(this.program, 'u_skyColor');
        if (location) gl.uniform3fv(location, this.lighting.skyColor);
        
        location = gl.getUniformLocation(this.program, 'u_oceanDeepColor');
        if (location) gl.uniform3fv(location, this.lighting.oceanDeepColor);
        
        location = gl.getUniformLocation(this.program, 'u_oceanShallowColor');
        if (location) gl.uniform3fv(location, this.lighting.oceanShallowColor);
    }

    /**
     * Render ocean simulation
     */
    render() {
        // Update camera animation
        this.updateCamera();
        
        // Update lighting based on time
        this.updateLighting();
        
        // Call parent render method
        super.render();
        
        // Update ray count for ocean simulation
        const steps = Math.min(64, this.quality.raySteps);
        this.rayCount = this.canvas.width * this.canvas.height * steps;
    }

    /**
     * Update camera animation
     */
    updateCamera() {
        const time = this.currentTime;
        
        // Smooth camera movement
        this.camera.position[0] = Math.sin(time * 0.2) * 8;
        this.camera.position[1] = 5 + Math.sin(time * 0.3) * 2;
        this.camera.position[2] = 10 + Math.cos(time * 0.15) * 3;
        
        // Look at ocean surface
        this.camera.target[0] = Math.sin(time * 0.1) * 2;
        this.camera.target[1] = 0;
        this.camera.target[2] = Math.cos(time * 0.1) * 2;
    }

    /**
     * Update lighting based on time of day
     */
    updateLighting() {
        const time = this.currentTime;
        
        // Animate sun direction
        const sunAngle = time * 0.1;
        this.lighting.sunDirection[0] = Math.sin(sunAngle) * 0.6;
        this.lighting.sunDirection[1] = -0.8 + Math.cos(sunAngle) * 0.3;
        this.lighting.sunDirection[2] = -0.5;
        
        // Adjust sun intensity based on angle
        const sunHeight = this.lighting.sunDirection[1];
        this.lighting.sunIntensity = Utils.clamp(1.2 + sunHeight, 0.3, 1.5);
        
        // Time of day color variations
        const dayFactor = Utils.clamp(-sunHeight, 0, 1);
        
        // Sunset/sunrise colors
        const sunsetColor = [1.0, 0.6, 0.3];
        const dayColor = [1.0, 0.95, 0.8];
        
        this.lighting.sunColor[0] = Utils.lerp(dayColor[0], sunsetColor[0], dayFactor);
        this.lighting.sunColor[1] = Utils.lerp(dayColor[1], sunsetColor[1], dayFactor);
        this.lighting.sunColor[2] = Utils.lerp(dayColor[2], sunsetColor[2], dayFactor);
        
        // Sky color variations
        const daySky = [0.5, 0.7, 1.0];
        const sunsetSky = [1.0, 0.4, 0.2];
        
        this.lighting.skyColor[0] = Utils.lerp(daySky[0], sunsetSky[0], dayFactor);
        this.lighting.skyColor[1] = Utils.lerp(daySky[1], sunsetSky[1], dayFactor);
        this.lighting.skyColor[2] = Utils.lerp(daySky[2], sunsetSky[2], dayFactor);
    }

    /**
     * Adjust quality for ocean simulation
     */
    adjustQuality() {
        super.adjustQuality();
        
        // Ocean-specific quality adjustments
        const performance = this.performanceMonitor.getPerformanceLevel();
        
        switch (performance) {
            case 'poor':
                this.oceanParams.volumetricDensity = 0.2;
                this.oceanParams.causticsIntensity = 0.4;
                break;
                
            case 'fair':
                this.oceanParams.volumetricDensity = 0.3;
                this.oceanParams.causticsIntensity = 0.6;
                break;
                
            case 'good':
                this.oceanParams.volumetricDensity = 0.4;
                this.oceanParams.causticsIntensity = 0.8;
                break;
                
            case 'excellent':
                this.oceanParams.volumetricDensity = 0.5;
                this.oceanParams.causticsIntensity = 1.0;
                break;
        }
    }

    /**
     * Get ocean simulation specific statistics
     */
    getStats() {
        const baseStats = super.getStats();
        
        return {
            ...baseStats,
            oceanParams: { ...this.oceanParams },
            camera: { ...this.camera },
            lighting: { ...this.lighting }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OceanSimulation;
}