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
 *   - Enables text selection (including double-click selection)
 *   - Enables copy/paste in input fields
 *   - Preserves normal element interactions (buttons, links, etc.)
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

    // Re-enable context menu (right-click)
    document.addEventListener('contextmenu', function(e) {
        e.stopImmediatePropagation();
    }, true);

    // Re-enable copy/paste/cut operations
    ['copy', 'paste', 'cut'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            e.stopImmediatePropagation();
        }, true);
    });

    // Re-enable text selection
    ['selectstart', 'mousedown'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            e.stopImmediatePropagation();
        }, true);
    });

    // Store original methods for later use
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    // Override addEventListener to block registration of blocking listeners
    const blockEvents = ['selectstart', 'dragstart', 'cut', 'copy', 'paste', 'contextmenu'];
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (blockEvents.includes(type)) {
            // Ignore attempts to add blocking listeners
            return;
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // Prevent page from disabling text selection/context menu/copy-paste
    ['onselectstart', 'ondragstart', 'oncontextmenu', 'oncut', 'oncopy', 'onpaste'].forEach(prop => {
        Object.defineProperty(document, prop, {
            get: () => null,
            set: () => {},
            configurable: true
        });
    });

    // Override user-select CSS property globally
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
        input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    // Enable copy/paste on input fields specifically
    const enableInputs = () => {
        document.querySelectorAll('input, textarea').forEach(input => {
            ['oncopy', 'onpaste', 'oncut', 'oncontextmenu', 'onselectstart'].forEach(prop => {
                if (input[prop]) {
                    input[prop] = null;
                }
            });
            // Remove readonly/disabled attributes that might be used to block paste
            if (input.hasAttribute('oncopy') || input.hasAttribute('onpaste')) {
                input.removeAttribute('oncopy');
                input.removeAttribute('onpaste');
                input.removeAttribute('oncut');
            }
        });
    };

    // Run immediately and observe for dynamically added inputs
    enableInputs();
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(enableInputs);
        observer.observe(document.documentElement || document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    // Bypass webdriver detection
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
})();
