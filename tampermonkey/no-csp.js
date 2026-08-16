// csp-disabler.js
// Save this file locally or host it, then load via @require in Tampermonkey

(function(global) {
    'use strict';

    const CSPDisabler = {
        initialized: false,
        observer: null,

        init: function(options) {
            if (this.initialized) {
                console.log('[CSP Disabler] Already initialized');
                return this;
            }

            options = Object.assign({
                stripHeaders: true,
                stripMetaTags: true,
                blockViolationReports: true,
                hookCreateElement: true,
                verbose: true
            }, options || {});

            this.options = options;

            // Method 1: Strip CSP headers via GM_webRequest
            if (options.stripHeaders && typeof GM_webRequest !== 'undefined') {
                try {
                    GM_webRequest([
                        { selector: '*', action: 'cancel' }
                    ], function(info) {
                        if (info.responseHeaders) {
                            const headers = info.responseHeaders.filter(h => {
                                const name = h.name.toLowerCase();
                                return name !== 'content-security-policy' &&
                                       name !== 'content-security-policy-report-only' &&
                                       name !== 'x-content-security-policy' &&
                                       name !== 'x-webkit-csp';
                            });
                            return { responseHeaders: headers };
                        }
                    });
                    if (options.verbose) console.log('[CSP Disabler] GM_webRequest hooked');
                } catch (e) {
                    console.warn('[CSP Disabler] GM_webRequest failed:', e);
                }
            }

            // Method 2: Remove existing CSP meta tags
            if (options.stripMetaTags) {
                this._removeExistingMetaTags();
                this._setupMetaObserver();
                if (options.verbose) console.log('[CSP Disabler] Meta tag watcher active');
            }

            // Method 3: Hook document.createElement to block CSP meta injection
            if (options.hookCreateElement) {
                this._hookCreateElement();
                if (options.verbose) console.log('[CSP Disabler] createElement hooked');
            }

            // Method 4: Block CSP violation reports
            if (options.blockViolationReports) {
                this._blockViolationReports();
                if (options.verbose) console.log('[CSP Disabler] Violation reports blocked');
            }

            this.initialized = true;
            if (options.verbose) console.log('[CSP Disabler] Initialized');

            return this;
        },

        _removeExistingMetaTags: function() {
            const metaTags = document.querySelectorAll('meta[http-equiv]');
            metaTags.forEach(meta => {
                const equiv = meta.getAttribute('http-equiv') || '';
                if (/content-security-policy/i.test(equiv)) {
                    meta.remove();
                    if (this.options.verbose) console.log('[CSP Disabler] Removed CSP meta tag');
                }
            });
        },

        _setupMetaObserver: function() {
            const self = this;
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeName === 'META') {
                            const equiv = node.getAttribute('http-equiv') || '';
                            if (/content-security-policy/i.test(equiv)) {
                                node.remove();
                                if (self.options.verbose) console.log('[CSP Disabler] Blocked injected CSP meta tag');
                            }
                        }
                    });
                });
            });

            const target = document.documentElement || document.head || document.body;
            if (target) {
                this.observer.observe(target, { childList: true, subtree: true });
            } else {
                // Wait for document to be ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        self._removeExistingMetaTags();
                        if (document.documentElement) {
                            self.observer.observe(document.documentElement, {
                                childList: true,
                                subtree: true
                            });
                        }
                    });
                }
            }
        },

        _hookCreateElement: function() {
            const self = this;
            const originalCreateElement = document.createElement;

            document.createElement = function(tagName) {
                const element = originalCreateElement.call(document, tagName);

                if (tagName.toLowerCase() === 'meta') {
                    const originalSetAttribute = element.setAttribute;
                    element.setAttribute = function(name, value) {
                        if (name.toLowerCase() === 'http-equiv' &&
                            /content-security-policy/i.test(value || '')) {
                            if (self.options.verbose) console.log('[CSP Disabler] Blocked meta CSP creation');
                            return;
                        }
                        return originalSetAttribute.call(this, name, value);
                    };
                }

                return element;
            };
        },

        _blockViolationReports: function() {
            window.addEventListener('securitypolicyviolation', (e) => {
                e.stopImmediatePropagation();
                e.preventDefault();
                if (this.options.verbose) console.log('[CSP Disabler] Blocked CSP violation report for:', e.blockedURI);
            }, true);
        },

        destroy: function() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            this.initialized = false;
            console.log('[CSP Disabler] Destroyed');
        }
    };

    // Auto-initialize if in a userscript environment
    if (typeof GM_info !== 'undefined' || typeof GM !== 'undefined' || typeof unsafeWindow !== 'undefined') {
        if (document.readyState === 'loading') {
            CSPDisabler.init();
        } else {
            CSPDisabler.init();
        }
    }

    // Expose to global scope
    global.CSPDisabler = CSPDisabler;

    // Also expose as module if applicable
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CSPDisabler;
    }

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : this));
