// no-csp.js
// Load via @require in Tampermonkey/Violentmonkey/Greasemonkey

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
                hookAppendChild: true,
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

            if (opts.hookAppendChild) {
                this._hookAppendChild();
                if (opts.verbose) console.log('[CSP Disabler] appendChild hooked');
            }

            if (opts.blockViolationReports) {
                this._blockViolationReports();
                if (opts.verbose) console.log('[CSP Disabler] Violation reports blocked');
            }

            this.initialized = true;
            if (opts.verbose) console.log('[CSP Disabler] Initialized (meta-tag CSP only)');

            return this;
        },

        _isCSPMeta: function(node) {
            if (!node || node.nodeName !== 'META') return false;
            const equiv = (node.getAttribute('http-equiv') || node.httpEquiv || '').toLowerCase();
            return equiv.includes('content-security-policy');
        },

        _removeExistingMetaTags: function() {
            const metaTags = document.querySelectorAll('meta[http-equiv]');
            metaTags.forEach(meta => {
                if (this._isCSPMeta(meta)) {
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
                            if (self._isCSPMeta(node)) {
                                node.remove();
                                if (self.options.verbose) console.log('[CSP Disabler] Blocked injected CSP meta tag');
                            }
                        });
                    });
                });

                this.observer.observe(target, { childList: true, subtree: true });
                return true;
            };

            if (!tryObserve()) {
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
            // Hook on <meta> elements created before our script ran
            const self = this;
            const originalDefineProperty = Object.defineProperty;

            Object.defineProperty = function(obj, prop, descriptor) {
                if (obj && obj.nodeName === 'META' && prop === 'httpEquiv') {
                    const originalSet = descriptor.set;
                    if (originalSet) {
                        descriptor.set = function(value) {
                            if (/content-security-policy/i.test(value || '')) {
                                if (self.options.verbose) console.log('[CSP Disabler] Blocked Object.defineProperty CSP');
                                return;
                            }
                            return originalSet.call(this, value);
                        };
                    }
                }
                return originalDefineProperty.call(this, obj, prop, descriptor);
            };
        },

        _hookAppendChild: function() {
            const self = this;
            const nodes = [document.documentElement, document.head, document.body].filter(Boolean);

            nodes.forEach((target) => {
                if (!target._cspHooked) {
                    const originalAppendChild = target.appendChild;
                    target.appendChild = function(node) {
                        if (self._isCSPMeta(node)) {
                            if (self.options.verbose) console.log('[CSP Disabler] Blocked appendChild CSP meta');
                            return node;
                        }
                        return originalAppendChild.call(this, node);
                    };
                    target._cspHooked = true;
                }
            });

            // Also hook insertBefore
            nodes.forEach((target) => {
                if (!target._cspInsertHooked) {
                    const originalInsertBefore = target.insertBefore;
                    target.insertBefore = function(node, ref) {
                        if (self._isCSPMeta(node)) {
                            if (self.options.verbose) console.log('[CSP Disabler] Blocked insertBefore CSP meta');
                            return node;
                        }
                        return originalInsertBefore.call(this, node, ref);
                    };
                    target._cspInsertHooked = true;
                }
            });
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

    // Expose to global scope
    global.CSPDisabler = CSPDisabler;

    // Module export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CSPDisabler;
    }

})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : (typeof window !== 'undefined' ? window : this));
