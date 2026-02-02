/**
 * REAL AI Website - Main JavaScript
 * Handles navigation, animations, parallax effects, and particle network
 */

// ============================================
// Morphing Binary Animation
// 0s and 1s that morph between shapes: Grid → Pregnant Woman → Kidney → Galaxy → REAL AI
// ============================================
class MorphingBinary {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 400;
        this.currentShape = 0;
        this.shapes = ['grid', 'pregnant', 'kidney', 'galaxy', 'text'];
        this.transitionProgress = 0;
        this.isFirstGrid = true;  // Track if we're in the initial grid phase

        // Animation states: 'holding', 'scattering', 'forming'
        this.state = 'holding';
        this.stateStartTime = Date.now();

        // Timing
        this.holdTime = 3000;      // Time to hold each shape
        this.scatterTime = 800;    // Time to scatter (short, since it's just a small neighborhood)
        this.formTime = 2500;      // Time to form new shape (with momentum)

        // For number flipping during initial grid only
        this.lastFlipTime = Date.now();
        this.flipInterval = 30;    // Flip numbers every 30ms (much faster)
        this.flipsPerFrame = 8;    // Flip multiple numbers at once

        this.colors = {
            blue: '#64bde3',   // Color for 1s (sky blue)
            darkBlue: '#3d8ab3' // Color for 0s (darker blue)
        };

        this.init();
        this.animate();
        window.addEventListener('resize', () => this.resize());
    }

    init() {
        this.resize();
        this.createParticles();
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.scale = Math.min(this.canvas.width, this.canvas.height) * 0.35;
    }

    createParticles() {
        this.particles = [];
        const gridPositions = this.getShapePoints('grid');

        for (let i = 0; i < this.particleCount; i++) {
            const pos = gridPositions[i] || { x: this.centerX, y: this.centerY };
            const char = Math.random() > 0.5 ? '1' : '0';
            this.particles.push({
                x: pos.x,
                y: pos.y,
                startX: pos.x,  // Store starting position for smooth transitions
                startY: pos.y,
                targetX: pos.x,
                targetY: pos.y,
                char: char,
                color: char === '1' ? this.colors.blue : this.colors.darkBlue,
                size: 10 + Math.random() * 3,
                vx: 0,
                vy: 0
            });
        }
    }

    // Update color based on character (1 = light blue, 0 = dark blue)
    updateParticleColor(p) {
        p.color = p.char === '1' ? this.colors.blue : this.colors.darkBlue;
    }

    getShapePoints(shape) {
        const points = [];
        const count = this.particleCount;

        switch (shape) {
            case 'grid':
                const cols = Math.ceil(Math.sqrt(count));
                const rows = Math.ceil(count / cols);
                const spacing = this.scale * 2 / cols;
                for (let i = 0; i < count; i++) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    points.push({
                        x: this.centerX - this.scale + col * spacing + spacing / 2,
                        y: this.centerY - this.scale + row * spacing + spacing / 2
                    });
                }
                break;

            case 'pregnant':
                // Pregnant woman silhouette - side profile facing right
                // Outline points for the silhouette (normalized coordinates)
                const outlinePoints = [];
                const sc = this.scale * 0.9;
                const ox = this.centerX - sc * 0.1; // Offset to center
                const oy = this.centerY;

                // Head (circle at top)
                const headRadius = sc * 0.18;
                const headCenterX = ox + sc * 0.05;
                const headCenterY = oy - sc * 0.75;
                for (let a = 0; a < Math.PI * 2; a += 0.15) {
                    outlinePoints.push({
                        x: headCenterX + Math.cos(a) * headRadius,
                        y: headCenterY + Math.sin(a) * headRadius * 1.1
                    });
                }

                // Hair bun at back of head
                const bunRadius = sc * 0.12;
                const bunCenterX = headCenterX - headRadius * 0.7;
                const bunCenterY = headCenterY - headRadius * 0.3;
                for (let a = 0; a < Math.PI * 2; a += 0.2) {
                    outlinePoints.push({
                        x: bunCenterX + Math.cos(a) * bunRadius,
                        y: bunCenterY + Math.sin(a) * bunRadius
                    });
                }

                // Neck
                for (let t = 0; t <= 1; t += 0.1) {
                    outlinePoints.push({
                        x: ox + sc * 0.08,
                        y: oy - sc * 0.55 + t * sc * 0.1
                    });
                }

                // Back line (from neck down)
                for (let t = 0; t <= 1; t += 0.05) {
                    const backCurve = Math.sin(t * Math.PI) * 0.08;
                    outlinePoints.push({
                        x: ox - sc * 0.15 - backCurve * sc,
                        y: oy - sc * 0.45 + t * sc * 0.9
                    });
                }

                // Front - chest area
                for (let t = 0; t <= 1; t += 0.08) {
                    const chestCurve = Math.sin(t * Math.PI) * 0.12;
                    outlinePoints.push({
                        x: ox + sc * 0.15 + chestCurve * sc,
                        y: oy - sc * 0.45 + t * sc * 0.25
                    });
                }

                // Pregnant belly - the prominent curve
                for (let t = 0; t <= 1; t += 0.03) {
                    const angle = -Math.PI * 0.3 + t * Math.PI * 1.1;
                    const bellyRadius = sc * 0.4;
                    const bellyCenterX = ox + sc * 0.1;
                    const bellyCenterY = oy + sc * 0.05;
                    outlinePoints.push({
                        x: bellyCenterX + Math.cos(angle) * bellyRadius * 0.9,
                        y: bellyCenterY + Math.sin(angle) * bellyRadius
                    });
                }

                // Lower body / legs (simplified)
                for (let t = 0; t <= 1; t += 0.08) {
                    // Front leg line
                    outlinePoints.push({
                        x: ox + sc * 0.1 - t * sc * 0.05,
                        y: oy + sc * 0.4 + t * sc * 0.5
                    });
                    // Back leg line
                    outlinePoints.push({
                        x: ox - sc * 0.15 + t * sc * 0.02,
                        y: oy + sc * 0.45 + t * sc * 0.45
                    });
                }

                // Arms
                // Back arm
                for (let t = 0; t <= 1; t += 0.1) {
                    outlinePoints.push({
                        x: ox - sc * 0.2 - t * sc * 0.1,
                        y: oy - sc * 0.35 + t * sc * 0.35
                    });
                }
                // Front arm resting on belly
                for (let t = 0; t <= 1; t += 0.1) {
                    const armCurve = Math.sin(t * Math.PI) * 0.1;
                    outlinePoints.push({
                        x: ox + sc * 0.25 + t * sc * 0.15,
                        y: oy - sc * 0.25 + t * sc * 0.2 + armCurve * sc
                    });
                }

                // Fill particles along the outline and inside
                for (let i = 0; i < count; i++) {
                    if (i < count * 0.6) {
                        // Place on outline with some thickness
                        const pt = outlinePoints[i % outlinePoints.length];
                        const offsetX = (Math.random() - 0.5) * sc * 0.08;
                        const offsetY = (Math.random() - 0.5) * sc * 0.08;
                        points.push({
                            x: pt.x + offsetX,
                            y: pt.y + offsetY
                        });
                    } else {
                        // Fill interior of belly area
                        const angle = Math.random() * Math.PI * 2;
                        const r = Math.random() * sc * 0.35;
                        const bellyCenterX = ox + sc * 0.1;
                        const bellyCenterY = oy + sc * 0.05;
                        points.push({
                            x: bellyCenterX + Math.cos(angle) * r * 0.8,
                            y: bellyCenterY + Math.sin(angle) * r
                        });
                    }
                }
                break;

            case 'kidney':
                // Kidney shape: classic bean shape with indent (hilum) on inner side
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;

                    // Bean shape using parametric equation
                    // Outer curve is larger, inner curve has a deep indent
                    let radius;

                    // Create the characteristic kidney bean shape
                    // The indent (hilum) is on the left side (around PI)
                    const indentAngle = Math.PI; // Left side indent
                    const angleDiff = Math.abs(angle - indentAngle);
                    const indentWidth = 0.8; // How wide the indent region is
                    const indentDepth = 0.5; // How deep the indent goes

                    if (angleDiff < indentWidth) {
                        // In the indent region - create concave curve
                        const indentProgress = 1 - (angleDiff / indentWidth);
                        const indentCurve = Math.sin(indentProgress * Math.PI);
                        radius = this.scale * (0.8 - indentDepth * indentCurve);
                    } else {
                        // Normal convex bean curve
                        radius = this.scale * (0.75 + 0.15 * Math.cos(angle * 2));
                    }

                    // Fill the interior
                    const fillRandom = 0.25 + Math.random() * 0.75;
                    const finalRadius = radius * fillRandom;

                    // Slightly taller than wide for kidney proportions
                    const x = this.centerX + Math.cos(angle) * finalRadius;
                    const y = this.centerY + Math.sin(angle) * finalRadius * 1.3;

                    points.push({ x, y });
                }
                break;

            case 'galaxy':
                // Spiral galaxy: dense center with spiral arms extending outward
                const numArms = 2;
                const armParticles = Math.floor(count * 0.7);
                const coreParticles = count - armParticles;

                // Dense central core/bulge
                for (let i = 0; i < coreParticles; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    // Gaussian-like distribution for core density
                    const r = this.scale * 0.25 * Math.sqrt(-2 * Math.log(Math.random() + 0.01));
                    const coreR = Math.min(r, this.scale * 0.3);
                    points.push({
                        x: this.centerX + Math.cos(angle) * coreR,
                        y: this.centerY + Math.sin(angle) * coreR * 0.5 // Flatten for inclination
                    });
                }

                // Spiral arms
                for (let i = 0; i < armParticles; i++) {
                    const arm = i % numArms;
                    const progressInArm = Math.floor(i / numArms) / (armParticles / numArms);

                    // Logarithmic spiral: r = a * e^(b * theta)
                    const armOffset = (arm / numArms) * Math.PI * 2;
                    const spiralTightness = 0.3;
                    const maxRotations = 1.5;

                    const theta = progressInArm * Math.PI * 2 * maxRotations + armOffset;
                    const r = this.scale * (0.15 + progressInArm * 0.85);

                    // Add spread to arms (wider at edges)
                    const spread = 0.05 + progressInArm * 0.15;
                    const spreadX = (Math.random() - 0.5) * this.scale * spread;
                    const spreadY = (Math.random() - 0.5) * this.scale * spread * 0.5;

                    points.push({
                        x: this.centerX + Math.cos(theta) * r + spreadX,
                        y: this.centerY + Math.sin(theta) * r * 0.5 + spreadY // Flatten for inclination
                    });
                }
                break;

            case 'text':
                // "REAL" on top line, "AI" on bottom line
                const letterPatterns = this.getLetterPatterns();
                const topText = 'REAL';
                const bottomText = 'AI';

                const letterWidth = 5;
                const letterHeight = 7;
                const letterSpacing = 1;
                const lineSpacing = 2;

                // Calculate total widths
                const topWidth = topText.length * (letterWidth + letterSpacing) - letterSpacing;
                const bottomWidth = bottomText.length * (letterWidth + letterSpacing) - letterSpacing;
                const totalHeight = letterHeight * 2 + lineSpacing;

                // Collect all points from letters
                const allLetterPoints = [];

                // Top line: "REAL"
                const topStartX = -topWidth / 2;
                const topY = -totalHeight / 2;
                for (let i = 0; i < topText.length; i++) {
                    const letter = topText[i];
                    const pattern = letterPatterns[letter];
                    const offsetX = topStartX + i * (letterWidth + letterSpacing);
                    if (pattern) {
                        for (let row = 0; row < pattern.length; row++) {
                            for (let col = 0; col < pattern[row].length; col++) {
                                if (pattern[row][col]) {
                                    allLetterPoints.push({
                                        x: offsetX + col,
                                        y: topY + row
                                    });
                                }
                            }
                        }
                    }
                }

                // Bottom line: "AI"
                const bottomStartX = -bottomWidth / 2;
                const bottomY = -totalHeight / 2 + letterHeight + lineSpacing;
                for (let i = 0; i < bottomText.length; i++) {
                    const letter = bottomText[i];
                    const pattern = letterPatterns[letter];
                    const offsetX = bottomStartX + i * (letterWidth + letterSpacing);
                    if (pattern) {
                        for (let row = 0; row < pattern.length; row++) {
                            for (let col = 0; col < pattern[row].length; col++) {
                                if (pattern[row][col]) {
                                    allLetterPoints.push({
                                        x: offsetX + col,
                                        y: bottomY + row
                                    });
                                }
                            }
                        }
                    }
                }

                // Scale and center the points (compact text)
                const textScale = this.scale * 0.045;

                // Distribute particles across letter points
                for (let i = 0; i < count; i++) {
                    if (allLetterPoints.length > 0) {
                        const pt = allLetterPoints[i % allLetterPoints.length];
                        // Add slight randomness for texture
                        const jitter = 0.3;
                        points.push({
                            x: this.centerX + pt.x * textScale + (Math.random() - 0.5) * textScale * jitter,
                            y: this.centerY + pt.y * textScale + (Math.random() - 0.5) * textScale * jitter
                        });
                    }
                }
                break;

            case 'scattered':
                // Random positions spread across canvas
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = this.scale * (0.5 + Math.random() * 1.2);
                    points.push({
                        x: this.centerX + Math.cos(angle) * r,
                        y: this.centerY + Math.sin(angle) * r
                    });
                }
                break;
        }

        return points;
    }

    // Pixel patterns for letters (5x7 grid each)
    getLetterPatterns() {
        return {
            'R': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,0],
                [1,0,1,0,0],
                [1,0,0,1,0],
                [1,0,0,0,1]
            ],
            'E': [
                [1,1,1,1,1],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],
            'A': [
                [0,0,1,0,0],
                [0,1,0,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'L': [
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],
            'I': [
                [1,1,1,1,1],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [1,1,1,1,1]
            ]
        };
    }

    // Check if we should scatter between current shape and next shape
    shouldScatter() {
        // Shapes: 0=grid, 1=brain, 2=kidney, 3=galaxy, 4=text
        // Only scatter between intermediate shapes (brain→kidney, kidney→galaxy)
        // No scatter: grid→brain (0→1) or galaxy→text (3→4)
        if (this.currentShape === 0) return false;  // grid → brain: no scatter
        if (this.currentShape === 3) return false;  // galaxy → text: no scatter
        return true;
    }

    // Check if animation should stop (at final text shape)
    isAtFinalShape() {
        return this.currentShape === 4; // text is the final shape
    }

    startScattering() {
        // Scatter to small neighborhood around current position (not far away)
        const scatterRadius = 30;  // Small neighborhood scatter
        this.particles.forEach((p) => {
            // Store current position as start
            p.startX = p.x;
            p.startY = p.y;
            // Scatter to nearby position (small radius)
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * scatterRadius;
            p.targetX = p.x + Math.cos(angle) * distance;
            p.targetY = p.y + Math.sin(angle) * distance;
        });
        this.state = 'scattering';
        this.stateStartTime = Date.now();
        this.transitionProgress = 0;

        // After first transition, no longer in first grid
        this.isFirstGrid = false;
    }

    startForming(shapeIndex) {
        const shapeName = this.shapes[shapeIndex];
        const newPositions = this.getShapePoints(shapeName);
        this.particles.forEach((p, i) => {
            // Store current position as start
            p.startX = p.x;
            p.startY = p.y;
            const target = newPositions[i] || { x: this.centerX, y: this.centerY };
            p.targetX = target.x;
            p.targetY = target.y;
        });
        this.state = 'forming';
        this.stateStartTime = Date.now();
        this.transitionProgress = 0;
    }

    update() {
        const now = Date.now();
        const stateElapsed = now - this.stateStartTime;

        // State machine
        if (this.state === 'holding') {
            // Flip numbers whenever we're holding at the grid shape
            if (this.currentShape === 0) {
                if (now - this.lastFlipTime > this.flipInterval) {
                    // Flip multiple numbers at once for faster effect
                    for (let f = 0; f < this.flipsPerFrame; f++) {
                        const randomIndex = Math.floor(Math.random() * this.particles.length);
                        const p = this.particles[randomIndex];
                        p.char = p.char === '1' ? '0' : '1';
                        this.updateParticleColor(p);
                    }
                    this.lastFlipTime = now;
                }
            }

            // After hold time, either scatter or go directly to next shape
            // But stop if we're at the final text shape
            if (stateElapsed > this.holdTime && !this.isAtFinalShape()) {
                if (this.shouldScatter()) {
                    this.startScattering();
                } else {
                    // Direct transition without scattering
                    this.isFirstGrid = false;
                    this.currentShape = this.currentShape + 1;
                    this.startForming(this.currentShape);
                }
            }

            // Keep particles at their targets (no jitter)
            this.particles.forEach(p => {
                p.x = p.targetX;
                p.y = p.targetY;
            });

        } else if (this.state === 'scattering') {
            this.transitionProgress = Math.min(1, stateElapsed / this.scatterTime);
            // Linear interpolation for scatter (no momentum/easing)
            const t = this.transitionProgress;

            // Linearly interpolate from start to target (no momentum)
            this.particles.forEach(p => {
                p.x = p.startX + (p.targetX - p.startX) * t;
                p.y = p.startY + (p.targetY - p.startY) * t;
            });

            // After scatter time, start forming next shape
            if (stateElapsed > this.scatterTime) {
                this.currentShape = (this.currentShape + 1) % this.shapes.length;
                this.startForming(this.currentShape);
            }

        } else if (this.state === 'forming') {
            this.transitionProgress = Math.min(1, stateElapsed / this.formTime);
            const ease = this.easeInOutCubic(this.transitionProgress);

            // Smoothly interpolate from start to target
            this.particles.forEach(p => {
                p.x = p.startX + (p.targetX - p.startX) * ease;
                p.y = p.startY + (p.targetY - p.startY) * ease;
            });

            // After form time, go back to holding
            if (stateElapsed > this.formTime) {
                // Snap to final positions
                this.particles.forEach(p => {
                    p.x = p.targetX;
                    p.y = p.targetY;
                });
                this.state = 'holding';
                this.stateStartTime = now;
            }
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connecting lines (only during transitions, and sparse)
        if (this.state !== 'holding') {
            for (let i = 0; i < this.particles.length; i++) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const dx = this.particles[i].x - this.particles[j].x;
                    const dy = this.particles[i].y - this.particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 50) {
                        const opacity = (1 - dist / 50) * 0.12;
                        this.ctx.strokeStyle = `rgba(100, 189, 227, ${opacity})`;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.beginPath();
                        this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                        this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                        this.ctx.stroke();
                    }
                }
            }
        }

        // Draw particles (0s and 1s)
        this.particles.forEach(p => {
            this.ctx.font = `${p.size}px "SF Mono", "Monaco", "Inconsolata", monospace`;
            this.ctx.fillStyle = p.color;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(p.char, p.x, p.y);
        });
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize morphing animation when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const morphCanvas = document.getElementById('morphCanvas');
    if (morphCanvas) {
        new MorphingBinary(morphCanvas);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('header');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id]');

    // ============================================
    // Header Visibility & Scroll Effects
    // ============================================

    // Show header after initial load
    setTimeout(() => {
        header.classList.add('visible');
    }, 100);

    // Header scroll effect and parallax
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

    function handleScroll() {
        const scrolled = window.scrollY > 50;
        header.classList.toggle('scrolled', scrolled);

        // Update active navigation link
        updateActiveNavLink();
    }

    // ============================================
    // Mobile Navigation Toggle
    // ============================================

    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');

            // Animate hamburger icon
            const spans = navToggle.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.navbar') && navMenu) {
            navMenu.classList.remove('active');
            const spans = navToggle?.querySelectorAll('span');
            if (spans) {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        }
    });

    // Close menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });

    // ============================================
    // Active Navigation Link Update
    // ============================================

    function updateActiveNavLink() {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            const sectionHeight = section.clientHeight;

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.includes('#') && href.endsWith('#' + current)) {
                link.classList.add('active');
            }
        });
    }

    // ============================================
    // Intersection Observer for Scroll Animations
    // ============================================

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // ============================================
    // Smooth Scroll for Anchor Links
    // ============================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const headerHeight = header.offsetHeight;
                    const targetPosition = target.offsetTop - headerHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ============================================
    // Research Cards Stagger Animation
    // ============================================

    const researchCards = document.querySelectorAll('.research-card');
    researchCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });

    // ============================================
    // Approach Items Stagger Animation
    // ============================================

    const approachItems = document.querySelectorAll('.approach-item');
    approachItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.1}s`;
    });

    // ============================================
    // Stat Items Animation
    // ============================================

    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.15}s`;
        observer.observe(item);
    });
});
