/**
 * UnlockNotification - Toast-style notification for unlocked content
 */
export class UnlockNotification {
    /**
     * Show an unlock notification
     */
    static show(contentName: string, contentDescription: string): void {
        const notification = document.createElement('div');
        notification.className = 'unlock-notification';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #2a4a2a 0%, #1a3a1a 100%);
            color: #4f6;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #4f6;
            box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
            font-family: 'Inter', sans-serif;
            z-index: 10000;
            min-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="font-size: 0.9rem; color: #8f8; margin-bottom: 5px;">🎉 UNLOCKED!</div>
            <div style="font-weight: bold; font-size: 1.2rem; margin-bottom: 8px;">${contentName}</div>
            <div style="font-size: 0.85rem; color: #aaa;">${contentDescription}</div>
        `;

        // Add CSS animation
        if (!document.getElementById('unlock-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'unlock-notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    /**
     * Show multiple unlock notifications in sequence
     */
    static showMultiple(unlocks: Array<{ name: string; description: string }>): void {
        unlocks.forEach((unlock, index) => {
            setTimeout(() => {
                UnlockNotification.show(unlock.name, unlock.description);
            }, index * 500); // Stagger by 500ms
        });
    }
}
