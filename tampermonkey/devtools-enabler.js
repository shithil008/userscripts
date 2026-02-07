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
 *   Tampermonkey: Add @require directive pointing to this file OR
 *   Add // @run-at document-start to your userscript
 *   Direct usage: Include script tag before other scripts
 *
 * Note: Only effective against client-side blocking methods
 */
(function() {
    'use strict';

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // Aggressive event protection - intercept in capture phase and stop propagation
    // This prevents the site's blocking code from ever running
    const protectedEvents = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'dragstart'];
    
    protectedEvents.forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            // Stop the event from reaching the site's blocking listeners
            e.stopImmediatePropagation();
            // Don't prevent default - let browser handle copy/paste/context menu normally
        }, true); // Capture phase - runs first!
    });

    // Also intercept on window for redundancy
    protectedEvents.forEach(eventType => {
        window.addEventListener(eventType, function(e) {
            e.stopImmediatePropagation();
        }, true);
    });

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

            // Allow copy (Ctrl/Cmd+C)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 67) {
                e.stopImmediatePropagation();
                return;
            }

            // Allow paste (Ctrl/Cmd+V)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 86) {
                e.stopImmediatePropagation();
                return;
            }

            // Allow cut (Ctrl/Cmd+X)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 88) {
                e.stopImmediatePropagation();
                return;
            }

            // Allow select all (Ctrl/Cmd+A)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 65) {
                e.stopImmediatePropagation();
                return;
            }
        }, true);
    });

    // Clear any inline event handlers that block functionality
    const clearBlockingHandlers = (element) => {
        if (!element) return;
        ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'ondragstart'].forEach(prop => {
            if (element[prop]) {
                element[prop] = null;
            }
        });
    };

    // Clear any inline event handlers that block functionality
    const clearAllBlockingHandlers = () => {
        const elements = [document, document.documentElement, document.body];
        elements.forEach(el => {
            if (el) clearBlockingHandlers(el);
        });
        
        // Clear from all elements
        document.querySelectorAll('*').forEach(clearBlockingHandlers);
    };

    // Run immediately
    clearAllBlockingHandlers();

    // Prevent page from setting new blocking handlers on document/body
    const blockingProps = ['onselectstart', 'ondragstart', 'oncontextmenu', 'oncut', 'oncopy', 'onpaste'];
    
    [document, document.documentElement, document.body].forEach(target => {
        if (!target) return;
        blockingProps.forEach(prop => {
            try {
                Object.defineProperty(target, prop, {
                    get: () => null,
                    set: () => {},
                    configurable: false
                });
            } catch(e) {}
        });
    });

    // Override user-select CSS property globally
    const injectStyles = () => {
        const style = document.createElement('style');
        style.id = 'copy-paste-enabler-style';
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
                pointer-events: auto !important;
            }
        `;
        (document.head || document.documentElement || document.body).appendChild(style);
    };

    // Inject styles immediately and after DOM loads
    if (document.documentElement) {
        injectStyles();
    }
    
    // Run cleanup after DOM loads
    const runAfterLoad = () => {
        if (!document.getElementById('copy-paste-enabler-style')) {
            injectStyles();
        }
        clearAllBlockingHandlers();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAfterLoad);
    } else {
        setTimeout(runAfterLoad, 0);
    }

    // Watch for dynamic content and clear blocking handlers
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        clearBlockingHandlers(node);
                        if (node.querySelectorAll) {
                            node.querySelectorAll('*').forEach(clearBlockingHandlers);
                        }
                    }
                });
            });
        });
        
        // Start observing when possible
        const startObserving = () => {
            const target = document.documentElement || document.body;
            if (target) {
                observer.observe(target, { childList: true, subtree: true });
            } else {
                setTimeout(startObserving, 10);
            }
        };
        startObserving();
    }

    // Bypass webdriver detection
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
})();
