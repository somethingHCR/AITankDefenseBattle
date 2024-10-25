class Enemy {
    constructor(x, y, path, tileSize) {
        this.x = x;
        this.y = y;
        this.path = path;
        this.tileSize = tileSize;
        this.currentPathIndex = 0;
        this.speed = 2.5;
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.reachedEnd = false;
        this.exploding = false;
        this.explosionFrame = 0;
        this.explosionMaxFrames = 10;
    }

    update() {
        if (this.exploding) {
            this.explosionFrame++;
            if (this.explosionFrame >= this.explosionMaxFrames) {
                this.isDead = true;
            }
            return;
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

        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 15, this.y - 25, 
            (30 * this.health / this.maxHealth), 5);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0 && !this.exploding) {
            this.exploding = true;
            this.explosionFrame = 0;
        }
    }
}

class Turret {
    constructor(x, y, createBullet, playSound) {
        this.x = x;
        this.y = y;
        this.range = 150;
        this.damage = 25;
        this.fireRate = 1000;
        this.lastFired = 0;
        this.target = null;
        this.createBullet = createBullet;
        this.playSound = playSound;
        this.muzzleFlash = false;
        this.muzzleFlashDuration = 100;
        this.muzzleFlashStart = 0;
        this.rotation = 0; // Added rotation property
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

        // Update rotation if there's a target
        if (this.target) {
            this.rotation = Math.atan2(
                this.target.y - this.y,
                this.target.x - this.x
            );
        }

        if (this.target && Date.now() - this.lastFired >= this.fireRate) {
            if (typeof this.createBullet === 'function') {
                this.createBullet(
                    this.x, this.y,
                    this.target.x, this.target.y,
                    this.damage
                );
                this.playSound('shoot');
                this.muzzleFlash = true;
                this.muzzleFlashStart = Date.now();
                this.lastFired = Date.now();
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const turretImg = document.getElementById('turretImg');
        ctx.drawImage(turretImg, -20, -20, 40, 40);

        if (this.muzzleFlash) {
            ctx.fillStyle = '#ffff00';
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
    constructor(x, y, targetX, targetY, damage) {
        this.x = x;
        this.y = y;
        this.speed = 10;
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
        const bulletImg = document.getElementById('bulletImg');
        ctx.drawImage(bulletImg, this.x - 5, this.y - 5, 10, 10);
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
