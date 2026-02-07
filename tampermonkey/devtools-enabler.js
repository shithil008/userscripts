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

    // Re-enable context menu (right-click) - Targeted approach
    document.addEventListener('contextmenu', function(e) {
        e.stopImmediatePropagation();
    }, true);

    // Re-enable text selection and copy/paste
    ['selectstart', 'dragstart', 'cut', 'copy', 'paste'].forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            e.stopImmediatePropagation();
        }, true);
    });

    // Prevent page from disabling text selection/context menu
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
    `;
    document.head.appendChild(style);

    // Bypass webdriver detection
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
})();
