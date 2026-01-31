class ReadingPositionTracker {
    constructor() {
        this.STORAGE_KEY = 'obsidian_reading_position';
        this.lastPosition = null;
        this.currentDocument = null;
        this.isRestoring = false;
        this.debugMode = true;
        this.scrollContainer = null;
    }
    
    // Get the correct scroll container - FIXED to use .obsidian-document
    getScrollContainer() {
        if (!this.scrollContainer) {
            // Try to find the scrolling container
            this.scrollContainer = document.querySelector('.obsidian-document');
            
            // Fallback to other possible containers
            if (!this.scrollContainer) {
                this.scrollContainer = document.querySelector('#center-content');
            }
            
            if (!this.scrollContainer) {
                this.scrollContainer = document.querySelector('.markdown-preview-view');
            }
            
            // Ultimate fallback to window
            if (!this.scrollContainer) {
                this.scrollContainer = window;
            }
            
            this.debugLog('getScrollContainer: Found container:', 
                this.scrollContainer === window ? 'window' : 
                this.scrollContainer.classList ? 
                '.' + this.scrollContainer.classList[0] : 
                this.scrollContainer.id || 'unknown');
        }
        return this.scrollContainer;
    }
    
    // Get current scroll position from the correct container
    getScrollPosition() {
        const container = this.getScrollContainer();
        
        if (container === window) {
            return {
                top: window.scrollY,
                left: window.scrollX,
                height: window.innerHeight,
                scrollHeight: document.documentElement.scrollHeight
            };
        } else {
            return {
                top: container.scrollTop,
                left: container.scrollLeft,
                height: container.clientHeight,
                scrollHeight: container.scrollHeight
            };
        }
    }
    
    // Set scroll position on the correct container
    setScrollPosition(top) {
        const container = this.getScrollContainer();
        const scrollHeight = container === window ? 
            document.documentElement.scrollHeight : 
            container.scrollHeight;
        
        // Ensure we don't scroll past the bottom
        const maxScroll = scrollHeight - (container === window ? 
            window.innerHeight : 
            container.clientHeight);
        const safeTop = Math.min(Math.max(0, top), maxScroll);
        
        this.debugLog('setScrollPosition: Setting to ' + safeTop + 'px in .obsidian-document (max: ' + maxScroll + 'px)');
        
        if (container === window) {
            container.scrollTo({
                top: safeTop,
                behavior: 'smooth'
            });
        } else {
            container.scrollTop = safeTop;
            // For smooth scrolling in div containers
            if (container.scrollTo) {
                container.scrollTo({
                    top: safeTop,
                    behavior: 'smooth'
                });
            }
        }
    }
    
    // Save current reading position
    savePosition() {
        if (!ObsidianSite.document || this.isRestoring) {
            this.debugLog("savePosition: Skipping - no document or is restoring");
            return;
        }
        
        const scrollPos = this.getScrollPosition();
        const scrollY = scrollPos.top;
        
        this.debugLog('savePosition: Saving scrollY=' + scrollY + 'px from .obsidian-document');
        console.log('💾 Saving scroll position:', scrollY, 'px from .obsidian-document');
        
        // Don't save if at the very top (might be fresh load)
        if (scrollY < 50) {
            this.debugLog("savePosition: Skipping - scroll position too low");
            return;
        }
        
        // Find the most visible header
        let nearestHeader = null;
        let headerVisibility = 0;
        let headerDistance = Infinity;
        
        if (ObsidianSite.document.headers) {
            const flatHeaders = ObsidianSite.document.getFlatHeaders();
            const containerMiddle = scrollPos.height / 2;
            
            this.debugLog('savePosition: Checking ' + flatHeaders.length + ' headers');
            
            for (const header of flatHeaders) {
                const element = header.headerElement;
                if (!element) continue;
                
                // Get position relative to scroll container
                const containerRect = this.getScrollContainer().getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                
                // Calculate position relative to container
                const relativeTop = elementRect.top - containerRect.top + scrollY;
                const distanceToMiddle = Math.abs(relativeTop + (elementRect.height / 2) - (scrollY + containerMiddle));
                
                // Calculate visibility percentage
                const visibleTop = Math.max(0, -elementRect.top + containerRect.top);
                const visibleBottom = Math.max(0, scrollPos.height - (elementRect.top - containerRect.top));
                const visibleHeight = Math.min(elementRect.height, visibleBottom) - visibleTop;
                const visibility = visibleHeight / elementRect.height;
                
                this.debugLog('  Header "' + header.text.substring(0, 30) + '": ' +
                            'dist=' + distanceToMiddle.toFixed(1) + ', vis=' + visibility.toFixed(2) + ', ' +
                            'relTop=' + relativeTop.toFixed(0));
                
                // Prefer headers that are closer to middle and more visible
                if (distanceToMiddle < headerDistance || 
                    (distanceToMiddle === headerDistance && visibility > headerVisibility)) {
                    headerDistance = distanceToMiddle;
                    headerVisibility = visibility;
                    nearestHeader = header;
                }
            }
        }
        
        const position = {
            path: ObsidianSite.document.pathname,
            scrollY: scrollY,
            containerHeight: scrollPos.height,
            totalHeight: scrollPos.scrollHeight,
            timestamp: Date.now(),
            nearestHeader: nearestHeader ? {
                id: nearestHeader.id,
                text: nearestHeader.text.substring(0, 100),
                relativeTop: this.getHeaderRelativePosition(nearestHeader)
            } : null,
            headerVisibility: headerVisibility,
            headerDistance: headerDistance,
            containerType: this.getScrollContainer() === window ? 'window' : '.obsidian-document'
        };
        
        this.lastPosition = position;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(position));
        
        this.debugLog('savePosition: Saved! Header: ' + (nearestHeader?.text?.substring(0, 50) || 'none') + ', ' +
                     'Visibility: ' + headerVisibility.toFixed(2));
        console.log('✅ Saved position:', {
            scrollY: scrollY,
            header: nearestHeader?.text?.substring(0, 50),
            container: position.containerType
        });
    }
    
    // Get header position relative to scroll container
    getHeaderRelativePosition(header) {
        const element = header.headerElement;
        if (!element) return null;
        
        const container = this.getScrollContainer();
        if (container === window) {
            const rect = element.getBoundingClientRect();
            return rect.top + window.scrollY;
        } else {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            return elementRect.top - containerRect.top + container.scrollTop;
        }
    }
    
    // Simple test function to log current position
    logCurrentPosition() {
        const container = this.getScrollContainer();
        const scrollTop = container === window ? window.scrollY : container.scrollTop;
        console.log('📏 Current scroll in .obsidian-document:', scrollTop, 'px');
        return scrollTop;
    }
    
    // Restore saved position
    async restorePosition(showPrompt = true) {
        this.debugLog('restorePosition called, showPrompt=' + showPrompt);
        
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved) {
            this.debugLog("restorePosition: No saved position found");
            return false;
        }
        
        try {
            const position = JSON.parse(saved);
            this.lastPosition = position;
            
            this.debugLog("restorePosition: Parsed position:", position);
            console.log('🔄 Restoring from:', position);
            
            // Get current path
            const currentPath = ObsidianSite.document?.pathname || 
                               document.querySelector('meta[name="pathname"]')?.content ||
                               window.location.pathname;
            
            if (position.path === currentPath) {
                this.debugLog("restorePosition: Same page, scrolling directly");
                console.log('📍 Same page, scrolling to:', position.scrollY, 'px');
                await this.scrollToPosition(position);
                return true;
            } else if (showPrompt) {
                this.debugLog("restorePosition: Different page, showing prompt");
                return await this.showContinuePrompt(position);
            } else {
                this.debugLog("restorePosition: Silent restore to different page");
                return await this.navigateToPosition(position);
            }
        } catch (e) {
            this.debugError("restorePosition: Error parsing saved position:", e);
            return false;
        }
    }
    
    // Scroll to specific position
    async scrollToPosition(position) {
        console.log('🎯 Attempting to scroll .obsidian-document to:', position.scrollY, 'px');
        
        return new Promise((resolve) => {
            // Set scroll position
            this.setScrollPosition(position.scrollY);
            
            // Check if we reached the target
            setTimeout(() => {
                const afterScroll = this.getScrollPosition().top;
                const difference = Math.abs(afterScroll - position.scrollY);
                
                console.log('📊 Scroll result: Target=' + position.scrollY + ', Actual=' + afterScroll + ', Diff=' + difference + 'px');
                
                if (difference > 100) {
                    console.log('⚠️ Missed target, retrying...');
                    setTimeout(() => {
                        this.setScrollPosition(position.scrollY);
                        setTimeout(() => {
                            const finalScroll = this.getScrollPosition().top;
                            console.log('🎯 Final scroll: ' + finalScroll + 'px');
                            resolve();
                        }, 600);
                    }, 300);
                } else {
                    console.log('✅ Scroll successful!');
                    resolve();
                }
            }, 800);
        });
    }
    
    // Show continue reading prompt
    async showContinuePrompt(position) {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'continue-reading-modal';
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <h3>Продолжить чтение?</h3>
                    <p>Вы читали: <strong>${this.getDocumentTitle(position.path)}</strong></p>
                    <p>Открыто: ${new Date(position.timestamp).toLocaleString()}</p>
                    <div class="modal-buttons">
                        <button class="modal-button continue-btn">Продолжить чтение</button>
                        <button class="modal-button dismiss-btn">Новая сессия</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .continue-reading-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    font-family: var(--font-family);
                }
                
                .modal-backdrop {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(2px);
                }
                
                .modal-content {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: var(--background-primary);
                    border-radius: 8px;
                    padding: 24px;
                    min-width: 300px;
                    max-width: 500px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    border: 1px solid var(--background-modifier-border);
                }
                
                .modal-content h3 {
                    margin-top: 0;
                    color: var(--text-normal);
                }
                
                .modal-content p {
                    color: var(--text-muted);
                    margin: 10px 0;
                }
                
                .modal-buttons {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                
                .modal-button {
                    flex: 1;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                }
                
                .continue-btn {
                    background: var(--interactive-accent);
                    color: var(--text-on-accent);
                }
                
                .continue-btn:hover {
                    background: var(--interactive-accent-hover);
                }
                
                .dismiss-btn {
                    background: var(--background-secondary);
                    color: var(--text-normal);
                }
                
                .dismiss-btn:hover {
                    background: var(--background-modifier-hover);
                }
            `;
            document.head.appendChild(style);
            
            // Handle button clicks
            modal.querySelector('.continue-btn').addEventListener('click', async () => {
                this.debugLog("showContinuePrompt: User clicked Continue");
                modal.remove();
                style.remove();
                const success = await this.navigateToPosition(position);
                resolve(success);
            });
            
            modal.querySelector('.dismiss-btn').addEventListener('click', () => {
                this.debugLog("showContinuePrompt: User clicked Dismiss");
                modal.remove();
                style.remove();
                localStorage.removeItem(this.STORAGE_KEY);
                resolve(false);
            });
            
            // Close on backdrop click
            modal.querySelector('.modal-backdrop').addEventListener('click', () => {
                this.debugLog("showContinuePrompt: User clicked backdrop");
                modal.remove();
                style.remove();
                resolve(false);
            });
        });
    }
    
    // Navigate to saved position
    async navigateToPosition(position) {
        try {
            this.isRestoring = true;
            this.debugLog('navigateToPosition: Starting restoration to ' + position.path);
            
            // Navigate to the page
            this.debugLog('navigateToPosition: Calling ObsidianSite.loadURL for ' + position.path);
            await ObsidianSite.loadURL(position.path, false);
            
            this.debugLog("navigateToPosition: Page loaded, waiting for readiness...");
            
            // Wait for document to be fully processed
            await this.waitForDocumentReady();
            
            this.debugLog("navigateToPosition: Document ready, scrolling...");
            
            // Scroll to position
            await this.scrollToPosition(position);
            
            this.isRestoring = false;
            this.debugLog("navigateToPosition: Restoration complete!");
            return true;
        } catch (error) {
            this.debugError("navigateToPosition: Error:", error);
            this.isRestoring = false;
            return false;
        }
    }
    
    // Wait for document to be ready
    async waitForDocumentReady() {
        return new Promise((resolve) => {
            // Check if document is already ready
            if (ObsidianSite.document?.initialized) {
                resolve();
                return;
            }
            
            let readyCount = 0;
            const maxChecks = 50;
            const checkInterval = 100;
            
            const checkReady = () => {
                readyCount++;
                
                const isReady = ObsidianSite.document?.initialized;
                const hasHeaders = ObsidianSite.document?.headers?.length > 0;
                const hasContent = ObsidianSite.document?.documentEl?.innerHTML?.length > 100;
                
                if (isReady && hasHeaders && hasContent) {
                    resolve();
                } else if (readyCount >= maxChecks) {
                    resolve();
                } else {
                    setTimeout(checkReady, checkInterval);
                }
            };
            
            checkReady();
        });
    }
    
    // Get document title from path
    getDocumentTitle(path) {
        const data = ObsidianSite.getWebpageData(path);
        return data?.title || path.split('/').pop().replace('.html', '') || 'Document';
    }
    
    // Initialize tracking
    init() {
        this.debugLog("init: Starting ReadingPositionTracker");
        
        // Find scroll container
        const container = this.getScrollContainer();
        console.log('🎯 Using scroll container:', 
            container === window ? 'window' : 
            container.classList ? '.' + container.classList[0] : 
            container.id || 'unknown');
        
        // Save position on scroll (with debounce)
        let scrollTimeout;
        const saveScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                console.log('💾 Auto-saving scroll position...');
                this.savePosition();
            }, 1500);
        };
        
        // Listen to scroll on the correct container
        if (container.addEventListener) {
            container.addEventListener('scroll', saveScroll);
        }
        
        // Also listen to window scroll as fallback
        window.addEventListener('scroll', saveScroll);
        
        // Save position on page unload
        window.addEventListener('beforeunload', () => {
            console.log('💾 Saving final position before unload');
            this.savePosition();
        });
        
        // Auto-restore on page load
        setTimeout(() => {
            console.log('🔄 Auto-restore check starting');
            
            // Check if we should restore (only if not already scrolled)
            const currentScroll = this.getScrollPosition().top;
            if (currentScroll < 100) {
                console.log('📍 Page at top, attempting restore');
                this.restorePosition(true);
            } else {
                console.log('📍 Page already scrolled to ' + currentScroll + ', skipping auto-restore');
            }
        }, 1500);
        
        console.log('✅ ReadingPositionTracker initialized');
    }
    
    // Debug logging
    debugLog(...args) {
        if (this.debugMode) {
            console.log('[ReadingTracker]', ...args);
        }
    }
    
    debugError(...args) {
        if (this.debugMode) {
            console.error('[ReadingTracker]', ...args);
        }
    }
}

// Initialize when ObsidianSite is ready
ObsidianSite.onDocumentLoad(() => {
    console.log('📄 Document loaded, initializing ReadingPositionTracker...');
    
    // Create and initialize tracker
    window.readingTracker = new ReadingPositionTracker();
    window.readingTracker.init();
    
    // Helper function to test current position
    window.showScrollPosition = () => {
        if (window.readingTracker) {
            return window.readingTracker.logCurrentPosition();
        }
    };
    
    console.log('✅ ReadingPositionTracker ready');
});

console.log('📖 ReadingPositionTracker script loaded');
console.log('x')