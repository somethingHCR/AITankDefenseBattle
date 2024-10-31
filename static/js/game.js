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
        this.powerUps = [];
        this.path = this.generatePath();
        this.selectedTurret = null;
        this.selectedPlacedTurret = null;
        this.audioManager = new AudioManager();
        this.mouseX = 0;
        this.mouseY = 0;
        this.waveInProgress = false;
        
        // Power-up effects
        this.doubleDamageActive = false;
        this.rapidFireActive = false;
        this.doubleDamageTimer = 0;
        this.rapidFireTimer = 0;
        
        // Special weapons cooldowns
        this.specialWeapons = {
            nuclear: { cooldown: 0, maxCooldown: 600 },
            freeze: { cooldown: 0, maxCooldown: 300 },
            repair: { cooldown: 0, maxCooldown: 450 }
        };
        
        this.loadImages();
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.updateMoneyDisplay();
        this.setupTurretUpgradeUI();
        this.setupSpecialWeaponsUI();
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

    createBullet(startX, startY, targetX, targetY, damage, type) {
        this.bullets.push(new Bullet(startX, startY, targetX, targetY, damage, type));
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

    setupSpecialWeaponsUI() {
        const weaponsDiv = document.createElement('div');
        weaponsDiv.className = 'special-weapons';
        weaponsDiv.innerHTML = `
            <h3>Special Weapons</h3>
            <button class="btn btn-danger mb-2" onclick="game.useSpecialWeapon('nuclear')">
                Nuclear Strike ($200)
            </button>
            <button class="btn btn-info mb-2" onclick="game.useSpecialWeapon('freeze')">
                Freeze Field ($150)
            </button>
            <button class="btn btn-success mb-2" onclick="game.useSpecialWeapon('repair')">
                Repair Kit ($100)
            </button>
        `;
        document.querySelector('.turret-shop').appendChild(weaponsDiv);
    }

    useSpecialWeapon(type) {
        const costs = {
            nuclear: 200,
            freeze: 150,
            repair: 100
        };

        if (this.money < costs[type] || this.specialWeapons[type].cooldown > 0) return;

        this.money -= costs[type];
        this.updateMoneyDisplay();
        this.specialWeapons[type].cooldown = this.specialWeapons[type].maxCooldown;

        switch(type) {
            case 'nuclear':
                this.enemies.forEach(enemy => {
                    enemy.takeDamage(500);
                });
                break;
            case 'freeze':
                this.enemies.forEach(enemy => {
                    enemy.freeze();
                });
                break;
            case 'repair':
                this.turrets.forEach(turret => {
                    turret.repair();
                });
                break;
        }
    }

    spawnPowerUp() {
        if (Math.random() < 0.01 && this.powerUps.length < 3) {
            const types = ['doubleDamage', 'rapidFire', 'money'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            let validPosition = false;
            let x, y;
            
            while (!validPosition) {
                x = Math.random() * (this.canvas.width - 40) + 20;
                y = Math.random() * (this.canvas.height - 40) + 20;
                if (!this.isOnPath(x, y)) {
                    validPosition = true;
                }
            }
            
            this.powerUps.push({
                type,
                x,
                y,
                radius: 15,
                collected: false,
                timeLeft: 600
            });
        }
    }

    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            if (powerUp.collected) return;
            
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
            
            switch(powerUp.type) {
                case 'doubleDamage':
                    this.ctx.fillStyle = '#ff4444';
                    break;
                case 'rapidFire':
                    this.ctx.fillStyle = '#44ff44';
                    break;
                case 'money':
                    this.ctx.fillStyle = '#ffff44';
                    break;
            }
            
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    collectPowerUp(x, y) {
        this.powerUps.forEach(powerUp => {
            if (!powerUp.collected) {
                const dx = powerUp.x - x;
                const dy = powerUp.y - y;
                if (Math.sqrt(dx * dx + dy * dy) < powerUp.radius) {
                    powerUp.collected = true;
                    switch(powerUp.type) {
                        case 'doubleDamage':
                            this.doubleDamageActive = true;
                            this.doubleDamageTimer = 300;
                            break;
                        case 'rapidFire':
                            this.rapidFireActive = true;
                            this.rapidFireTimer = 300;
                            break;
                        case 'money':
                            this.money += 100;
                            this.updateMoneyDisplay();
                            break;
                    }
                }
            }
        });
    }

    updatePowerUpTimers() {
        if (this.doubleDamageTimer > 0) {
            this.doubleDamageTimer--;
            if (this.doubleDamageTimer === 0) {
                this.doubleDamageActive = false;
            }
        }

        if (this.rapidFireTimer > 0) {
            this.rapidFireTimer--;
            if (this.rapidFireTimer === 0) {
                this.rapidFireActive = false;
            }
        }

        Object.values(this.specialWeapons).forEach(weapon => {
            if (weapon.cooldown > 0) {
                weapon.cooldown--;
            }
        });
    }

    setupTurretUpgradeUI() {
        const upgradeDiv = document.createElement('div');
        upgradeDiv.id = 'turretUpgrade';
        upgradeDiv.className = 'turret-upgrade';
        upgradeDiv.style.display = 'none';
        document.body.appendChild(upgradeDiv);
    }

    updateTurretUpgradeUI() {
        const upgradeDiv = document.getElementById('turretUpgrade');
        
        if (!this.selectedPlacedTurret) {
            upgradeDiv.style.display = 'none';
            return;
        }

        const upgradeInfo = this.selectedPlacedTurret.getUpgradeInfo();
        upgradeDiv.style.left = `${this.selectedPlacedTurret.x + 30}px`;
        upgradeDiv.style.top = `${this.selectedPlacedTurret.y - 30}px`;
        
        if (!upgradeInfo.canUpgrade) {
            upgradeDiv.innerHTML = `
                <p>Damage: ${this.selectedPlacedTurret.damage}</p>
                <p>Fire Rate: ${(1000 / this.selectedPlacedTurret.fireRate).toFixed(1)} shots/sec</p>
                <p>Range: ${this.selectedPlacedTurret.range}</p>
                <p class="text-warning">Max Level Reached</p>
            `;
        } else {
            upgradeDiv.innerHTML = `
                <p>Level ${this.selectedPlacedTurret.level}</p>
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
        requestAnimationFrame(this.gameLoop.bind(this));
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

    getTurretCost(type) {
        const costs = {
            'basic': 75,
            'laser': 100,
            'instant': 200,
            'freeze': 25
        };
        return costs[type] || 75;
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
        
        // Check for power-up collection
        this.collectPowerUp(x, y);
        
        const clickedTurret = this.turrets.find(turret => {
            const dx = turret.x - x;
            const dy = turret.y - y;
            return Math.sqrt(dx * dx + dy * dy) < 20;
        });

        if (clickedTurret) {
            this.selectedPlacedTurret = clickedTurret;
            this.selectedTurret = null;
            this.updateTurretUpgradeUI();
            return;
        }

        if (this.selectedPlacedTurret) {
            this.selectedPlacedTurret = null;
            this.updateTurretUpgradeUI();
        }
        
        if (this.selectedTurret) {
            const cost = this.getTurretCost(this.selectedTurret);
            if (this.money >= cost && !this.isOnPath(x, y)) {
                this.money -= cost;
                this.updateMoneyDisplay();
                
                const boundCreateBullet = this.createBullet.bind(this);
                
                const turret = new Turret(
                    x, y,
                    this.selectedTurret,
                    boundCreateBullet,
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
        if (this.selectedPlacedTurret) {
            this.selectedPlacedTurret = null;
            this.updateTurretUpgradeUI();
        }
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawPath();
        this.spawnPowerUp();
        this.drawPowerUps();
        this.updatePowerUpTimers();
        
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
            if (this.doubleDamageActive) {
                turret.damageMultiplier = 2;
            } else {
                turret.damageMultiplier = 1;
            }
            
            if (this.rapidFireActive) {
                turret.fireRateMultiplier = 2;
            } else {
                turret.fireRateMultiplier = 1;
            }
            
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

        this.powerUps = this.powerUps.filter(powerUp => {
            if (!powerUp.collected) {
                powerUp.timeLeft--;
                return powerUp.timeLeft > 0;
            }
            return false;
        });

        if (this.enemies.length === 0) {
            this.waveInProgress = false;
            setTimeout(() => this.spawnWave(), 3000);
        }

        if (this.lives <= 0) {
            alert('Game Over! Score: ' + this.score);
            location.reload();
            return;
        }

        requestAnimationFrame(this.gameLoop.bind(this));
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
}

window.addEventListener('load', () => {
    const game = new Game();
    game.start();
    window.game = game;
});
