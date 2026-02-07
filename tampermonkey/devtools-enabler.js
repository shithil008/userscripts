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
 *   Tampermonkey: Add // @run-at document-start to your userscript
 *   Direct usage: Include script tag before other scripts
 *
 * Note: Only effective against client-side blocking methods
 */
(function() {
    'use strict';

    console.log('[Copy/Paste Enabler] Script loaded');

    // Store original functions before any page code runs
    const EventTarget_addEventListener = EventTarget.prototype.addEventListener;
    const document_addEventListener = document.addEventListener;
    const Event_preventDefault = Event.prototype.preventDefault;

    // Neutered functions - do nothing
    const noop = function() {};
    const returnTrue = function() { return true; };

    // Events we want to enable
    const enableEvents = [
        'contextmenu', 'copy', 'cut', 'paste',
        'selectstart', 'select', 'dragstart'
    ];

    // Keyboard events to protect
    const protectKeys = ['keydown', 'keyup', 'keypress'];

    // Override addEventListener to neuter blocking listeners
    const newAddEventListener = function(type, listener, options) {
        if (enableEvents.includes(type)) {
            // Replace blocking listener with a noop
            console.log('[Copy/Paste Enabler] Blocked addEventListener for:', type);
            return EventTarget_addEventListener.call(this, type, returnTrue, options);
        }
        
        if (protectKeys.includes(type)) {
            // Wrap keyboard listener to prevent it from blocking shortcuts
            const wrappedListener = function(e) {
                const ctrl = e.ctrlKey || e.metaKey;
                const isShortcut = 
                    e.keyCode === 123 || // F12
                    (ctrl && e.keyCode === 67) || // Ctrl+C
                    (ctrl && e.keyCode === 86) || // Ctrl+V
                    (ctrl && e.keyCode === 88) || // Ctrl+X
                    (ctrl && e.keyCode === 65) || // Ctrl+A
                    (ctrl && e.keyCode === 85) || // Ctrl+U
                    (ctrl && (e.shiftKey || e.altKey) && [73, 74].includes(e.keyCode));
                
                if (isShortcut) {
                    console.log('[Copy/Paste Enabler] Protected keyboard shortcut:', e.keyCode);
                    return true;
                }
                
                return listener.call(this, e);
            };
            return EventTarget_addEventListener.call(this, type, wrappedListener, options);
        }
        
        return EventTarget_addEventListener.call(this, type, listener, options);
    };

    // Replace addEventListener globally
    EventTarget.prototype.addEventListener = newAddEventListener;
    document.addEventListener = newAddEventListener;

    // Remove all on* property setters (oncopy, onpaste, etc.)
    const blockProperties = function(obj) {
        if (!obj) return;
        
        ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 
         'ondragstart', 'onselect', 'onmousedown', 'onmouseup', 'onkeydown', 
         'onkeyup', 'onkeypress'].forEach(prop => {
            try {
                Object.defineProperty(obj, prop, {
                    get: () => null,
                    set: noop,
                    configurable: false
                });
            } catch(e) {}
        });
    };

    // Block properties immediately
    blockProperties(document);
    blockProperties(window);
    blockProperties(HTMLElement.prototype);

    // Inject aggressive CSS
    const style = document.createElement('style');
    style.id = 'copy-paste-enabler';
    style.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
            -webkit-user-drag: auto !important;
        }
        html, body {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            user-select: text !important;
        }
    `;

    const injectCSS = () => {
        const target = document.head || document.documentElement || document.body;
        if (target && !document.getElementById('copy-paste-enabler')) {
            target.insertBefore(style, target.firstChild);
            console.log('[Copy/Paste Enabler] CSS injected');
        }
    };

    // Inject immediately and keep trying
    injectCSS();
    const cssInterval = setInterval(() => {
        if (document.head) {
            injectCSS();
            clearInterval(cssInterval);
        }
    }, 10);

    // Clean up inline handlers from DOM
    const cleanElement = (el) => {
        if (!el || el.nodeType !== 1) return;
        ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'ondragstart'].forEach(attr => {
            if (el.hasAttribute(attr)) {
                el.removeAttribute(attr);
            }
            if (el[attr]) {
                el[attr] = null;
            }
        });
    };

    // Clean existing elements
    const cleanAll = () => {
        [document, document.documentElement, document.body].forEach(cleanElement);
        try {
            document.querySelectorAll('*').forEach(cleanElement);
        } catch(e) {}
    };

    // Run cleanup
    cleanAll();
    setTimeout(cleanAll, 100);
    setTimeout(cleanAll, 500);

    // Watch for new elements
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        cleanElement(node);
                    }
                });
            });
        });
        
        const observe = () => {
            const target = document.documentElement || document.body;
            if (target) {
                observer.observe(target, { childList: true, subtree: true });
            } else {
                setTimeout(observe, 10);
            }
        };
        observe();
    }

    // DOM ready tasks
    const onReady = () => {
        blockProperties(document.body);
        blockProperties(document.documentElement);
        cleanAll();
        injectCSS();
        console.log('[Copy/Paste Enabler] DOM ready, protections applied');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }

    // Bypass webdriver detection
    try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    } catch(e) {}

    console.log('[Copy/Paste Enabler] Setup complete');
})();
