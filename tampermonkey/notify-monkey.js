/**
 * Notification System Library
 * A flexible notification system for web applications
 * Can be loaded via Tampermonkey @require or directly included
 * 
 * Usage:
 *   window.notify.success('Message', 'Title', 3000);
 *   window.notify.error('Message', 'Title', 5000);
 *   window.notify.warning('Message', 'Title', 4000);
 *   window.notify.info('Message', 'Title', 3000);
 *   
 *   window.notify.show({
 *     title: 'Custom',
 *     message: 'Your message',
 *     type: 'info',
 *     duration: 5000,
 *     closable: true
 *   });
 */

(function() {
    'use strict';

    // Prevent double initialization
    if (window.notify && window.notify.initialized) {
        console.log('Notification System already initialized');
        return;
    }

    // Add CSS styles for notifications
    const style = document.createElement('style');
    style.textContent = `
        .tm-notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        }

        .tm-close-all-btn {
            position: fixed;
            top: 20px;
            right: 380px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            z-index: 999999;
            transition: all 0.3s;
            opacity: 0;
            visibility: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .tm-close-all-btn.visible {
            opacity: 1;
            visibility: visible;
        }

        .tm-close-all-btn:hover {
            background: rgba(0, 0, 0, 0.95);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .tm-notification {
            background: #333;
            color: #fff;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            position: relative;
            overflow: hidden;
        }

        .tm-notification.closing {
            animation: slideOut 0.3s ease-out forwards;
        }

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

        .tm-notification-content {
            flex: 1;
            font-size: 14px;
            line-height: 1.4;
        }

        .tm-notification-title {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .tm-notification-message {
            opacity: 0.9;
        }

        .tm-notification-close {
            background: transparent;
            border: none;
            color: #fff;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background 0.2s;
            flex-shrink: 0;
        }

        .tm-notification-close:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .tm-notification-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            width: 100%;
            transform-origin: left;
        }

        .tm-notification.success {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .tm-notification.error {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .tm-notification.warning {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            color: #333;
        }

        .tm-notification.warning .tm-notification-close {
            color: #333;
        }

        .tm-notification.info {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
    `;
    document.head.appendChild(style);

    // Wait for DOM to be ready
    const initNotificationSystem = () => {
        // Ensure body exists
        if (!document.body) {
            setTimeout(initNotificationSystem, 10);
            return;
        }

        // Create notification container
        let container = document.querySelector('.tm-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'tm-notification-container';
            document.body.appendChild(container);
        }

        // Create close all button
        let closeAllBtn = document.querySelector('.tm-close-all-btn');
        if (!closeAllBtn) {
            closeAllBtn = document.createElement('button');
            closeAllBtn.className = 'tm-close-all-btn';
            closeAllBtn.textContent = 'Close All';
            closeAllBtn.title = 'Close all notifications';
            document.body.appendChild(closeAllBtn);
        }

        // Notification class
        class NotificationSystem {
            constructor() {
                this.notifications = [];
                this.closeAllBtn = closeAllBtn;
                this.closeAllBtn.onclick = () => this.closeAll();
                this.initialized = true;
            }

            updateCloseAllButton() {
                if (this.notifications.length >= 2) {
                    this.closeAllBtn.classList.add('visible');
                } else {
                    this.closeAllBtn.classList.remove('visible');
                }
            }

            show(options) {
                const {
                    title = '',
                    message = '',
                    type = 'info', // success, error, warning, info
                    duration = 0, // 0 means no auto-close, otherwise milliseconds
                    closable = true,
                    fontSize = 14 // Font size in pixels
                } = options;

                // Create notification element
                const notification = document.createElement('div');
                notification.className = `tm-notification ${type}`;

                // Content
                const content = document.createElement('div');
                content.className = 'tm-notification-content';
                content.style.fontSize = `${fontSize}px`;
                
                if (title) {
                    const titleEl = document.createElement('div');
                    titleEl.className = 'tm-notification-title';
                    titleEl.textContent = title;
                    content.appendChild(titleEl);
                }

                if (message) {
                    const messageEl = document.createElement('div');
                    messageEl.className = 'tm-notification-message';
                    messageEl.textContent = message;
                    content.appendChild(messageEl);
                }

                notification.appendChild(content);

                // Close button
                if (closable) {
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'tm-notification-close';
                    closeBtn.innerHTML = '×';
                    closeBtn.onclick = () => this.close(notification);
                    notification.appendChild(closeBtn);
                }

                // Progress bar for auto-close
                if (duration > 0) {
                    const progress = document.createElement('div');
                    progress.className = 'tm-notification-progress';
                    notification.appendChild(progress);

                    // Animate progress bar
                    progress.style.transition = `transform ${duration}ms linear`;
                    setTimeout(() => {
                        progress.style.transform = 'scaleX(0)';
                    }, 10);

                    // Auto-close
                    setTimeout(() => {
                        this.close(notification);
                    }, duration);
                }

                // Add to container (new notifications appear at the bottom)
                container.appendChild(notification);
                this.notifications.push(notification);
                this.updateCloseAllButton();

                return notification;
            }

            close(notification) {
                notification.classList.add('closing');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                    this.notifications = this.notifications.filter(n => n !== notification);
                    this.updateCloseAllButton();
                }, 300);
            }

            closeAll() {
                // Create a copy of the array to avoid modification during iteration
                const notificationsToClose = [...this.notifications];
                notificationsToClose.forEach(n => this.close(n));
            }

            success(message, title = 'Success', duration = 3000, fontSize = 14) {
                return this.show({ title, message, type: 'success', duration, fontSize });
            }

            error(message, title = 'Error', duration = 5000, fontSize = 14) {
                return this.show({ title, message, type: 'error', duration, fontSize });
            }

            warning(message, title = 'Warning', duration = 4000, fontSize = 14) {
                return this.show({ title, message, type: 'warning', duration, fontSize });
            }

            info(message, title = 'Info', duration = 3000, fontSize = 14) {
                return this.show({ title, message, type: 'info', duration, fontSize });
            }
        }

        // Make it globally available
        window.notify = new NotificationSystem();
        console.log('Notification System initialized');
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotificationSystem);
    } else {
        initNotificationSystem();
    }

})();
