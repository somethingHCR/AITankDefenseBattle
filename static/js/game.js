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
        this.wave = 0;
        this.enemies = [];
        this.turrets = [];
        this.bullets = [];
        this.path = this.generatePath();
        this.selectedTurret = null;
        this.selectedPlacedTurret = null;
        this.audioManager = new AudioManager();
        this.mouseX = 0;
        this.mouseY = 0;
        this.waveInProgress = false;
        
        this.loadImages();
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.updateMoneyDisplay();
        this.setupTurretUpgradeUI();
    }

    loadImages() {
        const images = {
            'tankImg': '/static/assets/tank.svg',
            'turretImg': '/static/assets/turret.svg',
            'laserTurretImg': '/static/assets/laser_turret.svg',
            'instantTurretImg': '/static/assets/instant_kill_turret.svg',
            'freezeTurretImg': '/static/assets/freeze_turret.svg',
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
        return [
            {x: 0, y: 3},
            {x: 10, y: 3},
            {x: 10, y: 8},
            {x: 5, y: 8},
            {x: 5, y: 12},
            {x: 19, y: 12}
        ];
    }

    setupTurretUpgradeUI() {
        const upgradeDiv = document.createElement('div');
        upgradeDiv.id = 'turretUpgrade';
        upgradeDiv.className = 'turret-upgrade';
        upgradeDiv.style.display = 'none';
        document.querySelector('.turret-shop').appendChild(upgradeDiv);
    }

    updateTurretUpgradeUI() {
        const upgradeDiv = document.getElementById('turretUpgrade');
        
        if (!this.selectedPlacedTurret) {
            upgradeDiv.style.display = 'none';
            return;
        }

        const upgradeInfo = this.selectedPlacedTurret.getUpgradeInfo();
        
        if (!upgradeInfo.canUpgrade) {
            upgradeDiv.innerHTML = `
                <h4>Selected Turret (Max Level)</h4>
                <p>Damage: ${this.selectedPlacedTurret.damage}</p>
                <p>Fire Rate: ${(1000 / this.selectedPlacedTurret.fireRate).toFixed(1)} shots/sec</p>
                <p>Range: ${this.selectedPlacedTurret.range}</p>
            `;
        } else {
            upgradeDiv.innerHTML = `
                <h4>Selected Turret (Level ${this.selectedPlacedTurret.level})</h4>
                <p>Damage: ${this.selectedPlacedTurret.damage} → ${upgradeInfo.nextLevel.damage}</p>
                <p>Fire Rate: ${(1000 / this.selectedPlacedTurret.fireRate).toFixed(1)} → ${(1000 / upgradeInfo.nextLevel.fireRate).toFixed(1)} shots/sec</p>
                <p>Range: ${this.selectedPlacedTurret.range} → ${upgradeInfo.nextLevel.range}</p>
                <button class="btn btn-success" onclick="game.upgradeTurret()">
                    Upgrade ($${upgradeInfo.cost})
                </button>
            `;
        }
        upgradeDiv.style.display = 'block';
    }

    upgradeTurret() {
        if (!this.selectedPlacedTurret) return;

        const upgradeInfo = this.selectedPlacedTurret.getUpgradeInfo();
        if (upgradeInfo.canUpgrade && this.money >= upgradeInfo.cost) {
            this.money -= upgradeInfo.cost;
            this.selectedPlacedTurret.upgrade();
            this.updateMoneyDisplay();
            this.updateTurretUpgradeUI();
            this.audioManager.playSound('place');
        }
    }

    start() {
        this.spawnWave();
        requestAnimationFrame(this.gameLoop);
    }

    spawnWave() {
        if (this.waveInProgress) return;
        
        this.waveInProgress = true;
        this.wave++;
        document.getElementById('wave').textContent = this.wave;
        
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

    createBullet(x, y, targetX, targetY, damage, type = 'basic') {
        this.bullets.push(new Bullet(x, y, targetX, targetY, damage, type));
    }

    getTurretCost(type) {
        const costs = {
            'basic': 75,
            'laser': 100,
            'instant': 200,
            'freeze': 25
        };
        return costs[type] || 75;
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawPath();
        
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

        this.turrets.forEach(turret => {
            turret.update(this.enemies);
            turret.draw(this.ctx);
        });

        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            bullet.draw(this.ctx);
            
            for (let enemy of this.enemies) {
                if (!enemy.exploding && bullet.checkCollision(enemy)) {
                    enemy.takeDamage(bullet.damage);
                    if (enemy.exploding) {
                        this.score += 10;
                        this.money += 25;
                        this.updateMoneyDisplay();
                        document.getElementById('score').textContent = this.score;
                    }
                    return false;
                }
            }
            
            return !bullet.isOffscreen(this.canvas.width, this.canvas.height);
        });

        if (this.selectedTurret) {
            const cost = this.getTurretCost(this.selectedTurret);
            const canPlace = !this.isOnPath(this.mouseX, this.mouseY) && this.money >= cost;
            
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = canPlace ? '#00f' : '#f00';
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }

        if (this.enemies.length === 0) {
            this.waveInProgress = false;
            setTimeout(() => this.spawnWave(), 3000);
        }

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
        
        const clickedTurret = this.turrets.find(turret => {
            const dx = turret.x - x;
            const dy = turret.y - y;
            return Math.sqrt(dx * dx + dy * dy) < 20;
        });

        if (this.selectedPlacedTurret) {
            this.selectedPlacedTurret.isSelected = false;
        }

        if (clickedTurret) {
            this.selectedPlacedTurret = clickedTurret;
            this.selectedPlacedTurret.isSelected = true;
            this.selectedTurret = null;
            this.updateTurretUpgradeUI();
            return;
        }

        if (this.selectedPlacedTurret) {
            this.selectedPlacedTurret.isSelected = false;
            this.selectedPlacedTurret = null;
            this.updateTurretUpgradeUI();
        }
        
        if (this.selectedTurret) {
            const cost = this.getTurretCost(this.selectedTurret);
            if (this.money >= cost && !this.isOnPath(x, y)) {
                this.money -= cost;
                this.updateMoneyDisplay();
                const turret = new Turret(
                    x, y,
                    this.selectedTurret,
                    this.createBullet.bind(this),
                    this.audioManager.playSound.bind(this.audioManager)
                );
                this.turrets.push(turret);
                this.audioManager.playSound('place');
                this.selectedTurret = null;
            }
        }
    }

    isOnPath(x, y) {
        const bufferSize = this.tileSize * 0.75;
        const tileX = x / this.tileSize;
        const tileY = y / this.tileSize;
        
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

window.addEventListener('load', () => {
    const game = new Game();
    game.start();
    window.game = game;
});