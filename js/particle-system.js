/**
 * Advanced particle system for interactive background
 */
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.connections = [];
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Configuration
        this.config = {
            maxParticles: Utils.isMobile() ? 40 : 80,
            connectionDistance: 120,
            mouseInfluence: 150,
            baseSpeed: 0.5,
            maxSpeed: 2.0,
            particleSize: { min: 1, max: 3 },
            opacity: { min: 0.2, max: 0.8 },
            colors: [
                { h: 220, s: 70, l: 60 }, // Blue
                { h: 260, s: 60, l: 65 }, // Purple
                { h: 280, s: 50, l: 70 }, // Light purple
                { h: 240, s: 80, l: 55 }  // Deep blue
            ]
        };

        this.init();
        this.resize();
    }

    /**
     * Initialize the particle system
     */
    init() {
        this.particles = [];
        this.createParticles();
    }

    /**
     * Create initial particles
     */
    createParticles() {
        for (let i = 0; i < this.config.maxParticles; i++) {
            this.particles.push(this.createParticle());
        }
    }

    /**
     * Create a single particle
     * @returns {Object} Particle object
     */
    createParticle() {
        const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * this.config.baseSpeed,
            vy: (Math.random() - 0.5) * this.config.baseSpeed,
            size: Utils.random(this.config.particleSize.min, this.config.particleSize.max),
            opacity: Utils.random(this.config.opacity.min, this.config.opacity.max),
            baseOpacity: Utils.random(this.config.opacity.min, this.config.opacity.max),
            color: color,
            life: 1.0,
            maxLife: Utils.random(5, 10),
            age: 0,
            mouseDistance: 1000,
            connections: 0
        };
    }

    /**
     * Update particle system
     * @param {number} mouseX - Mouse X position
     * @param {number} mouseY - Mouse Y position
     */
    update(mouseX, mouseY) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;

        // Update particles
        this.updateParticles();
        
        // Update connections
        this.updateConnections();
        
        // Maintain particle count
        this.maintainParticleCount();
    }

    /**
     * Update all particles
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Calculate mouse influence
            const dx = this.mouseX - particle.x;
            const dy = this.mouseY - particle.y;
            particle.mouseDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Apply mouse influence
            if (particle.mouseDistance < this.config.mouseInfluence) {
                const force = (this.config.mouseInfluence - particle.mouseDistance) / this.config.mouseInfluence;
                const angle = Math.atan2(dy, dx);
                particle.vx -= Math.cos(angle) * force * 0.02;
                particle.vy -= Math.sin(angle) * force * 0.02;
            }
            
            // Update velocity with damping
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Limit speed
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed > this.config.maxSpeed) {
                particle.vx = (particle.vx / speed) * this.config.maxSpeed;
                particle.vy = (particle.vy / speed) * this.config.maxSpeed;
            }
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around screen edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            // Update life
            particle.age += 0.016; // Assuming 60 FPS
            particle.life = 1.0 - (particle.age / particle.maxLife);
            
            // Update opacity based on mouse proximity and connections
            const mouseProximity = 1.0 - Math.min(particle.mouseDistance / this.config.mouseInfluence, 1.0);
            const connectionBonus = Math.min(particle.connections * 0.1, 0.3);
            particle.opacity = particle.baseOpacity + mouseProximity * 0.3 + connectionBonus;
            particle.opacity = Utils.clamp(particle.opacity, 0.1, 1.0);
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Update particle connections
     */
    updateConnections() {
        this.connections = [];
        
        // Reset connection counts
        this.particles.forEach(particle => {
            particle.connections = 0;
        });
        
        // Calculate connections
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.connectionDistance) {
                    const strength = 1.0 - (distance / this.config.connectionDistance);
                    
                    this.connections.push({
                        p1: p1,
                        p2: p2,
                        distance: distance,
                        strength: strength,
                        opacity: strength * Math.min(p1.opacity, p2.opacity)
                    });
                    
                    p1.connections++;
                    p2.connections++;
                }
            }
        }
    }

    /**
     * Maintain particle count by creating new particles
     */
    maintainParticleCount() {
        while (this.particles.length < this.config.maxParticles) {
            this.particles.push(this.createParticle());
        }
    }

    /**
     * Render the particle system
     */
    render() {
        // Clear canvas with gradient background
        this.renderBackground();
        
        // Render connections
        this.renderConnections();
        
        // Render particles
        this.renderParticles();
    }

    /**
     * Render background gradient
     */
    renderBackground() {
        const gradient = this.ctx.createRadialGradient(
            this.mouseX, this.mouseY, 0,
            this.mouseX, this.mouseY, 400
        );
        
        gradient.addColorStop(0, `hsla(240, 50%, 8%, 1)`);
        gradient.addColorStop(0.5, `hsla(260, 40%, 5%, 1)`);
        gradient.addColorStop(1, 'hsla(280, 30%, 2%, 1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render particle connections
     */
    renderConnections() {
        this.ctx.strokeStyle = 'rgba(138, 107, 255, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (const connection of this.connections) {
            if (connection.opacity > 0.05) {
                // Create gradient for connection line
                const gradient = this.ctx.createLinearGradient(
                    connection.p1.x, connection.p1.y,
                    connection.p2.x, connection.p2.y
                );
                
                const color1 = connection.p1.color;
                const color2 = connection.p2.color;
                
                gradient.addColorStop(0, `hsla(${color1.h}, ${color1.s}%, ${color1.l}%, ${connection.opacity})`);
                gradient.addColorStop(1, `hsla(${color2.h}, ${color2.s}%, ${color2.l}%, ${connection.opacity})`);
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = connection.strength * 2;
                
                this.ctx.beginPath();
                this.ctx.moveTo(connection.p1.x, connection.p1.y);
                this.ctx.lineTo(connection.p2.x, connection.p2.y);
                this.ctx.stroke();
            }
        }
    }

    /**
     * Render particles
     */
    renderParticles() {
        for (const particle of this.particles) {
            if (particle.opacity > 0.05) {
                const color = particle.color;
                
                // Create radial gradient for particle
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size * 3
                );
                
                gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${particle.opacity})`);
                gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${particle.opacity * 0.5})`);
                gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.l}%, 0)`);
                
                this.ctx.fillStyle = gradient;
                
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw core
                this.ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l + 20}%, ${particle.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    /**
     * Resize canvas and update particle positions
     */
    resize() {
        Utils.resizeCanvas(this.canvas);
        
        // Redistribute particles if canvas size changed significantly
        const area = this.canvas.width * this.canvas.height;
        const targetParticleCount = Math.min(
            Math.floor(area / 20000), 
            this.config.maxParticles
        );
        
        // Adjust particle positions to new canvas size
        this.particles.forEach(particle => {
            particle.x = Math.min(particle.x, this.canvas.width);
            particle.y = Math.min(particle.y, this.canvas.height);
        });
        
        // Adjust particle count based on canvas size
        if (targetParticleCount < this.particles.length) {
            this.particles.splice(targetParticleCount);
        }
    }

    /**
     * Add burst effect at position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} count - Number of particles to create
     */
    addBurst(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const particle = this.createParticle();
            particle.x = x + Utils.random(-20, 20);
            particle.y = y + Utils.random(-20, 20);
            particle.vx = Utils.random(-2, 2);
            particle.vy = Utils.random(-2, 2);
            particle.opacity = 1.0;
            particle.life = 1.0;
            this.particles.push(particle);
        }
    }

    /**
     * Get particle system statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            particleCount: this.particles.length,
            connectionCount: this.connections.length,
            averageConnections: this.particles.length > 0 ? 
                this.particles.reduce((sum, p) => sum + p.connections, 0) / this.particles.length : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticleSystem;
}