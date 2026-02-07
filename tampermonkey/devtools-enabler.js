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

    // The KEY: Override Event.prototype methods to prevent sites from blocking
    // This must happen BEFORE any site code runs
    const originalPreventDefault = Event.prototype.preventDefault;
    const originalStopPropagation = Event.prototype.stopPropagation;
    const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;

    // Only protect specific events - not keyboard/mouse events as those are too general
    const protectedEvents = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu'];

    // Override preventDefault - when sites call e.preventDefault() on protected events, ignore it
    Event.prototype.preventDefault = function() {
        if (protectedEvents.includes(this.type)) {
            // Silently ignore - let the event's default action happen
            console.log('[Copy/Paste Enabler] Blocked preventDefault on:', this.type);
            return;
        }
        return originalPreventDefault.apply(this, arguments);
    };

    // Override stopPropagation - let protected events propagate freely
    Event.prototype.stopPropagation = function() {
        if (protectedEvents.includes(this.type)) {
            console.log('[Copy/Paste Enabler] Blocked stopPropagation on:', this.type);
            return;
        }
        return originalStopPropagation.apply(this, arguments);
    };

    // Override stopImmediatePropagation - let protected events propagate freely
    Event.prototype.stopImmediatePropagation = function() {
        if (protectedEvents.includes(this.type)) {
            console.log('[Copy/Paste Enabler] Blocked stopImmediatePropagation on:', this.type);
            return;
        }
        return originalStopImmediatePropagation.apply(this, arguments);
    };

    // Make sure sites can't detect we've overridden these
    Object.defineProperty(Event.prototype.preventDefault, 'toString', {
        value: originalPreventDefault.toString.bind(originalPreventDefault),
        writable: false,
        configurable: false
    });

    // Also override the return value property
    const originalReturnValue = Object.getOwnPropertyDescriptor(Event.prototype, 'returnValue');
    if (originalReturnValue) {
        Object.defineProperty(Event.prototype, 'returnValue', {
            get: function() {
                if (protectedEvents.includes(this.type)) {
                    return true; // Always indicate event is not prevented
                }
                return originalReturnValue.get ? originalReturnValue.get.call(this) : true;
            },
            set: function(val) {
                if (protectedEvents.includes(this.type)) {
                    // Ignore attempts to set returnValue to false
                    return;
                }
                if (originalReturnValue.set) {
                    originalReturnValue.set.call(this, val);
                }
            }
        });
    }

    // Handle keyboard shortcuts - protect DevTools shortcuts only
    ['keydown'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            const ctrl = e.ctrlKey || e.metaKey;
            
            // Only protect DevTools shortcuts, let copy/paste shortcuts work normally
            const isDevToolsShortcut = 
                (e.keyCode === 123) || // F12
                (ctrl && (e.shiftKey || e.altKey) && e.keyCode === 73) || // Inspect
                (ctrl && (e.shiftKey || e.altKey) && e.keyCode === 74) || // Console
                (ctrl && e.keyCode === 85); // View Source
            
            if (isDevToolsShortcut) {
                // Stop site code from blocking DevTools
                originalStopImmediatePropagation.call(e);
                console.log('[Copy/Paste Enabler] Protected DevTools shortcut');
            }
            
            // For copy/paste shortcuts, don't stop propagation - let the event flow
            // The Event.prototype overrides will prevent blocking
        }, true);
    });

    // Clear any inline event handlers that block functionality
    const clearBlockingHandlers = (element) => {
        if (!element || !element.nodeType) return;
        
        ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'ondragstart', 
         'onmousedown', 'onmouseup', 'onkeydown', 'onkeypress', 'onkeyup'].forEach(prop => {
            try {
                if (element[prop]) {
                    element[prop] = null;
                }
                // Also remove HTML attributes
                if (element.hasAttribute && element.hasAttribute(prop)) {
                    element.removeAttribute(prop);
                }
            } catch(e) {}
        });
    };

    // Clear all blocking handlers from the page
    const clearAllBlockingHandlers = () => {
        const elements = [document, document.documentElement, document.body];
        elements.forEach(el => {
            if (el) clearBlockingHandlers(el);
        });
        
        // Clear from all elements
        try {
            document.querySelectorAll('*').forEach(clearBlockingHandlers);
        } catch(e) {}
    };

    // Prevent page from setting new blocking handlers
    const blockingProps = ['onselectstart', 'ondragstart', 'oncontextmenu', 'oncut', 'oncopy', 
                           'onpaste', 'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup'];
    
    const protectElement = (target) => {
        if (!target) return;
        blockingProps.forEach(prop => {
            try {
                Object.defineProperty(target, prop, {
                    get: () => null,
                    set: () => {},
                    configurable: false,
                    enumerable: true
                });
            } catch(e) {
                // If can't redefine, at least clear it
                try { target[prop] = null; } catch(e2) {}
            }
        });
    };
    
    // Protect critical elements
    const protectDOM = () => {
        protectElement(document);
        protectElement(window);
        if (document.body) protectElement(document.body);
        if (document.documentElement) protectElement(document.documentElement);
    };

    // Inject CSS to enable text selection
    const injectStyles = () => {
        if (document.getElementById('copy-paste-enabler-style')) return;
        
        const style = document.createElement('style');
        style.id = 'copy-paste-enabler-style';
        style.textContent = `
            *, *::before, *::after {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
            input, textarea, [contenteditable] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                pointer-events: auto !important;
            }
            body {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        
        // Try multiple injection points
        const insertTarget = document.head || document.documentElement || document.body;
        if (insertTarget) {
            insertTarget.appendChild(style);
        }
    };

    // Run immediately
    clearAllBlockingHandlers();
    protectDOM();
    
    // Keep clearing handlers periodically for aggressive sites
    setInterval(clearAllBlockingHandlers, 500);
    
    // Inject styles as early as possible and keep re-injecting
    injectStyles();
    setTimeout(injectStyles, 0);
    setInterval(injectStyles, 1000);
    
    // Run cleanup after DOM loads
    const runAfterLoad = () => {
        injectStyles();
        clearAllBlockingHandlers();
        protectDOM();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAfterLoad);
    } else {
        setTimeout(runAfterLoad, 0);
    }
    
    // Also run on full page load
    window.addEventListener('load', runAfterLoad);

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
