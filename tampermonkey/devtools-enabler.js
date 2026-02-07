/**
 * DevTools & Context Menu Enabler
 * Re-enables blocked developer tools shortcuts and context menus
 * Can be loaded via Tampermonkey @require or directly included
 *
 * Features:
 *   - Re-enables F12 (Developer Tools)
 *   - Re-enables Cmd/Ctrl+Option/Shift+I (Inspect Element) - macOS/Windows/Linux
 *   - Re-enables Cmd/Ctrl+Option/Shift+J (Open Console) - macOS/Windows/Linux
 *   - Re-enables Cmd/Ctrl+U (View Page Source) - macOS/Windows/Linux
 *   - Re-enables right-click context menu
 *   - Bypasses common blocking methods
 *   - Defeats basic webdriver detection
 *
 * Installation:
 *   Tampermonkey: Add @require directive pointing to this file
 *   Direct usage: Include script tag before other scripts
 *
 * Note: Only effective against client-side blocking methods
 */
(function() {
    'use strict';

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // Handle keyboard shortcuts
    ['keydown', 'keypress', 'keyup'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            // Allow F12 (Developer Tools) - All OS
            if (e.keyCode === 123 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.stopImmediatePropagation();
                return;
            }

            // Allow Inspect Element shortcuts - All OS
            if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && e.keyCode === 73) {
                e.stopImmediatePropagation();
                return;
            }

            // Allow Console shortcuts - All OS
            if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && e.keyCode === 74) {
                e.stopImmediatePropagation();
                return;
            }

            // Allow View Source shortcuts - All OS
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
                e.stopImmediatePropagation();
                return;
            }
        }, true);
    });

    // Re-enable context menu (right-click) - Multiple approaches
    ['contextmenu', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            if (e.type === 'contextmenu' || e.button === 2) {
                e.stopImmediatePropagation();
                e.stopPropagation();
                e.preventDefault();
                return false;
            } else {
                e.stopImmediatePropagation();
            }
        }, true);
    });

    // Override existing context menu handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'contextmenu') {
            return; // Don't allow new contextmenu listeners
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // Additional protection against common blocking patterns
    ['oncontextmenu', 'onselectstart', 'ondragstart'].forEach(prop => {
        Object.defineProperty(document, prop, {
            get: () => null,
            set: () => {},
            configurable: true
        });
    });

    // Bypass webdriver detection
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
})();
