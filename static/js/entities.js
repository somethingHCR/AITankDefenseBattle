class Enemy {
    constructor(x, y, path, tileSize) {
        this.x = x;
        this.y = y;
        this.path = path;
        this.tileSize = tileSize;
        this.currentPathIndex = 0;
        this.speed = 2.5;
        this.originalSpeed = 2.5;
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.reachedEnd = false;
        this.exploding = false;
        this.explosionFrame = 0;
        this.explosionMaxFrames = 10;
        this.frozen = false;
        this.frozenTimer = 0;
    }

    update() {
        if (this.exploding) {
            this.explosionFrame++;
            if (this.explosionFrame >= this.explosionMaxFrames) {
                this.isDead = true;
            }
            return;
        }

        if (this.frozen) {
            this.frozenTimer--;
            if (this.frozenTimer <= 0) {
                this.frozen = false;
                this.speed = this.originalSpeed;
            }
        }

        if (this.currentPathIndex >= this.path.length) {
            this.reachedEnd = true;
            return;
        }

        const targetX = this.path[this.currentPathIndex].x * this.tileSize;
        const targetY = this.path[this.currentPathIndex].y * this.tileSize;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.currentPathIndex++;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw(ctx) {
        if (this.exploding) {
            const explosionProgress = this.explosionFrame / this.explosionMaxFrames;
            const radius = 30 * explosionProgress;
            const alpha = 1 - explosionProgress;
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            return;
        }

        const tankImg = document.getElementById('tankImg');
        ctx.drawImage(tankImg, this.x - 20, this.y - 20, 40, 40);

        ctx.fillStyle = this.frozen ? '#00ffff' : '#0f0';
        ctx.fillRect(this.x - 15, this.y - 25, 
            (30 * this.health / this.maxHealth), 5);
            
        if (this.frozen) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                ctx.moveTo(this.x + Math.cos(angle) * 15, 
                          this.y + Math.sin(angle) * 15);
                ctx.lineTo(this.x + Math.cos(angle) * 25, 
                          this.y + Math.sin(angle) * 25);
            }
            ctx.stroke();
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0 && !this.exploding) {
            this.exploding = true;
            this.explosionFrame = 0;
        }
    }

    freeze() {
        this.frozen = true;
        this.frozenTimer = 60;
        this.speed = this.originalSpeed * 0.5;
    }
}

class Turret {
    constructor(x, y, type, createBullet, playSound) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.createBullet = createBullet;
        this.playSound = playSound;
        this.target = null;
        this.rotation = 0;
        this.muzzleFlash = false;
        this.muzzleFlashDuration = 100;
        this.muzzleFlashStart = 0;
        this.level = 1;
        this.maxLevel = 3;
        this.isSelected = false;

        this.setStats();
    }

    setStats() {
        const baseStats = {
            'laser': {
                damage: 1,
                fireRate: 0,
                range: 200,
                cost: 100,
                upgradeCost: 75
            },
            'instant': {
                damage: 1000,
                fireRate: 2000,
                range: 150,
                cost: 200,
                upgradeCost: 150
            },
            'freeze': {
                damage: 5,
                fireRate: 500,
                range: 100,
                cost: 25,
                upgradeCost: 25
            },
            'basic': {
                damage: 25,
                fireRate: 1000,
                range: 150,
                cost: 75,
                upgradeCost: 50
            }
        };

        const stats = baseStats[this.type] || baseStats.basic;
        const levelMultiplier = 1 + (this.level - 1) * 0.5;

        this.damage = stats.damage * levelMultiplier;
        this.fireRate = Math.max(stats.fireRate / levelMultiplier, 100);
        this.range = stats.range * levelMultiplier;
        this.cost = stats.cost;
        this.upgradeCost = stats.upgradeCost * this.level;
        
        this.lastFired = 0;
    }

    upgrade() {
        if (this.level < this.maxLevel) {
            this.level++;
            this.setStats();
            return true;
        }
        return false;
    }

    getUpgradeInfo() {
        if (this.level >= this.maxLevel) {
            return {
                canUpgrade: false,
                cost: 0,
                nextLevel: null
            };
        }

        return {
            canUpgrade: true,
            cost: this.upgradeCost,
            nextLevel: {
                damage: this.damage * 1.5,
                fireRate: this.fireRate * 0.75,
                range: this.range * 1.5
            }
        };
    }

    update(enemies) {
        if (this.muzzleFlash && Date.now() - this.muzzleFlashStart > this.muzzleFlashDuration) {
            this.muzzleFlash = false;
        }

        this.target = null;
        let closestDistance = this.range;
        
        enemies.forEach(enemy => {
            if (!enemy.exploding) {
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.x, 2) + 
                    Math.pow(enemy.y - this.y, 2)
                );
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    this.target = enemy;
                }
            }
        });

        if (this.target) {
            this.rotation = Math.atan2(
                this.target.y - this.y,
                this.target.x - this.x
            ) + Math.PI/2;

            const now = Date.now();
            if (now - this.lastFired >= this.fireRate) {
                switch(this.type) {
                    case 'laser':
                        if (this.target) {
                            this.target.takeDamage(this.damage);
                        }
                        break;
                    case 'instant':
                        if (typeof this.createBullet === 'function') {
                            this.createBullet(
                                this.x, this.y,
                                this.target.x, this.target.y,
                                this.damage,
                                this.type
                            );
                            this.playSound('shoot');
                            this.muzzleFlash = true;
                            this.muzzleFlashStart = now;
                        }
                        break;
                    case 'freeze':
                        if (typeof this.createBullet === 'function') {
                            this.createBullet(
                                this.x, this.y,
                                this.target.x, this.target.y,
                                this.damage,
                                this.type
                            );
                            this.playSound('shoot');
                            this.target.freeze();
                        }
                        break;
                    default:
                        if (typeof this.createBullet === 'function') {
                            this.createBullet(
                                this.x, this.y,
                                this.target.x, this.target.y,
                                this.damage,
                                this.type
                            );
                            this.playSound('shoot');
                            this.muzzleFlash = true;
                            this.muzzleFlashStart = now;
                        }
                }
                this.lastFired = now;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (this.isSelected) {
            ctx.beginPath();
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 15;
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
        }

        const turretImg = document.getElementById(`${this.type}TurretImg`) || document.getElementById('turretImg');
        ctx.drawImage(turretImg, -20, -20, 40, 40);

        if (this.target) {
            if (this.type === 'laser') {
                ctx.beginPath();
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const angle = Math.atan2(dy, dx) - this.rotation;
                ctx.moveTo(0, 0);
                const distance = Math.sqrt(dx * dx + dy * dy);
                ctx.lineTo(distance * Math.cos(angle), distance * Math.sin(angle));
                ctx.stroke();
                
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.lineWidth = 6;
                ctx.stroke();
            }
        }

        if (this.muzzleFlash) {
            let flashColor;
            switch(this.type) {
                case 'instant':
                    flashColor = '#ff0000';
                    break;
                case 'freeze':
                    flashColor = '#00ffff';
                    break;
                default:
                    flashColor = '#ffff00';
            }
            ctx.fillStyle = flashColor;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';
        ctx.fillText(this.level, 0, 0);

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, targetX, targetY, damage, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.speed = type === 'instant' ? 15 : 10;
        this.damage = damage;
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
    }

    draw(ctx) {
        switch(this.type) {
            case 'instant':
                ctx.fillStyle = '#ff0000';
                ctx.strokeStyle = '#ff6666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'freeze':
                ctx.fillStyle = '#b3e0ff';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    ctx.beginPath();
                    ctx.moveTo(
                        this.x + Math.cos(angle) * 3,
                        this.y + Math.sin(angle) * 3
                    );
                    ctx.lineTo(
                        this.x + Math.cos(angle) * 6,
                        this.y + Math.sin(angle) * 6
                    );
                    ctx.stroke();
                }
                break;
            default:
                const bulletImg = document.getElementById('bulletImg');
                ctx.drawImage(bulletImg, this.x - 5, this.y - 5, 10, 10);
        }
    }

    checkCollision(enemy) {
        const distance = Math.sqrt(
            Math.pow(enemy.x - this.x, 2) + 
            Math.pow(enemy.y - this.y, 2)
        );
        return distance < 20;
    }

    isOffscreen(canvasWidth, canvasHeight) {
        return (
            this.x < 0 || 
            this.x > canvasWidth ||
            this.y < 0 || 
            this.y > canvasHeight
        );
    }
}