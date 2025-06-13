/**
 * Base raytracing engine for WebGL-based simulations
 */
class RaytracingEngine {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.performanceElement = null;
        this.isRunning = false;
        this.animationId = null;
        
        // Performance tracking
        this.performanceMonitor = new PerformanceMonitor();
        this.rayCount = 0;
        
        // Quality settings
        this.quality = {
            resolutionScale: 0.8,
            raySteps: 30,
            shadowQuality: 'medium',
            reflectionBounces: 2
        };
        
        // Time tracking
        this.startTime = 0;
        this.currentTime = 0;
        
        // WebGL resources
        this.resources = {
            buffers: [],
            textures: [],
            framebuffers: []
        };
    }

    /**
     * Initialize the raytracing engine
     * @param {string} canvasId - Canvas element ID
     * @param {string} perfId - Performance display element ID
     */
    init(canvasId, perfId) {
        try {
            this.canvas = document.getElementById(canvasId);
            this.performanceElement = document.getElementById(perfId);
            
            if (!this.canvas) {
                throw new Error(`Canvas element '${canvasId}' not found`);
            }

            // Get WebGL context
            this.gl = Utils.getWebGLContext(this.canvas);
            if (!this.gl) {
                throw new Error('Failed to get WebGL context');
            }

            // Initialize WebGL state
            this.initWebGL();
            
            // Create shader program
            this.createShaderProgram();
            
            // Initialize geometry
            this.initGeometry();
            
            // Set up performance monitoring
            this.setupPerformanceMonitoring();
            
            // Handle canvas resize
            this.setupResizeHandler();
            
            console.log(`${this.constructor.name} initialized successfully`);
            
        } catch (error) {
            console.error(`${this.constructor.name} initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Initialize WebGL state
     */
    initWebGL() {
        const gl = this.gl;
        
        // Set viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        // Set clear color
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        
        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    /**
     * Create shader program (to be overridden by subclasses)
     */
    createShaderProgram() {
        // Base implementation - should be overridden
        const vertexSource = this.getVertexShader();
        const fragmentSource = this.getFragmentShader();
        
        this.program = Utils.createProgram(this.gl, vertexSource, fragmentSource);
        
        if (!this.program) {
            throw new Error('Failed to create shader program');
        }
    }

    /**
     * Get vertex shader source (to be overridden by subclasses)
     * @returns {string} Vertex shader source code
     */
    getVertexShader() {
        return `
            attribute vec2 a_position;
            varying vec2 v_uv;
            
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
    }

    /**
     * Get fragment shader source (to be overridden by subclasses)
     * @returns {string} Fragment shader source code
     */
    getFragmentShader() {
        return `
            precision mediump float;
            varying vec2 v_uv;
            uniform float u_time;
            
            void main() {
                gl_FragColor = vec4(v_uv, sin(u_time), 1.0);
            }
        `;
    }

    /**
     * Initialize geometry (quad for screen-space rendering)
     */
    initGeometry() {
        const gl = this.gl;
        
        // Create full-screen quad
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        this.resources.buffers.push(buffer);
        
        // Set up vertex attributes
        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        this.performanceMonitor.setUpdateCallback((metrics) => {
            this.updatePerformanceDisplay(metrics);
        });
    }

    /**
     * Update performance display
     * @param {Object} metrics - Performance metrics
     */
    updatePerformanceDisplay(metrics) {
        if (this.performanceElement) {
            const displayString = this.performanceMonitor.getDisplayString('simple');
            this.performanceElement.textContent = displayString;
        }
    }

    /**
     * Setup canvas resize handler
     */
    setupResizeHandler() {
        const resizeHandler = Utils.debounce(() => {
            this.resize();
        }, 250);
        
        window.addEventListener('resize', resizeHandler);
    }

    /**
     * Resize canvas and update WebGL viewport
     */
    resize() {
        if (!this.canvas || !this.gl) return;
        
        Utils.resizeCanvas(this.canvas, 2);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Update any size-dependent uniforms
        this.updateUniforms();
    }

    /**
     * Update shader uniforms (to be overridden by subclasses)
     */
    updateUniforms() {
        const gl = this.gl;
        
        if (this.program) {
            gl.useProgram(this.program);
            
            // Update time
            const timeLocation = gl.getUniformLocation(this.program, 'u_time');
            if (timeLocation) {
                gl.uniform1f(timeLocation, this.currentTime);
            }
            
            // Update resolution
            const resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
            if (resolutionLocation) {
                gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
            }
        }
    }

    /**
     * Start the raytracing animation
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.performanceMonitor.start();
        
        this.animate();
        
        console.log(`${this.constructor.name} started`);
    }

    /**
     * Stop the raytracing animation
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.performanceMonitor.stop();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log(`${this.constructor.name} stopped`);
    }

    /**
     * Main animation loop
     */
    animate() {
        if (!this.isRunning) return;
        
        // Update time
        this.currentTime = (performance.now() - this.startTime) * 0.001;
        
        // Update performance monitor
        this.performanceMonitor.update();
        this.performanceMonitor.setRayCount(this.rayCount);
        
        // Render frame
        this.render();
        
        // Schedule next frame
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Render a frame (to be overridden by subclasses)
     */
    render() {
        const gl = this.gl;
        
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Use shader program
        gl.useProgram(this.program);
        
        // Update uniforms
        this.updateUniforms();
        
        // Draw full-screen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // Update ray count (basic estimation)
        this.rayCount = this.canvas.width * this.canvas.height;
    }

    /**
     * Adjust quality based on performance
     */
    adjustQuality() {
        const suggested = this.performanceMonitor.getSuggestedQuality();
        
        // Apply suggested quality settings
        this.quality = { ...this.quality, ...suggested };
        
        // Resize canvas if resolution scale changed
        if (suggested.resolutionScale !== this.quality.resolutionScale) {
            this.resize();
        }
        
        console.log('Quality adjusted:', this.quality);
    }

    /**
     * Get current quality settings
     * @returns {Object} Quality settings object
     */
    getQuality() {
        return { ...this.quality };
    }

    /**
     * Set quality settings
     * @param {Object} quality - Quality settings to apply
     */
    setQuality(quality) {
        this.quality = { ...this.quality, ...quality };
        this.updateUniforms();
    }

    /**
     * Clean up WebGL resources
     */
    cleanup() {
        if (!this.gl) return;
        
        // Stop animation
        this.stop();
        
        // Delete buffers
        this.resources.buffers.forEach(buffer => {
            this.gl.deleteBuffer(buffer);
        });
        
        // Delete textures
        this.resources.textures.forEach(texture => {
            this.gl.deleteTexture(texture);
        });
        
        // Delete framebuffers
        this.resources.framebuffers.forEach(fb => {
            this.gl.deleteFramebuffer(fb.framebuffer);
            this.gl.deleteTexture(fb.texture);
        });
        
        // Delete program
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
        
        // Clear resource arrays
        this.resources.buffers = [];
        this.resources.textures = [];
        this.resources.framebuffers = [];
        
        console.log(`${this.constructor.name} resources cleaned up`);
    }

    /**
     * Get engine statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            currentTime: this.currentTime,
            quality: this.getQuality(),
            performance: this.performanceMonitor.getMetrics(),
            resources: {
                buffers: this.resources.buffers.length,
                textures: this.resources.textures.length,
                framebuffers: this.resources.framebuffers.length
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RaytracingEngine;
}