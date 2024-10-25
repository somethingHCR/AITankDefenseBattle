class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameLoop = this.gameLoop.bind(this);
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
        
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.start();
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
                if (bullet.checkCollision(enemy)) {
                    enemy.takeDamage(bullet.damage);
                    if (enemy.isDead) {
                        this.score += 10;
                        this.money += 20;
                        document.getElementById('score').textContent = this.score;
                    }
                    return false;
                }
            }
            
            return !bullet.isOffscreen();
        });

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

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.selectedTurret && this.money >= 100) {
            // Check if placement is valid (not on path)
            if (!this.isOnPath(x, y)) {
                this.money -= 100;
                this.turrets.push(new Turret(x, y));
                this.audioManager.playSound('place');
                this.selectedTurret = null;
            }
        }
    }

    isOnPath(x, y) {
        // Simple path collision detection
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        return this.path.some(point => 
            point.x === tileX && point.y === tileY
        );
    }

    selectTurret(type) {
        this.selectedTurret = type;
    }
}

// Start the game when the page loads
window.onload = () => {
    window.game = new Game();
};
