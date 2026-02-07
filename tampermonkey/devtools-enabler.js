/**
 * DevTools Shortcut Enabler
 * Re-enables blocked developer tools shortcuts (F12, Ctrl+Shift+I/J/U)
 * Can be loaded via Tampermonkey @require or directly included
 *
 * Features:
 *   - Re-enables F12 (Developer Tools)
 *   - Re-enables Ctrl+Shift+I (Inspect Element)
 *   - Re-enables Ctrl+Shift+J (Open Console)
 *   - Re-enables Ctrl+U (View Page Source)
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

    const blockKeys = ['keydown', 'keypress', 'keyup'];
    
    blockKeys.forEach(eventType => {
        document.addEventListener(eventType, function(e) {
            // Allow F12
            if (e.keyCode === 123 && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.stopImmediatePropagation();
                return;
            }
            
            // Allow Ctrl+Shift+I
            if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
                e.stopImmediatePropagation();
                return;
            }
            
            // Allow Ctrl+Shift+J
            if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
                e.stopImmediatePropagation();
                return;
            }
            
            // Allow Ctrl+U
            if (e.ctrlKey && e.keyCode === 85) {
                e.stopImmediatePropagation();
                return;
            }
        }, true);
    });

    // Bypass webdriver detection
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
})();
