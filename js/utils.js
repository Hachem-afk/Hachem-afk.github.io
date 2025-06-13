/**
 * Utility functions for the raytracing portfolio
 */
class Utils {
    /**
     * Check if WebGL is supported
     * @returns {boolean} True if WebGL is supported
     */
    static checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!(gl && gl instanceof WebGLRenderingContext);
        } catch (e) {
            return false;
        }
    }

    /**
     * Get WebGL context with error handling
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {WebGLRenderingContext|null} WebGL context or null
     */
    static getWebGLContext(canvas) {
        try {
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                throw new Error('WebGL context could not be created');
            }

            // Enable necessary extensions
            const extensions = [
                'OES_texture_float',
                'OES_texture_float_linear',
                'WEBGL_depth_texture'
            ];

            extensions.forEach(ext => {
                const extension = gl.getExtension(ext);
                if (!extension) {
                    console.warn(`WebGL extension ${ext} not supported`);
                }
            });

            return gl;
        } catch (error) {
            console.error('WebGL context creation failed:', error);
            return null;
        }
    }

    /**
     * Create and compile a shader
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
     * @param {string} source - Shader source code
     * @returns {WebGLShader|null} Compiled shader or null
     */
    static createShader(gl, type, source) {
        try {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const error = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(`Shader compilation failed: ${error}`);
            }

            return shader;
        } catch (error) {
            console.error('Shader creation failed:', error);
            return null;
        }
    }

    /**
     * Create and link a shader program
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {string} vertexSource - Vertex shader source
     * @param {string} fragmentSource - Fragment shader source
     * @returns {WebGLProgram|null} Linked program or null
     */
    static createProgram(gl, vertexSource, fragmentSource) {
        try {
            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexSource);
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

            if (!vertexShader || !fragmentShader) {
                return null;
            }

            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const error = gl.getProgramInfoLog(program);
                gl.deleteProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                throw new Error(`Program linking failed: ${error}`);
            }

            // Clean up shaders after linking
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            return program;
        } catch (error) {
            console.error('Program creation failed:', error);
            return null;
        }
    }

    /**
     * Create a texture from image data
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {number} width - Texture width
     * @param {number} height - Texture height
     * @param {ArrayBufferView} data - Texture data
     * @param {number} format - Texture format (default: gl.RGBA)
     * @param {number} type - Data type (default: gl.UNSIGNED_BYTE)
     * @returns {WebGLTexture|null} Created texture or null
     */
    static createTexture(gl, width, height, data = null, format = null, type = null) {
        try {
            format = format || gl.RGBA;
            type = type || gl.UNSIGNED_BYTE;

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);

            // Set texture parameters
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.bindTexture(gl.TEXTURE_2D, null);

            return texture;
        } catch (error) {
            console.error('Texture creation failed:', error);
            return null;
        }
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Smooth step function
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smooth step result
     */
    static smoothstep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    }

    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random value
     */
    static random(min = 0, max = 1) {
        return min + Math.random() * (max - min);
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Check if device is mobile
     * @returns {boolean} True if mobile device
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Get device pixel ratio for high DPI displays
     * @returns {number} Device pixel ratio
     */
    static getPixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * Resize canvas to match display size
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {number} maxPixelRatio - Maximum pixel ratio to use
     */
    static resizeCanvas(canvas, maxPixelRatio = 2) {
        const pixelRatio = Math.min(this.getPixelRatio(), maxPixelRatio);
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        const width = Math.floor(displayWidth * pixelRatio);
        const height = Math.floor(displayHeight * pixelRatio);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
    }

    /**
     * Create a frame buffer object
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @returns {Object|null} Frame buffer object with texture and framebuffer
     */
    static createFrameBuffer(gl, width, height) {
        try {
            const texture = this.createTexture(gl, width, height);
            if (!texture) return null;

            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error(`Framebuffer incomplete: ${status}`);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            return { framebuffer, texture };
        } catch (error) {
            console.error('Framebuffer creation failed:', error);
            return null;
        }
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Format number with suffix (K, M, B)
     * @param {number} num - Number to format
     * @returns {string} Formatted number string
     */
    static formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Calculate FPS from frame time
     * @param {number} deltaTime - Frame time in milliseconds
     * @returns {number} FPS value
     */
    static calculateFPS(deltaTime) {
        return Math.round(1000 / deltaTime);
    }

    /**
     * Memory usage information (if available)
     * @returns {Object} Memory usage object
     */
    static getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}