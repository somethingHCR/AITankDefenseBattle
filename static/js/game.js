class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameLoop = this.gameLoop.bind(this);
        this.createBullet = this.createBullet.bind(this);
        this.tileSize = 40;
        this.money = 300;
        this.score = 0;
        this.lives = 10;
        this.wave = 1;
        this.enemies = [];
        this.turrets = [];
        this.bullets = [];
        this.path = this.generatePath();
        this.selectedTurret = null;
        this.audioManager = new AudioManager();
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.loadImages();
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.updateMoneyDisplay();
    }

    loadImages() {
        // Create and load images
        const images = {
            'tankImg': '/static/assets/tank.svg',
            'turretImg': '/static/assets/turret.svg',
            'bulletImg': '/static/assets/bullet.svg'
        };

        Object.entries(images).forEach(([id, src]) => {
            const img = document.createElement('img');
            img.id = id;
            img.src = src;
            img.style.display = 'none';
            document.body.appendChild(img);
        });
    }

    generatePath() {
        // Simple path definition: array of coordinates
        return [
            {x: 0, y: 3},
            {x: 10, y: 3},
            {x: 10, y: 8},
            {x: 5, y: 8},
            {x: 5, y: 12},
            {x: 19, y: 12}
        ];
    }

    start() {
        this.spawnWave();
        requestAnimationFrame(this.gameLoop);
    }

    spawnWave() {
        const enemyCount = 5 + this.wave * 2;
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                const enemy = new Enemy(
                    -1 * this.tileSize,
                    3 * this.tileSize,
                    this.path,
                    this.tileSize
                );
                this.enemies.push(enemy);
            }, i * 1000);
        }
    }

    updateMoneyDisplay() {
        document.getElementById('money').textContent = this.money;
    }

    createBullet(x, y, targetX, targetY, damage) {
        this.bullets.push(new Bullet(x, y, targetX, targetY, damage));
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw path
        this.drawPath();
        
        // Update and draw enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update();
            enemy.draw(this.ctx);
            
            if (enemy.reachedEnd) {
                this.lives--;
                document.getElementById('lives').textContent = this.lives;
                return false;
            }
            return !enemy.isDead;
        });

        // Update and draw turrets
        this.turrets.forEach(turret => {
            turret.update(this.enemies);
            turret.draw(this.ctx);
        });

        // Update and draw bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            bullet.draw(this.ctx);
            
            // Check collision with enemies
            for (let enemy of this.enemies) {
                if (!enemy.exploding && bullet.checkCollision(enemy)) {
                    enemy.takeDamage(bullet.damage);
                    if (enemy.exploding) {
                        this.score += 10;
                        this.money += 25; // Increased from 20 to 25
                        this.updateMoneyDisplay();
                        document.getElementById('score').textContent = this.score;
                    }
                    return false;
                }
            }
            
            return !bullet.isOffscreen(this.canvas.width, this.canvas.height);
        });

        // Draw turret placement preview
        if (this.selectedTurret) {
            const canPlace = !this.isOnPath(this.mouseX, this.mouseY) && this.money >= 75;
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = canPlace ? '#00f' : '#f00';
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }

        // Check if wave is complete
        if (this.enemies.length === 0) {
            this.wave++;
            document.getElementById('wave').textContent = this.wave;
            this.spawnWave();
        }

        // Check game over
        if (this.lives <= 0) {
            alert('Game Over! Score: ' + this.score);
            location.reload();
            return;
        }

        requestAnimationFrame(this.gameLoop);
    }

    drawPath() {
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = this.tileSize;
        this.ctx.beginPath();
        this.path.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x * this.tileSize, point.y * this.tileSize);
            } else {
                this.ctx.lineTo(point.x * this.tileSize, point.y * this.tileSize);
            }
        });
        this.ctx.stroke();
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = event.clientX - rect.left;
        this.mouseY = event.clientY - rect.top;
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.selectedTurret && this.money >= 75) {
            // Check if placement is valid (not on path)
            if (!this.isOnPath(x, y)) {
                this.money -= 75;
                this.updateMoneyDisplay();
                this.turrets.push(new Turret(
                    x, y,
                    this.createBullet,
                    this.audioManager.playSound.bind(this.audioManager)
                ));
                this.audioManager.playSound('place');
                this.selectedTurret = null;
            }
        }
    }

    isOnPath(x, y) {
        const bufferSize = this.tileSize * 0.75;
        const tileX = x / this.tileSize;
        const tileY = y / this.tileSize;
        
        // Check each path segment
        for (let i = 0; i < this.path.length - 1; i++) {
            const start = this.path[i];
            const end = this.path[i + 1];
            
            const A = x - start.x * this.tileSize;
            const B = y - start.y * this.tileSize;
            const C = end.x * this.tileSize - start.x * this.tileSize;
            const D = end.y * this.tileSize - start.y * this.tileSize;
            
            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            
            if (len_sq !== 0) {
                param = dot / len_sq;
            }
            
            let xx, yy;
            
            if (param < 0) {
                xx = start.x * this.tileSize;
                yy = start.y * this.tileSize;
            } else if (param > 1) {
                xx = end.x * this.tileSize;
                yy = end.y * this.tileSize;
            } else {
                xx = start.x * this.tileSize + param * C;
                yy = start.y * this.tileSize + param * D;
            }
            
            const dx = x - xx;
            const dy = y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bufferSize) {
                return true;
            }
        }
        return false;
    }

    selectTurret(type) {
        this.selectedTurret = type;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    const game = new Game();
    game.start();
    window.game = game;
});
