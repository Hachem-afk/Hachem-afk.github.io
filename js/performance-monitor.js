/**
 * Performance monitoring system for raytracing applications
 */
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.averageFPS = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.frameHistory = [];
        this.maxHistoryLength = 60; // Track last 60 frames
        
        this.rayCount = 0;
        this.triangleCount = 0;
        this.memoryUsage = { used: 0, total: 0 };
        
        this.isMonitoring = false;
        this.onUpdate = null; // Callback for performance updates
    }

    /**
     * Start monitoring performance
     */
    start() {
        this.isMonitoring = true;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.frameHistory = [];
        console.log('Performance monitoring started');
    }

    /**
     * Stop monitoring performance
     */
    stop() {
        this.isMonitoring = false;
        console.log('Performance monitoring stopped');
    }

    /**
     * Update performance metrics
     * Should be called once per frame
     */
    update() {
        if (!this.isMonitoring) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        this.frameCount++;
        
        // Calculate current FPS
        this.fps = Utils.calculateFPS(deltaTime);
        
        // Update frame history
        this.frameHistory.push(this.fps);
        if (this.frameHistory.length > this.maxHistoryLength) {
            this.frameHistory.shift();
        }
        
        // Calculate statistics
        this.updateStatistics();
        
        // Update memory usage if available
        this.updateMemoryUsage();
        
        // Call update callback if provided
        if (this.onUpdate) {
            this.onUpdate(this.getMetrics());
        }
        
        this.lastTime = currentTime;
    }

    /**
     * Update FPS statistics
     */
    updateStatistics() {
        if (this.frameHistory.length === 0) return;
        
        // Calculate average FPS
        const sum = this.frameHistory.reduce((a, b) => a + b, 0);
        this.averageFPS = Math.round(sum / this.frameHistory.length);
        
        // Update min/max FPS
        this.minFPS = Math.min(this.minFPS, this.fps);
        this.maxFPS = Math.max(this.maxFPS, this.fps);
    }

    /**
     * Update memory usage information
     */
    updateMemoryUsage() {
        const memInfo = Utils.getMemoryUsage();
        if (memInfo) {
            this.memoryUsage = memInfo;
        }
    }

    /**
     * Set ray count for current frame
     * @param {number} count - Number of rays traced
     */
    setRayCount(count) {
        this.rayCount = count;
    }

    /**
     * Set triangle count for current frame
     * @param {number} count - Number of triangles processed
     */
    setTriangleCount(count) {
        this.triangleCount = count;
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance metrics object
     */
    getMetrics() {
        return {
            fps: this.fps,
            averageFPS: this.averageFPS,
            minFPS: this.minFPS === Infinity ? 0 : this.minFPS,
            maxFPS: this.maxFPS,
            frameCount: this.frameCount,
            rayCount: this.rayCount,
            triangleCount: this.triangleCount,
            memoryUsage: this.memoryUsage
        };
    }

    /**
     * Get formatted performance string for display
     * @param {string} type - Type of display ('simple' or 'detailed')
     * @returns {string} Formatted performance string
     */
    getDisplayString(type = 'simple') {
        const metrics = this.getMetrics();
        
        switch (type) {
            case 'simple':
                return `FPS: ${metrics.fps} | Rayons: ${Utils.formatNumber(metrics.rayCount)}`;
                
            case 'detailed':
                return `FPS: ${metrics.fps} (avg: ${metrics.averageFPS}, min: ${metrics.minFPS}, max: ${metrics.maxFPS}) | ` +
                       `Rayons: ${Utils.formatNumber(metrics.rayCount)} | ` +
                       `Triangles: ${Utils.formatNumber(metrics.triangleCount)} | ` +
                       `Mémoire: ${metrics.memoryUsage.used}MB`;
                       
            case 'fps-only':
                return `FPS: ${metrics.fps}`;
                
            case 'rays-only':
                return `Rayons: ${Utils.formatNumber(metrics.rayCount)}`;
                
            default:
                return this.getDisplayString('simple');
        }
    }

    /**
     * Check if performance is poor
     * @returns {boolean} True if performance is below acceptable threshold
     */
    isPoorPerformance() {
        return this.averageFPS < 30 && this.frameHistory.length > 30;
    }

    /**
     * Get performance level
     * @returns {string} Performance level ('excellent', 'good', 'fair', 'poor')
     */
    getPerformanceLevel() {
        if (this.averageFPS >= 55) return 'excellent';
        if (this.averageFPS >= 45) return 'good';
        if (this.averageFPS >= 30) return 'fair';
        return 'poor';
    }

    /**
     * Get suggested quality settings based on performance
     * @returns {Object} Suggested quality settings
     */
    getSuggestedQuality() {
        const level = this.getPerformanceLevel();
        
        switch (level) {
            case 'excellent':
                return {
                    resolutionScale: 1.0,
                    raySteps: 50,
                    shadowQuality: 'high',
                    reflectionBounces: 3
                };
                
            case 'good':
                return {
                    resolutionScale: 0.8,
                    raySteps: 35,
                    shadowQuality: 'medium',
                    reflectionBounces: 2
                };
                
            case 'fair':
                return {
                    resolutionScale: 0.6,
                    raySteps: 25,
                    shadowQuality: 'low',
                    reflectionBounces: 1
                };
                
            case 'poor':
                return {
                    resolutionScale: 0.4,
                    raySteps: 15,
                    shadowQuality: 'off',
                    reflectionBounces: 0
                };
                
            default:
                return this.getSuggestedQuality();
        }
    }

    /**
     * Reset all performance statistics
     */
    reset() {
        this.frameCount = 0;
        this.fps = 0;
        this.averageFPS = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.frameHistory = [];
        this.rayCount = 0;
        this.triangleCount = 0;
        this.lastTime = performance.now();
    }

    /**
     * Export performance data for analysis
     * @returns {Object} Performance data object
     */
    exportData() {
        return {
            timestamp: Date.now(),
            sessionDuration: performance.now() - this.lastTime,
            metrics: this.getMetrics(),
            frameHistory: [...this.frameHistory],
            performanceLevel: this.getPerformanceLevel(),
            suggestedQuality: this.getSuggestedQuality()
        };
    }

    /**
     * Log performance summary to console
     */
    logSummary() {
        const metrics = this.getMetrics();
        const level = this.getPerformanceLevel();
        
        console.group('Performance Summary');
        console.log(`Performance Level: ${level}`);
        console.log(`Current FPS: ${metrics.fps}`);
        console.log(`Average FPS: ${metrics.averageFPS}`);
        console.log(`FPS Range: ${metrics.minFPS} - ${metrics.maxFPS}`);
        console.log(`Total Frames: ${metrics.frameCount}`);
        console.log(`Rays per Frame: ${Utils.formatNumber(metrics.rayCount)}`);
        console.log(`Memory Usage: ${metrics.memoryUsage.used}MB / ${metrics.memoryUsage.total}MB`);
        console.groupEnd();
    }

    /**
     * Set callback for performance updates
     * @param {Function} callback - Function to call on performance update
     */
    setUpdateCallback(callback) {
        this.onUpdate = callback;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}