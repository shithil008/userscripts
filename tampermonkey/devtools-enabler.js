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

    // Override Event.prototype.preventDefault for copy/paste/cut events
    const originalPreventDefault = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function() {
        // Allow copy/paste/cut/contextmenu/selectstart to work despite preventDefault calls
        if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
            return;
        }
        return originalPreventDefault.apply(this, arguments);
    };

    // Override Event.prototype.stopPropagation for selection events
    const originalStopPropagation = Event.prototype.stopPropagation;
    Event.prototype.stopPropagation = function() {
        if (['selectstart', 'copy', 'cut', 'paste'].includes(this.type)) {
            return;
        }
        return originalStopPropagation.apply(this, arguments);
    };

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

    // Clear handlers on document and body
    clearBlockingHandlers(document);
    clearBlockingHandlers(document.body);
    clearBlockingHandlers(document.documentElement);

    // Prevent page from setting blocking handlers
    ['onselectstart', 'ondragstart', 'oncontextmenu', 'oncut', 'oncopy', 'onpaste'].forEach(prop => {
        Object.defineProperty(document, prop, {
            get: () => null,
            set: () => {},
            configurable: true
        });
        Object.defineProperty(document.body || {}, prop, {
            get: () => null,
            set: () => {},
            configurable: true
        });
    });

    // Override addEventListener to neutralize blocking listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        // For blocking events, wrap the listener to prevent it from blocking
        if (['copy', 'cut', 'paste', 'selectstart', 'contextmenu'].includes(type)) {
            const wrappedListener = function(e) {
                // Temporarily disable preventDefault and stopPropagation
                const origPD = e.preventDefault;
                const origSP = e.stopPropagation;
                const origSIP = e.stopImmediatePropagation;
                
                e.preventDefault = () => {};
                e.stopPropagation = () => {};
                e.stopImmediatePropagation = () => {};
                
                try {
                    listener.call(this, e);
                } finally {
                    // Restore original methods
                    e.preventDefault = origPD;
                    e.stopPropagation = origSP;
                    e.stopImmediatePropagation = origSIP;
                }
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

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

    // Enable copy/paste on input fields and all elements
    const enableElements = () => {
        document.querySelectorAll('*').forEach(el => {
            clearBlockingHandlers(el);
            // Remove blocking attributes
            if (el.hasAttribute('oncopy')) el.removeAttribute('oncopy');
            if (el.hasAttribute('onpaste')) el.removeAttribute('onpaste');
            if (el.hasAttribute('oncut')) el.removeAttribute('oncut');
            if (el.hasAttribute('onselectstart')) el.removeAttribute('onselectstart');
            if (el.hasAttribute('oncontextmenu')) el.removeAttribute('oncontextmenu');
            if (el.hasAttribute('ondragstart')) el.removeAttribute('ondragstart');
        });
    };

    // Run on page load and observe for changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enableElements);
    } else {
        enableElements();
    }

    // Watch for dynamic content
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        clearBlockingHandlers(node);
                        node.querySelectorAll && node.querySelectorAll('*').forEach(clearBlockingHandlers);
                    }
                });
            });
        });
        observer.observe(document.documentElement || document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    // Bypass webdriver detection
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
})();
