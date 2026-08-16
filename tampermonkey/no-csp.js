// no-csp.js — improved version
(function(global) {
    'use strict';

    const CSPDisabler = {
        initialized: false,
        observer: null,
        options: {},

        init: function(options) {
            if (this.initialized) return this;

            this.options = Object.assign({
                stripMetaTags: true,
                hookCreateElement: true,
                hookPropertySetters: true,
                blockViolationReports: true,
                verbose: true
            }, options || {});

            const opts = this.options;

            if (opts.stripMetaTags) {
                this._removeExistingMetaTags();
                this._setupMetaObserver();
                if (opts.verbose) console.log('[CSP Disabler] Meta tag watcher active');
            }

            if (opts.hookCreateElement) {
                this._hookCreateElement();
                if (opts.verbose) console.log('[CSP Disabler] createElement hooked');
            }

            if (opts.hookPropertySetters) {
                this._hookPropertySetters();
                if (opts.verbose) console.log('[CSP Disabler] Property setters hooked');
            }

            if (opts.blockViolationReports) {
                this._blockViolationReports();
                if (opts.verbose) console.log('[CSP Disabler] Violation reports blocked');
            }

            this.initialized = true;
            if (opts.verbose) console.log('[CSP Disabler] Initialized (meta-tag CSP only)');

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
            const tryObserve = () => {
                const target = document.documentElement || document.head;
                if (!target) return false;
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
                this.observer.observe(target, { childList: true, subtree: true });
                return true;
            };

            if (!tryObserve()) {
                // Retry when DOM is available
                const check = () => {
                    if (tryObserve()) return;
                    if (document.readyState !== 'complete') {
                        setTimeout(check, 10);
                    }
                };
                check();
            }
        },

        _hookCreateElement: function() {
            const self = this;
            const originalCreateElement = document.createElement;

            document.createElement = function(tagName) {
                const element = originalCreateElement.call(document, tagName);

                if (tagName.toLowerCase() === 'meta') {
                    // Hook setAttribute
                    const originalSetAttribute = element.setAttribute;
                    element.setAttribute = function(name, value) {
                        if (name.toLowerCase() === 'http-equiv' &&
                            /content-security-policy/i.test(value || '')) {
                            if (self.options.verbose) console.log('[CSP Disabler] Blocked meta.setAttribute CSP');
                            return;
                        }
                        return originalSetAttribute.call(this, name, value);
                    };

                    // Hook httpEquiv property
                    let httpEquivValue = '';
                    Object.defineProperty(element, 'httpEquiv', {
                        get: () => httpEquivValue,
                        set: (value) => {
                            if (/content-security-policy/i.test(value || '')) {
                                if (self.options.verbose) console.log('[CSP Disabler] Blocked meta.httpEquiv CSP');
                                return;
                            }
                            httpEquivValue = value;
                        },
                        configurable: true
                    });
                }

                return element;
            };
        },

        _hookPropertySetters: function() {
            // Hook document.head.appendChild to catch direct meta insertion
            const self = this;
            const head = document.head;
            if (!head) return;

            const originalAppendChild = head.appendChild;
            head.appendChild = function(node) {
                if (node.nodeName === 'META') {
                    const equiv = node.getAttribute('http-equiv') || node.httpEquiv || '';
                    if (/content-security-policy/i.test(equiv)) {
                        if (self.options.verbose) console.log('[CSP Disabler] Blocked head.appendChild CSP meta');
                        return node;
                    }
                }
                return originalAppendChild.call(this, node);
            };
        },

        _blockViolationReports: function() {
            window.addEventListener('securitypolicyviolation', (e) => {
                e.stopImmediatePropagation();
                e.preventDefault();
                if (this.options.verbose) console.log('[CSP Disabler] Blocked violation report:', e.blockedURI);
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

    // Auto-init in userscript environment
    if (typeof GM_info !== 'undefined' || typeof GM !== 'undefined' || typeof unsafeWindow !== 'undefined') {
        CSPDisabler.init();
    }

    global.CSPDisabler = CSPDisabler;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CSPDisabler;
    }

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : this));
