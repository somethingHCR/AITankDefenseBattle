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
    constructor(x, y, type, createBullet, playSound) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.createBullet = createBullet;
        this.playSound = playSound;
        this.muzzleFlash = false;
        this.muzzleFlashDuration = 100;
        this.muzzleFlashStart = 0;
        this.rotation = 0;
        this.target = null;
        this.lastFired = 0;

        // Set properties based on turret type
        switch(type) {
            case 'basic':
                this.range = 150;
                this.damage = 25;
                this.fireRate = 1000;
                this.color = '#1a75ff';
                break;
            case 'sniper':
                this.range = 250;
                this.damage = 75;
                this.fireRate = 2000;
                this.color = '#ff3333';
                break;
            case 'rapid':
                this.range = 120;
                this.damage = 10;
                this.fireRate = 400;
                this.color = '#33cc33';
                break;
            case 'splash':
                this.range = 130;
                this.damage = 20;
                this.fireRate = 1500;
                this.color = '#ff9933';
                this.splashRadius = 50;
                break;
        }
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

            if (Date.now() - this.lastFired >= this.fireRate) {
                if (typeof this.createBullet === 'function') {
                    this.createBullet(
                        this.x, this.y,
                        this.target.x, this.target.y,
                        this.damage,
                        this.type === 'splash' ? this.splashRadius : 0
                    );
                    this.playSound('shoot');
                    this.muzzleFlash = true;
                    this.muzzleFlashStart = Date.now();
                    this.lastFired = Date.now();
                }
            }
        }
    }

    draw(ctx) {
        // Draw range indicator if mouse is over turret
        const mouseX = game.mouseX;
        const mouseY = game.mouseY;
        const distance = Math.sqrt(
            Math.pow(mouseX - this.x, 2) + 
            Math.pow(mouseY - this.y, 2)
        );
        
        if (distance < 20) {
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw turret base
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        // Draw turret barrel
        ctx.fillStyle = this.color;
        ctx.fillRect(-3, -20, 6, 20);

        if (this.muzzleFlash) {
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(0, -20, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, targetX, targetY, damage, splashRadius = 0) {
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.damage = damage;
        this.splashRadius = splashRadius;
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
    }

    draw(ctx) {
        ctx.fillStyle = this.splashRadius > 0 ? '#ff9933' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
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
