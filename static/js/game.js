class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameLoop = this.gameLoop.bind(this);
        this.createBullet = this.createBullet.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
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
        this.audioManager = new AudioManager();
        this.mouseX = 0;
        this.mouseY = 0;
        this.waveInProgress = false;
        
        this.turretTypes = {
            'basic': { 
                cost: 75, 
                name: 'Basic Turret', 
                color: '#1a75ff',
                damage: 25,
                range: 150,
                fireRate: 1000,
                description: 'Balanced damage and fire rate' 
            },
            'sniper': { 
                cost: 150, 
                name: 'Sniper Turret', 
                color: '#ff3333',
                damage: 75,
                range: 250,
                fireRate: 2000,
                description: 'High damage, long range, slow fire rate' 
            },
            'rapid': { 
                cost: 100, 
                name: 'Rapid Turret', 
                color: '#33cc33',
                damage: 10,
                range: 120,
                fireRate: 400,
                description: 'Low damage, high fire rate' 
            },
            'splash': { 
                cost: 200, 
                name: 'Splash Turret', 
                color: '#ff9933',
                damage: 20,
                range: 130,
                fireRate: 1500,
                splashRadius: 50,
                description: 'Area damage' 
            }
        };
        
        this.loadImages();
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.updateMoneyDisplay();
        this.updateTurretShop();
    }

    loadImages() {
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

    updateTurretShop() {
        const shop = document.querySelector('.turret-shop');
        shop.innerHTML = '<h3>Turret Shop</h3>';
        
        Object.entries(this.turretTypes).forEach(([type, info]) => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary mb-2 w-100';
            button.onclick = () => this.selectTurret(type);
            button.innerHTML = `${info.name} ($${info.cost})<br><small>${info.description}</small>`;
            shop.appendChild(button);
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
                enemy.health = enemy.maxHealth = 100 + (this.wave - 1) * 20;
                this.enemies.push(enemy);
            }, i * 1000);
        }
    }

    updateMoneyDisplay() {
        document.getElementById('money').textContent = this.money;
    }

    createBullet(x, y, targetX, targetY, damage, splashRadius = 0) {
        const bullet = new Bullet(x, y, targetX, targetY, damage, splashRadius);
        this.bullets.push(bullet);
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
            
            let hitEnemy = false;
            
            for (let enemy of this.enemies) {
                if (!enemy.exploding && bullet.checkCollision(enemy)) {
                    enemy.takeDamage(bullet.damage);
                    
                    if (bullet.splashRadius > 0) {
                        // Apply splash damage to nearby enemies
                        this.enemies.forEach(otherEnemy => {
                            if (otherEnemy !== enemy && !otherEnemy.exploding) {
                                const distance = Math.sqrt(
                                    Math.pow(enemy.x - otherEnemy.x, 2) + 
                                    Math.pow(enemy.y - otherEnemy.y, 2)
                                );
                                if (distance < bullet.splashRadius) {
                                    const splashDamage = bullet.damage * (1 - distance / bullet.splashRadius);
                                    otherEnemy.takeDamage(splashDamage);
                                }
                            }
                        });
                    }
                    
                    if (enemy.exploding) {
                        this.score += 10;
                        this.money += 25;
                        this.updateMoneyDisplay();
                        document.getElementById('score').textContent = this.score;
                    }
                    hitEnemy = true;
                    break;
                }
            }
            
            return !hitEnemy && !bullet.isOffscreen(this.canvas.width, this.canvas.height);
        });

        if (this.selectedTurret) {
            const turretType = this.turretTypes[this.selectedTurret];
            const canPlace = !this.isOnPath(this.mouseX, this.mouseY) && this.money >= turretType.cost;
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = canPlace ? turretType.color : '#f00';
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Show range indicator while placing
            this.ctx.strokeStyle = turretType.color;
            this.ctx.beginPath();
            this.ctx.arc(this.mouseX, this.mouseY, turretType.range, 0, Math.PI * 2);
            this.ctx.stroke();
            
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
        
        if (this.selectedTurret) {
            const turretType = this.turretTypes[this.selectedTurret];
            if (this.money >= turretType.cost && !this.isOnPath(x, y)) {
                this.money -= turretType.cost;
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
