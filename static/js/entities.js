class Enemy {
    constructor(x, y, path, tileSize) {
        this.x = x;
        this.y = y;
        this.path = path;
        this.tileSize = tileSize;
        this.currentPathIndex = 0;
        this.speed = 2;
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.reachedEnd = false;
    }

    update() {
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
        // Draw enemy tank
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

        // Draw health bar
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 15, this.y - 25, 
            (30 * this.health / this.maxHealth), 5);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.isDead = true;
        }
    }
}

class Turret {
    constructor(x, y, createBullet, playSound) {
        this.x = x;
        this.y = y;
        this.range = 150;
        this.damage = 25;
        this.fireRate = 1000; // milliseconds
        this.lastFired = 0;
        this.target = null;
        this.createBullet = createBullet;
        this.playSound = playSound;
    }

    update(enemies) {
        // Find closest enemy in range
        this.target = null;
        let closestDistance = this.range;
        
        enemies.forEach(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + 
                Math.pow(enemy.y - this.y, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                this.target = enemy;
            }
        });

        // Fire at target
        if (this.target && Date.now() - this.lastFired >= this.fireRate) {
            this.createBullet(
                this.x, this.y,
                this.target.x, this.target.y,
                this.damage
            );
            this.playSound('shoot');
            this.lastFired = Date.now();
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#00f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();

        if (this.target) {
            ctx.strokeStyle = '#0ff';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.target.x, this.target.y);
            ctx.stroke();
        }
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
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
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
