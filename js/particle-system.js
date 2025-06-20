class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 100;
        this.resize();
        this.initParticles();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initParticles(); // Reinitialize particles on resize
    }

    initParticles() {
        this.particles = [];
        const count = Math.min(
            Math.floor(this.canvas.width * this.canvas.height / 10000), 
            this.maxParticles
        );

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                color: `rgba(${Math.floor(Math.random() * 100 + 155)}, 
                         ${Math.floor(Math.random() * 100 + 155)}, 
                         ${Math.floor(Math.random() * 255)}, 
                         ${Math.random() * 0.5 + 0.1})`
            });
        }
    }

    update(mouseX, mouseY) {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Move particle
            p.x += p.speedX;
            p.y += p.speedY;
            
            // Wrap around edges
            if (p.x > this.canvas.width) p.x = 0;
            if (p.x < 0) p.x = this.canvas.width;
            if (p.y > this.canvas.height) p.y = 0;
            if (p.y < 0) p.y = this.canvas.height;
            
            // Mouse interaction
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                p.x += dx * 0.05;
                p.y += dy * 0.05;
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        }
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(100, 100, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
}