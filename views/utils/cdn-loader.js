// Secure CDN Loader with SRI (Subresource Integrity) checks
(function() {
    'use strict';

    const CDNLoader = {
        // CDN resources with integrity hashes
        resources: {
            tailwindcss: {
                url: 'https://cdn.tailwindcss.com',
                integrity: null, // Tailwind CLI doesn't support SRI, use local version in production
                crossorigin: 'anonymous',
                recommended: 'Use local version for production'
            },
            chartjs: {
                url: 'https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js',
                integrity: 'sha384-/Tke5IoB8Y7bNy+AWjCSIGorZmB1YvTQn6gLCBw1ip5aGwaDe8hVvwPMJz8hB5Gx',
                crossorigin: 'anonymous'
            },
            chartjs_latest: {
                url: 'https://cdn.jsdelivr.net/npm/chart.js',
                integrity: null,
                crossorigin: 'anonymous',
                recommended: 'Use specific version with SRI hash'
            },
            xlsx: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
                integrity: 'sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==',
                crossorigin: 'anonymous'
            },
            html2pdf: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
                integrity: 'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7gJzSw==',
                crossorigin: 'anonymous'
            },
            dayjs: {
                url: 'https://cdn.jsdelivr.net/npm/dayjs@1.10.7/dayjs.min.js',
                integrity: 'sha256-bI5HXdGRAXG227V7EAhTp/MVQZTI3FdBqP2Vlzo0Q7I=',
                crossorigin: 'anonymous'
            },
            dayjs_th: {
                url: 'https://cdn.jsdelivr.net/npm/dayjs@1.10.7/locale/th.js',
                integrity: 'sha256-7WtKVrcJvEhwXlzJSOUt5fJmVJo9Jy0a+mh4U/RBXZU=',
                crossorigin: 'anonymous'
            },
            fontawesome: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
                integrity: 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==',
                crossorigin: 'anonymous'
            }
        },

        // Load a script with integrity check
        loadScript: function(name, options = {}) {
            return new Promise((resolve, reject) => {
                const resource = this.resources[name];

                if (!resource) {
                    reject(new Error(`Resource ${name} not found in CDN configuration`));
                    return;
                }

                // Check if script already loaded
                if (document.querySelector(`script[src="${resource.url}"]`)) {
                    resolve();
                    return;
                }

                // Warn if no integrity hash
                if (!resource.integrity && !options.allowWithoutIntegrity) {
                    console.warn(`Warning: Loading ${name} without integrity check. ${resource.recommended || 'Consider adding SRI hash.'}`);

                    // In production, you might want to reject instead
                    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                        if (!options.forceLoad) {
                            reject(new Error(`Security: Cannot load ${name} without integrity check in production`));
                            return;
                        }
                    }
                }

                const script = document.createElement('script');
                script.src = resource.url;

                if (resource.integrity) {
                    script.integrity = resource.integrity;
                }

                if (resource.crossorigin) {
                    script.crossOrigin = resource.crossorigin;
                }

                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load ${name} from CDN`));

                document.head.appendChild(script);
            });
        },

        // Load a stylesheet with integrity check
        loadStylesheet: function(name, options = {}) {
            return new Promise((resolve, reject) => {
                const resource = this.resources[name];

                if (!resource) {
                    reject(new Error(`Resource ${name} not found in CDN configuration`));
                    return;
                }

                // Check if stylesheet already loaded
                if (document.querySelector(`link[href="${resource.url}"]`)) {
                    resolve();
                    return;
                }

                // Warn if no integrity hash
                if (!resource.integrity && !options.allowWithoutIntegrity) {
                    console.warn(`Warning: Loading ${name} without integrity check. ${resource.recommended || 'Consider adding SRI hash.'}`);
                }

                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = resource.url;

                if (resource.integrity) {
                    link.integrity = resource.integrity;
                }

                if (resource.crossorigin) {
                    link.crossOrigin = resource.crossorigin;
                }

                link.onload = () => resolve();
                link.onerror = () => reject(new Error(`Failed to load ${name} from CDN`));

                document.head.appendChild(link);
            });
        },

        // Load multiple resources
        loadResources: function(resources, options = {}) {
            const promises = resources.map(resource => {
                if (resource.type === 'style') {
                    return this.loadStylesheet(resource.name, options);
                } else {
                    return this.loadScript(resource.name, options);
                }
            });

            return Promise.all(promises);
        },

        // Generate integrity hash for a resource (for development)
        generateIntegrityHash: async function(url) {
            try {
                const response = await fetch(url);
                const text = await response.text();
                const encoder = new TextEncoder();
                const data = encoder.encode(text);
                const hashBuffer = await crypto.subtle.digest('SHA-384', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                const hashBase64 = btoa(String.fromCharCode(...hashArray));

                return `sha384-${hashBase64}`;
            } catch (error) {
                console.error('Failed to generate integrity hash:', error);
                return null;
            }
        },

        // Replace existing CDN scripts with secure versions
        replaceUnsecureScripts: function() {
            const scripts = document.querySelectorAll('script[src^="http://"], script[src^="https://"]');
            const stylesheets = document.querySelectorAll('link[href^="http://"], link[href^="https://"]');

            scripts.forEach(script => {
                if (!script.integrity && !script.src.includes('localhost')) {
                    console.warn('Insecure script found:', script.src);
                    // You could automatically replace it here
                }
            });

            stylesheets.forEach(link => {
                if (!link.integrity && !link.href.includes('localhost')) {
                    console.warn('Insecure stylesheet found:', link.href);
                }
            });
        },

        // Content Security Policy helper
        getCSPHeader: function() {
            const trustedHosts = [
                'https://cdn.tailwindcss.com',
                'https://cdn.jsdelivr.net',
                'https://cdnjs.cloudflare.com'
            ];

            return {
                'Content-Security-Policy': [
                    `default-src 'self'`,
                    `script-src 'self' ${trustedHosts.join(' ')} 'unsafe-inline'`,
                    `style-src 'self' ${trustedHosts.join(' ')} 'unsafe-inline'`,
                    `img-src 'self' data: https:`,
                    `font-src 'self' data: ${trustedHosts.join(' ')}`,
                    `connect-src 'self'`,
                    `frame-ancestors 'none'`,
                    `base-uri 'self'`,
                    `form-action 'self'`
                ].join('; ')
            };
        }
    };

    // Auto-check on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            CDNLoader.replaceUnsecureScripts();
        });
    } else {
        CDNLoader.replaceUnsecureScripts();
    }

    // Export for use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CDNLoader;
    } else {
        window.CDNLoader = CDNLoader;
    }
})();