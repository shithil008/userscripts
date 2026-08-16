// no-csp.js
(function(global) {
    'use strict';

    const CSPDisabler = {
        initialized: false,
        observer: null,
        cleanupTimer: null,
        options: {},

        init: function(options) {
            if (this.initialized) return this;

            this.options = Object.assign({
                verbose: true,
                periodicCleanup: true,
                cleanupDuration: 5000,
                pollInterval: 20
            }, options || {});

            const opts = this.options;

            // Hook setAttribute
            const origSetAttr = Element.prototype.setAttribute;
            Element.prototype.setAttribute = function(name, value) {
                if (this.nodeName === 'META' && name.toLowerCase() === 'http-equiv' && /content-security-policy/i.test(value || '')) {
                    if (opts.verbose) console.log('[CSP Disabler] BLOCKED setAttribute("http-equiv", CSP)');
                    return;
                }
                return origSetAttr.call(this, name, value);
            };

            // Hook appendChild
            const origAppend = Node.prototype.appendChild;
            Node.prototype.appendChild = function(node) {
                if (node && node.nodeName === 'META') {
                    const equiv = (node.getAttribute('http-equiv') || node.httpEquiv || '').toLowerCase();
                    if (equiv.includes('content-security-policy')) {
                        if (opts.verbose) console.log('[CSP Disabler] BLOCKED appendChild(CSP meta)');
                        return node;
                    }
                }
                return origAppend.call(this, node);
            };

            // Hook insertBefore
            const origInsert = Node.prototype.insertBefore;
            Node.prototype.insertBefore = function(node, ref) {
                if (node && node.nodeName === 'META') {
                    const equiv = (node.getAttribute('http-equiv') || node.httpEquiv || '').toLowerCase();
                    if (equiv.includes('content-security-policy')) {
                        if (opts.verbose) console.log('[CSP Disabler] BLOCKED insertBefore(CSP meta)');
                        return node;
                    }
                }
                return origInsert.call(this, node, ref);
            };

            // Remove existing
            const removeExisting = () => {
                let count = 0;
                document.querySelectorAll('meta[http-equiv]').forEach(m => {
                    if ((m.getAttribute('http-equiv') || '').toLowerCase().includes('content-security-policy')) {
                        m.remove();
                        count++;
                    }
                });
                if (count && opts.verbose) console.log('[CSP Disabler] Removed', count, 'existing CSP meta(s)');
            };
            removeExisting();

            // Observer
            const startObserver = () => {
                const target = document.documentElement || document.head;
                if (!target) return false;
                this.observer = new MutationObserver(mutations => {
                    mutations.forEach(m => m.addedNodes.forEach(node => {
                        if (node.nodeName === 'META') {
                            const equiv = (node.getAttribute('http-equiv') || '').toLowerCase();
                            if (equiv.includes('content-security-policy')) {
                                node.remove();
                                if (opts.verbose) console.log('[CSP Disabler] Observer removed CSP meta');
                            }
                        }
                    }));
                }).observe(target, { childList: true, subtree: true });
                return true;
            };

            if (!startObserver()) {
                const wait = () => startObserver() || setTimeout(wait, 5);
                wait();
            }

            // Periodic cleanup
            if (opts.periodicCleanup) {
                const start = Date.now();
                const tick = () => {
                    removeExisting();
                    if (Date.now() - start < opts.cleanupDuration) {
                        this.cleanupTimer = setTimeout(tick, opts.pollInterval);
                    }
                };
                tick();
            }

            // Block violation reports
            window.addEventListener('securitypolicyviolation', e => {
                e.stopImmediatePropagation();
                e.preventDefault();
                if (opts.verbose) console.log('[CSP Disabler] Blocked violation report:', e.blockedURI);
            }, true);

            this.initialized = true;
            if (opts.verbose) console.log('[CSP Disabler] Initialized');

            return this;
        },

        destroy: function() {
            if (this.observer) this.observer.disconnect();
            if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
            this.initialized = false;
            console.log('[CSP Disabler] Destroyed');
        }
    };

    // FIXED: Auto-init in any browser environment (not just userscript sandbox)
    if (typeof window !== 'undefined' && window.document) {
        CSPDisabler.init();
    }

    global.CSPDisabler = CSPDisabler;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CSPDisabler;
    }

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : this));
