/**
 * DevTools & Context Menu Enabler - Universal Copy/Paste Enabler
 * Forces copy/paste to work on ALL websites
 *
 * Installation: Use with Tampermonkey with @run-at document-start
 */
(function() {
    'use strict';

    // Disable all preventDefault calls for our protected events
    const originalPreventDefault = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function() {
        if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
            return; // Do nothing - let the default action happen
        }
        return originalPreventDefault.apply(this, arguments);
    };

    // Disable stopPropagation for our events
    const originalStopPropagation = Event.prototype.stopPropagation;
    Event.prototype.stopPropagation = function() {
        if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
            return;
        }
        return originalStopPropagation.apply(this, arguments);
    };

    // Disable stopImmediatePropagation
    const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;
    Event.prototype.stopImmediatePropagation = function() {
        if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
            return;
        }
        return originalStopImmediatePropagation.apply(this, arguments);
    };

    // Override returnValue
    Object.defineProperty(Event.prototype, 'returnValue', {
        get: function() {
            if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
                return true;
            }
            return true;
        },
        set: function(val) {
            if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
                return; // Ignore
            }
        }
    });

    // Inject CSS to force text selection
    const css = document.createElement('style');
    css.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    
    function injectCSS() {
        if (!document.getElementById('universal-copy-paste-css')) {
            css.id = 'universal-copy-paste-css';
            (document.head || document.documentElement).appendChild(css);
        }
    }
    
    injectCSS();
    setTimeout(injectCSS, 0);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCSS);
    }

    // Block inline event handlers
    function clearHandlers(el) {
        if (!el) return;
        ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart'].forEach(prop => {
            if (el[prop]) el[prop] = null;
        });
    }

    // Block on document/window
    ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart'].forEach(prop => {
        [document, window, HTMLElement.prototype].forEach(obj => {
            try {
                Object.defineProperty(obj, prop, {
                    get: () => null,
                    set: () => {},
                    configurable: false
                });
            } catch(e) {}
        });
    });

    // Clean existing elements
    function cleanDOM() {
        [document, document.body, document.documentElement].forEach(clearHandlers);
        try {
            document.querySelectorAll('*').forEach(clearHandlers);
        } catch(e) {}
    }

    cleanDOM();
    setTimeout(cleanDOM, 100);

    // Enable keyboard shortcuts by stopping their propagation
    document.addEventListener('keydown', function(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const isProtected = 
            e.keyCode === 123 || // F12
            (ctrl && e.keyCode === 67) || // Ctrl+C
            (ctrl && e.keyCode === 86) || // Ctrl+V  
            (ctrl && e.keyCode === 88) || // Ctrl+X
            (ctrl && e.keyCode === 65) || // Ctrl+A
            (ctrl && e.keyCode === 85) || // Ctrl+U
            (ctrl && (e.shiftKey || e.altKey) && [73, 74].includes(e.keyCode)); // Inspect/Console
        
        if (isProtected) {
            originalStopImmediatePropagation.call(e);
        }
    }, true);

    // Add manual copy/paste via keyboard if browser blocks
    let lastSelection = '';
    
    document.addEventListener('copy', function(e) {
        try {
            const selection = window.getSelection().toString();
            if (selection) {
                lastSelection = selection;
                if (e.clipboardData) {
                    e.clipboardData.setData('text/plain', selection);
                }
            }
        } catch(err) {}
    }, true);

    document.addEventListener('cut', function(e) {
        try {
            const selection = window.getSelection().toString();
            if (selection && e.clipboardData) {
                e.clipboardData.setData('text/plain', selection);
            }
        } catch(err) {}
    }, true);

    // Watch for dynamic content
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => {
            try {
                document.querySelectorAll('*').forEach(clearHandlers);
            } catch(e) {}
        });
        
        setTimeout(() => {
            const target = document.documentElement || document.body;
            if (target) {
                observer.observe(target, { childList: true, subtree: true });
            }
        }, 100);
    }
})();
/**
 * DevTools & Context Menu Enabler - Universal Copy/Paste Enabler
 * Forces copy/paste to work on ALL websites
 *
 * Installation: Use with Tampermonkey with @run-at document-start
 */
(function() {
    'use strict';

    // Disable all preventDefault calls for our protected events
    const originalPreventDefault = Event.prototype.preventDefault;
    Event.prototype.preventDefault = function() {
        if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
            return; // Do nothing - let the default action happen
        }
        return originalPreventDefault.apply(this, arguments);
    };

    // Disable stopPropagation for our events
    const originalStopPropagation = Event.prototype.stopPropagation;
    Event.prototype.stopPropagation = function() {
        if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
            return;
        }
        return originalStopPropagation.apply(this, arguments);
    };

    // Disable stopImmediatePropagation
    const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;
    Event.prototype.stopImmediatePropagation = function() {
        if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
            return;
        }
        return originalStopImmediatePropagation.apply(this, arguments);
    };

    // Override returnValue
    Object.defineProperty(Event.prototype, 'returnValue', {
        get: function() {
            if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
                return true;
            }
            return true;
        },
        set: function(val) {
            if (['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].includes(this.type)) {
                return; // Ignore
            }
        }
    });

    // Inject CSS to force text selection
    const css = document.createElement('style');
    css.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    
    function injectCSS() {
        if (!document.getElementById('universal-copy-paste-css')) {
            css.id = 'universal-copy-paste-css';
            (document.head || document.documentElement).appendChild(css);
        }
    }
    
    injectCSS();
    setTimeout(injectCSS, 0);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCSS);
    }

    // Block inline event handlers
    function clearHandlers(el) {
        if (!el) return;
        ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart'].forEach(prop => {
            if (el[prop]) el[prop] = null;
        });
    }

    // Block on document/window
    ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart'].forEach(prop => {
        [document, window, HTMLElement.prototype].forEach(obj => {
            try {
                Object.defineProperty(obj, prop, {
                    get: () => null,
                    set: () => {},
                    configurable: false
                });
            } catch(e) {}
        });
    });

    // Clean existing elements
    function cleanDOM() {
        [document, document.body, document.documentElement].forEach(clearHandlers);
        try {
            document.querySelectorAll('*').forEach(clearHandlers);
        } catch(e) {}
    }

    cleanDOM();
    setTimeout(cleanDOM, 100);

    // Enable keyboard shortcuts by stopping their propagation
    document.addEventListener('keydown', function(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const isProtected = 
            e.keyCode === 123 || // F12
            (ctrl && e.keyCode === 67) || // Ctrl+C
            (ctrl && e.keyCode === 86) || // Ctrl+V  
            (ctrl && e.keyCode === 88) || // Ctrl+X
            (ctrl && e.keyCode === 65) || // Ctrl+A
            (ctrl && e.keyCode === 85) || // Ctrl+U
            (ctrl && (e.shiftKey || e.altKey) && [73, 74].includes(e.keyCode)); // Inspect/Console
        
        if (isProtected) {
            originalStopImmediatePropagation.call(e);
        }
    }, true);

    // Add manual copy/paste via keyboard if browser blocks
    let lastSelection = '';
    
    document.addEventListener('copy', function(e) {
        try {
            const selection = window.getSelection().toString();
            if (selection) {
                lastSelection = selection;
                if (e.clipboardData) {
                    e.clipboardData.setData('text/plain', selection);
                }
            }
        } catch(err) {}
    }, true);

    document.addEventListener('cut', function(e) {
        try {
            const selection = window.getSelection().toString();
            if (selection && e.clipboardData) {
                e.clipboardData.setData('text/plain', selection);
            }
        } catch(err) {}
    }, true);

    // Watch for dynamic content
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => {
            try {
                document.querySelectorAll('*').forEach(clearHandlers);
            } catch(e) {}
        });
        
        setTimeout(() => {
            const target = document.documentElement || document.body;
            if (target) {
                observer.observe(target, { childList: true, subtree: true });
            }
        }, 100);
    }
})();
