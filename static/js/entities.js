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

    // ... keep existing methods ...
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
        this.damageMultiplier = 1;
        this.fireRateMultiplier = 1;
        this.health = 100;
        this.maxHealth = 100;

        this.setStats();
    }

    repair() {
        this.health = this.maxHealth;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            return true; // Turret destroyed
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const turretImg = document.getElementById(`${this.type}TurretImg`) || document.getElementById('turretImg');
        ctx.drawImage(turretImg, -20, -20, 40, 40);

        // Draw health bar
        ctx.rotate(-this.rotation); // Reset rotation for health bar
        ctx.fillStyle = '#0f0';
        ctx.fillRect(-15, -25, (30 * this.health / this.maxHealth), 3);

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

        ctx.restore();
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
            const adjustedFireRate = this.fireRate / this.fireRateMultiplier;
            
            if (now - this.lastFired >= adjustedFireRate) {
                const adjustedDamage = this.damage * this.damageMultiplier;
                
                switch(this.type) {
                    case 'laser':
                        if (this.target) {
                            this.target.takeDamage(adjustedDamage);
                        }
                        break;
                    case 'instant':
                    case 'freeze':
                    default:
                        if (typeof this.createBullet === 'function') {
                            this.createBullet(
                                this.x, this.y,
                                this.target.x, this.target.y,
                                adjustedDamage,
                                this.type
                            );
                            if (this.type === 'freeze') {
                                this.target.freeze();
                            }
                            this.playSound('shoot');
                            this.muzzleFlash = true;
                            this.muzzleFlashStart = now;
                        }
                }
                this.lastFired = now;
            }
        }
    }

    // ... keep other existing methods ...
}

class Bullet {
    // ... keep existing class implementation ...
}
