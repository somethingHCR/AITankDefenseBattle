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

    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            if (powerUp.collected) return;
            
            ctx.beginPath();
            ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
            
            switch(powerUp.type) {
                case 'doubleDamage':
                    ctx.fillStyle = '#ff4444';
                    break;
                case 'rapidFire':
                    ctx.fillStyle = '#44ff44';
                    break;
                case 'money':
                    ctx.fillStyle = '#ffff44';
                    break;
            }
            
            ctx.fill();
            ctx.stroke();
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

    // Update the existing gameLoop method
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

        // Update bullets
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

        // Update power-ups array
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

        requestAnimationFrame(this.gameLoop);
    }

    // Update the existing handleClick method
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
                
                const boundCreateBullet = (startX, startY, targetX, targetY, damage, type) => {
                    this.createBullet(startX, startY, targetX, targetY, damage, type);
                };
                
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

    // Keep all other existing methods...
}

window.addEventListener('load', () => {
    const game = new Game();
    game.start();
    window.game = game;
});
