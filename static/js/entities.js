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

        // Draw health bar
        ctx.fillStyle = this.frozen ? '#00ffff' : '#0f0';
        ctx.fillRect(this.x - 15, this.y - 25, 
            (30 * this.health / this.maxHealth), 5);
            
        // Draw freeze effect
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
        this.frozenTimer = 60;  // Freeze for 60 frames
        this.speed = this.originalSpeed * 0.5;  // Slow down by 50%
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

        // Set properties based on type
        switch(type) {
            case 'laser':
                this.damage = 1;  // Per frame
                this.fireRate = 0;  // Continuous
                this.range = 200;
                this.cost = 100;
                break;
            case 'instant':
                this.damage = 1000;  // One-shot kill
                this.fireRate = 2000;  // 2 seconds
                this.range = 150;
                this.cost = 200;
                break;
            case 'freeze':
                this.damage = 5;
                this.fireRate = 500;
                this.range = 100;
                this.cost = 25;
                break;
            default:  // Basic turret
                this.damage = 25;
                this.fireRate = 1000;
                this.range = 150;
                this.cost = 75;
        }
        
        this.lastFired = 0;
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
        
        const turretImg = document.getElementById(`${this.type}TurretImg`) || document.getElementById('turretImg');
        ctx.drawImage(turretImg, -20, -20, 40, 40);

        // Draw special effects based on turret type
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
                
                // Add glow effect
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
                
                // Add snowflake effect
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
