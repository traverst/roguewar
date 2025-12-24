/**
 * Sprite rendering functions for different monster types
 */

export class SpriteRenderer {
    static renderSprite(
        ctx: CanvasRenderingContext2D,
        template: string,
        x: number,
        y: number,
        color: string,
        entity: any
    ): void {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        switch (template) {
            case 'goblin':
                SpriteRenderer.drawGoblin(ctx, x, y, color, entity);
                break;
            case 'orc':
                SpriteRenderer.drawOrc(ctx, x, y, color, entity);
                break;
            case 'skeleton':
                SpriteRenderer.drawSkeleton(ctx, x, y, color, entity);
                break;
            case 'ghost':
                SpriteRenderer.drawGhost(ctx, x, y, color, entity);
                break;
            case 'demon':
                SpriteRenderer.drawDemon(ctx, x, y, color, entity);
                break;
            case 'dragon':
                SpriteRenderer.drawDragon(ctx, x, y, color, entity);
                break;
            case 'slime':
                SpriteRenderer.drawSlime(ctx, x, y, color, entity);
                break;
            case 'elf':
                SpriteRenderer.drawElf(ctx, x, y, color, entity);
                break;
            case 'dwarf':
                SpriteRenderer.drawDwarf(ctx, x, y, color, entity);
                break;
            case 'gnome':
                SpriteRenderer.drawGnome(ctx, x, y, color, entity);
                break;
            case 'zombie':
                SpriteRenderer.drawZombie(ctx, x, y, color, entity);
                break;
            case 'vampire':
                SpriteRenderer.drawVampire(ctx, x, y, color, entity);
                break;
            default:
                SpriteRenderer.drawGoblin(ctx, x, y, color, entity);
        }

        // Health bar (common to all)
        SpriteRenderer.drawHealthBar(ctx, x, y + 35, entity.hp, entity.maxHp);
    }

    private static drawGoblin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 25;
        SpriteRenderer.drawIsoCube(ctx, x, y, size, color);
        SpriteRenderer.drawEyes(ctx, x, y - 5, 8, entity.aiBehavior?.aggressionLevel || 0.5);
        if (entity.attack > 30) SpriteRenderer.drawSword(ctx, x + 20, y + 10);
    }

    private static drawOrc(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 28;
        SpriteRenderer.drawIsoCube(ctx, x, y, size, color);

        // Tusks
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x - 12, y + 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 8, y);
        ctx.lineTo(x + 12, y + 5);
        ctx.stroke();

        SpriteRenderer.drawEyes(ctx, x, y - 8, 10, entity.aiBehavior?.aggressionLevel || 0.7);
    }

    private static drawSkeleton(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        // Skull
        ctx.fillStyle = '#e6e6e6';
        ctx.beginPath();
        ctx.arc(x, y - 15, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye sockets
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 8, y - 18, 5, 7);
        ctx.fillRect(x + 3, y - 18, 5, 7);

        // Ribcage
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 10, y + i * 5);
            ctx.lineTo(x + 10, y + i * 5);
            ctx.stroke();
        }
    }

    private static drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI);
        ctx.lineTo(x + 20, y + 25);
        ctx.quadraticCurveTo(x + 15, y + 20, x + 10, y + 25);
        ctx.quadraticCurveTo(x, y + 20, x - 10, y + 25);
        ctx.quadraticCurveTo(x - 15, y + 20, x - 20, y + 25);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Glowing eyes
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(x - 7, y - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 7, y - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    private static drawDemon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 28;
        SpriteRenderer.drawIsoCube(ctx, x, y, size, color);

        // Horns
        ctx.fillStyle = '#330000';
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 20);
        ctx.lineTo(x - 12, y - 12);
        ctx.lineTo(x - 15, y - 25);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 18, y - 20);
        ctx.lineTo(x + 12, y - 12);
        ctx.lineTo(x + 15, y - 25);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(x - 8, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    private static drawDragon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 32;
        SpriteRenderer.drawIsoCube(ctx, x, y, size, color);

        // Wings
        ctx.fillStyle = SpriteRenderer.darkenColor(color, 30);
        ctx.beginPath();
        ctx.moveTo(x - 25, y);
        ctx.quadraticCurveTo(x - 40, y - 10, x - 35, y + 15);
        ctx.lineTo(x - 20, y + 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 25, y);
        ctx.quadraticCurveTo(x + 40, y - 10, x + 35, y + 15);
        ctx.lineTo(x + 20, y + 5);
        ctx.fill();

        // Head
        ctx.fillStyle = SpriteRenderer.lightenColor(color, 20);
        ctx.beginPath();
        ctx.arc(x, y - 25, 12, 0, Math.PI * 2);
        ctx.fill();

        // Fire breath
        if (entity.attack > 40) {
            ctx.fillStyle = '#ff6600';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff6600';
            ctx.fillRect(x - 5, y - 35, 3, 8);
            ctx.fillRect(x + 2, y - 35, 3, 8);
            ctx.shadowBlur = 0;
        }
    }

    private static drawSlime(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(x, y + 10, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Shine
        ctx.fillStyle = SpriteRenderer.lightenColor(color, 80);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x - 8, y - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x - 8, y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    private static drawElf(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 23;
        SpriteRenderer.drawIsoCube(ctx, x, y, size, color);

        // Pointed ears
        ctx.fillStyle = SpriteRenderer.lightenColor(color, 40);
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 10);
        ctx.lineTo(x - 14, y - 15);
        ctx.lineTo(x - 12, y - 8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 18, y - 10);
        ctx.lineTo(x + 14, y - 15);
        ctx.lineTo(x + 12, y - 8);
        ctx.fill();

        SpriteRenderer.drawEyes(ctx, x, y - 5, 6, 0.3);

        // Bow for ranged
        if (entity.aiBehavior?.attackRange && entity.aiBehavior.attackRange > 2) {
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 25, y);
            ctx.quadraticCurveTo(x - 30, y + 10, x - 25, y + 20);
            ctx.stroke();
        }
    }

    private static drawDwarf(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 22;
        SpriteRenderer.drawIsoCube(ctx, x, y + 5, size, color);

        // Beard
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.quadraticCurveTo(x, y + 15, x + 12, y);
        ctx.lineTo(x + 10, y - 5);
        ctx.lineTo(x - 10, y - 5);
        ctx.closePath();
        ctx.fill();

        // Helmet
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(x, y - 10, 13, Math.PI, 0);
        ctx.fill();

        // Axe
        if (entity.attack > 25) {
            ctx.fillStyle = '#666666';
            ctx.fillRect(x + 18, y + 5, 3, 15);
            ctx.fillStyle = '#888888';
            ctx.beginPath();
            ctx.moveTo(x + 15, y + 5);
            ctx.lineTo(x + 25, y);
            ctx.lineTo(x + 25, y + 8);
            ctx.fill();
        }
    }

    private static drawGnome(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 18;
        SpriteRenderer.drawIsoCube(ctx, x, y + 8, size, color);

        // Pointy hat
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 10);
        ctx.lineTo(x, y - 28);
        ctx.lineTo(x + 12, y - 10);
        ctx.closePath();
        ctx.fill();

        // Beard
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI);
        ctx.fill();

        SpriteRenderer.drawEyes(ctx, x, y - 5, 5, 0.2);
    }

    private static drawZombie(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 25;
        SpriteRenderer.drawIsoCube(ctx, x, y, size, '#6b8e23');

        // Torn clothes
        ctx.fillStyle = '#4a5f1a';
        ctx.fillRect(x - 10, y, 8, 12);
        ctx.fillRect(x + 5, y + 8, 6, 10);

        // Dead eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 8, y - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 9, y - 6, 2, 3);
        ctx.fillRect(x + 7, y - 6, 2, 3);

        // Drool
        ctx.strokeStyle = '#2d3a0f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 5);
        ctx.lineTo(x - 7, y + 12);
        ctx.stroke();
    }

    private static drawVampire(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, entity: any): void {
        const size = 26;
        SpriteRenderer.drawIsoCube(ctx, x, y, size, '#2c0000');

        // Cape
        ctx.fillStyle = '#660000';
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 10);
        ctx.quadraticCurveTo(x - 35, y + 10, x - 25, y + 30);
        ctx.lineTo(x - 15, y + 15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 20, y - 10);
        ctx.quadraticCurveTo(x + 35, y + 10, x + 25, y + 30);
        ctx.lineTo(x + 15, y + 15);
        ctx.closePath();
        ctx.fill();

        // Pale face
        ctx.fillStyle = '#eeeeee';
        ctx.beginPath();
        ctx.arc(x, y - 8, 10, 0, Math.PI * 2);
        ctx.fill();

        // Glowing red eyes
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(x - 4, y - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 4, y - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Fangs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 5, y - 3, 2, 4);
        ctx.fillRect(x + 3, y - 3, 2, 4);
    }

    // Helper functions
    private static drawIsoCube(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
        // Top face
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y - size / 2);
        ctx.lineTo(x, y);
        ctx.lineTo(x - size, y - size / 2);
        ctx.closePath();
        ctx.fillStyle = SpriteRenderer.lightenColor(color, 40);
        ctx.fill();
        ctx.strokeStyle = SpriteRenderer.darkenColor(color, 40);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Left face
        ctx.beginPath();
        ctx.moveTo(x - size, y - size / 2);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y + size / 2);
        ctx.closePath();
        ctx.fillStyle = SpriteRenderer.darkenColor(color, 10);
        ctx.fill();
        ctx.stroke();

        // Right face
        ctx.beginPath();
        ctx.moveTo(x + size, y - size / 2);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x + size, y + size / 2);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
    }

    private static drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, spacing: number, aggression: number): void {
        const eyeColor = aggression > 0.7 ? '#ff0000' : aggression > 0.4 ? '#ffaa00' : '#ffffff';
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(x - spacing / 2, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + spacing / 2, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    private static drawSword(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 15, y + 15);
        ctx.stroke();
        ctx.fillStyle = '#666666';
        ctx.fillRect(x - 2, y - 2, 4, 4);
    }

    private static drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number): void {
        const hpPercent = hp / maxHp;
        const barWidth = 60;
        const barHeight = 4;
        const barX = x - barWidth / 2;

        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, y, barWidth, barHeight);

        const hpColor = hpPercent > 0.6 ? '#3fb950' : hpPercent > 0.3 ? '#d29922' : '#f85149';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, y, barWidth * hpPercent, barHeight);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, y, barWidth, barHeight);
    }

    private static lightenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 0xff) + percent);
        const g = Math.min(255, ((num >> 8) & 0xff) + percent);
        const b = Math.min(255, (num & 0xff) + percent);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    private static darkenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, ((num >> 16) & 0xff) - percent);
        const g = Math.max(0, ((num >> 8) & 0xff) - percent);
        const b = Math.max(0, (num & 0xff) - percent);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
}
