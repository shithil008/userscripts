// ==UserScript==
// @name         JS CDN File Monitor
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Monitor JS CDN file for changes with beautiful diff viewer
// @author       You
// @match        *://*/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.7/beautify.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const CDN_URL = 'https://payment.ivacbd.com/assets/index-C7eSgvFH.js';
    const CHECK_INTERVAL = 10000; // 10 seconds
    const AUDIO_URL = 'https://cdn.pixabay.com/download/audio/2024/07/04/audio_5fd8f48411.mp3?filename=success-221935.mp3';

    let previousCode = '';
    let currentCode = '';
    let monitorInterval = null;
    let isMonitorOpen = false;
    let shouldStopOnChanges = true; // Default to true
    let changedLines = []; // Store changed lines for navigation
    let currentChangedLineIndex = -1; // Current position in changed lines array
    let audioLoopInterval = null; // For continuous sound looping
    let audioElement = null; // Audio element for playing sound

    // Create the monitor UI
    function createMonitorUI() {
        // Add styles
        addStyles();

        // Create audio element
        createAudioElement();

        // Main container
        const container = document.createElement('div');
        container.id = 'js-cdn-monitor';
        container.className = 'monitor-container';

        // Header
        const header = document.createElement('div');
        header.className = 'monitor-header';

        const title = document.createElement('div');
        title.textContent = 'JS CDN Monitor';
        title.className = 'monitor-title';

        const controls = document.createElement('div');
        controls.className = 'monitor-controls';

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = CDN_URL;
        urlInput.placeholder = 'Enter CDN URL...';
        urlInput.className = 'monitor-input';

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'Start';
        toggleBtn.className = 'monitor-btn monitor-btn-start';

        const stopOnChangesCheckbox = document.createElement('label');
        stopOnChangesCheckbox.innerHTML = '<input type="checkbox" id="stop-on-changes" checked> Stop on changes';
        stopOnChangesCheckbox.style.color = '#e2e8f0';
        stopOnChangesCheckbox.style.fontSize = '12px';
        stopOnChangesCheckbox.style.marginLeft = '10px';
        stopOnChangesCheckbox.style.display = 'flex';
        stopOnChangesCheckbox.style.alignItems = 'center';
        stopOnChangesCheckbox.style.gap = '5px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.className = 'monitor-btn monitor-btn-close';

        // Status bar
        const statusBar = document.createElement('div');
        statusBar.className = 'monitor-status';
        statusBar.textContent = 'Ready to monitor...';

        // Editor container
        const editorContainer = document.createElement('div');
        editorContainer.className = 'monitor-editor-container';
        editorContainer.id = 'editor-container'; // Add ID for easier access

        const editor = document.createElement('div');
        editor.className = 'monitor-editor';
        editor.id = 'monitor-editor'; // Add ID for easier access

        // Assemble UI
        controls.appendChild(urlInput);
        controls.appendChild(toggleBtn);
        controls.appendChild(stopOnChangesCheckbox);
        controls.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(controls);
        editorContainer.appendChild(editor);
        container.appendChild(header);
        container.appendChild(statusBar);
        container.appendChild(editorContainer);
        document.body.appendChild(container);

        // Event handlers
        let isMonitoring = false;

        // Handle stop on changes checkbox
        const stopOnChangesInput = stopOnChangesCheckbox.querySelector('input');
        stopOnChangesInput.addEventListener('change', () => {
            shouldStopOnChanges = stopOnChangesInput.checked;
        });

        toggleBtn.addEventListener('click', async () => {
            if (isMonitoring) {
                stopMonitoring();
                toggleBtn.textContent = 'Start';
                toggleBtn.className = 'monitor-btn monitor-btn-start';
                isMonitoring = false;
                stopOnChangesInput.disabled = false;
            } else {
                await startMonitoring(urlInput.value);
                toggleBtn.textContent = 'Stop';
                toggleBtn.className = 'monitor-btn monitor-btn-stop';
                isMonitoring = true;
                stopOnChangesInput.disabled = true;
            }
        });

        closeBtn.addEventListener('click', () => {
            container.style.display = 'none';
            isMonitorOpen = false;
            stopMonitoring();
            stopAudioLoop(); // Stop any playing audio when closing
        });

        // Tab key navigation for changed lines
        editorContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && changedLines.length > 0) {
                e.preventDefault();
                navigateToNextChangedLine();
            }
        });

        // Stop audio loop on any user interaction
        function stopAudioOnUserActivity() {
            const stopEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
            stopEvents.forEach(eventType => {
                document.addEventListener(eventType, stopAudioLoop, { once: true });
            });
        }

        // Make draggable with boundary constraints
        makeDraggable(container, header);

        function updateStatus(message, isError = false) {
            const timestamp = new Date().toLocaleTimeString();
            statusBar.textContent = timestamp + ': ' + message;
            statusBar.className = 'monitor-status ' + (isError ? 'error' : 'success');
        }

        function navigateToNextChangedLine() {
            if (changedLines.length === 0) return;

            // Move to next changed line
            currentChangedLineIndex = (currentChangedLineIndex + 1) % changedLines.length;
            const lineNumber = changedLines[currentChangedLineIndex];

            // Find the line element
            const lineElement = document.querySelector(`.code-line:nth-child(${lineNumber})`);
            if (lineElement) {
                // Scroll to the line
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add temporary highlight effect
                lineElement.classList.add('navigating');
                setTimeout(() => {
                    lineElement.classList.remove('navigating');
                }, 2000);

                updateStatus(`Navigated to changed line ${lineNumber} (${currentChangedLineIndex + 1}/${changedLines.length})`);
            }
        }

        function displayCode(code, changes = []) {
            // Store changed lines for navigation
            changedLines = changes;
            currentChangedLineIndex = -1; // Reset navigation index

            if (!code) {
                editor.textContent = 'No code to display';
                return;
            }

            // Beautify the code
            let beautified = code;
            try {
                if (typeof js_beautify !== 'undefined') {
                    beautified = js_beautify(code, {
                        indent_size: 2,
                        space_in_empty_paren: false,
                        preserve_newlines: true,
                        max_preserve_newlines: 2,
                        wrap_line_length: 80
                    });
                }
            } catch (e) {
                console.warn('Failed to beautify code:', e);
                beautified = code;
            }

            // Clear editor
            editor.innerHTML = '';

            const lines = beautified.split('\n');

            lines.forEach((line, index) => {
                const lineNumber = index + 1;
                const isChanged = changes.includes(lineNumber);

                const lineDiv = document.createElement('div');
                lineDiv.className = 'code-line' + (isChanged ? ' changed' : '');

                const lineNumSpan = document.createElement('span');
                lineNumSpan.className = 'line-number';
                lineNumSpan.textContent = lineNumber.toString().padStart(4, ' ');

                const codeSpan = document.createElement('span');
                codeSpan.className = 'line-code';
                codeSpan.textContent = line || ' ';

                // Apply basic syntax highlighting
                highlightSyntax(codeSpan);

                lineDiv.appendChild(lineNumSpan);
                lineDiv.appendChild(codeSpan);
                editor.appendChild(lineDiv);
            });

            // Update status with change information
            if (changes.length > 0) {
                updateStatus(`Displaying code with ${changes.length} changed lines. Press Tab to navigate.`);
            }
        }

        // Create audio element
        function createAudioElement() {
            audioElement = new Audio(AUDIO_URL);
            audioElement.preload = 'auto';
        }

        // Play sound effect with proper promise handling
        function playSound() {
            try {
                // Reset audio to start
                audioElement.currentTime = 0;

                // Handle the promise properly
                const playPromise = audioElement.play();

                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            // Audio playback started successfully
                            console.log('Audio playing successfully');
                        })
                        .catch(error => {
                            // Audio playback failed
                            console.log('Audio play failed:', error.name, error.message);
                            // Stop the loop if playback consistently fails
                            if (error.name !== 'AbortError') {
                                stopAudioLoop();
                            }
                        });
                }
            } catch (e) {
                console.log('Audio play error:', e);
                stopAudioLoop();
            }
        }

        // Start continuous audio loop
        function startAudioLoop() {
            stopAudioLoop(); // Clear any existing loop

            // Try to play immediately with proper error handling
            try {
                audioElement.currentTime = 0;
                const playPromise = audioElement.play();

                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            // Set up the interval only after first play succeeds
                            audioLoopInterval = setInterval(() => {
                                try {
                                    audioElement.currentTime = 0;
                                    const retryPromise = audioElement.play();
                                    if (retryPromise !== undefined) {
                                        retryPromise.catch(e => {
                                            console.log('Loop play failed:', e.name, e.message);
                                            if (e.name !== 'AbortError') {
                                                stopAudioLoop();
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.log('Retry play error:', e);
                                }
                            }, 2000);
                        })
                        .catch(error => {
                            console.log('Initial audio play failed:', error.name, error.message);
                            // Fall back to interval-based approach
                            audioLoopInterval = setInterval(() => {
                                try {
                                    audioElement.currentTime = 0;
                                    const retryPromise = audioElement.play();
                                    if (retryPromise !== undefined) {
                                        retryPromise.catch(e => {
                                            console.log('Retry play failed:', e.name, e.message);
                                            if (e.name !== 'AbortError') {
                                                stopAudioLoop();
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.log('Retry play error:', e);
                                }
                            }, 2000);
                        });
                }
            } catch (e) {
                console.log('Audio initialization error:', e);
                // Fallback to simple interval
                audioLoopInterval = setInterval(() => {
                    try {
                        audioElement.currentTime = 0;
                        const playPromise = audioElement.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(e => console.log('Loop play failed:', e.name, e.message));
                        }
                    } catch (e) {
                        console.log('Loop play error:', e);
                    }
                }, 2000);
            }
        }

        // Stop audio loop
        function stopAudioLoop() {
            if (audioLoopInterval) {
                clearInterval(audioLoopInterval);
                audioLoopInterval = null;
            }
            if (audioElement) {
                try {
                    audioElement.pause();
                    audioElement.currentTime = 0;
                } catch (e) {
                    console.log('Error stopping audio:', e);
                }
            }
        }

        // FIXED SYNTAX HIGHLIGHTING FUNCTION - SIMPLIFIED VERSION
        function highlightSyntax(element) {
            const content = element.textContent;
            if (!content || !content.trim()) return;

            try {
                let result = '';
                let i = 0;
                const len = content.length;

                while (i < len) {
                    let processed = false;

                    // Check for comments
                    if (content.substr(i, 2) === '/*') {
                        const end = content.indexOf('*/', i + 2);
                        if (end !== -1) {
                            result += '<span class="comment">' + content.substring(i, end + 2) + '</span>';
                            i = end + 2;
                            processed = true;
                        }
                    } else if (content.substr(i, 2) === '//') {
                        let end = content.indexOf('\n', i);
                        if (end === -1) end = len;
                        result += '<span class="comment">' + content.substring(i, end) + '</span>';
                        i = end;
                        processed = true;
                    }
                    // Check for strings
                    else if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
                        const quote = content[i];
                        let end = i + 1;
                        while (end < len && content[end] !== quote) {
                            if (content[end] === '\\' && end + 1 < len) end += 2;
                            else end++;
                        }
                        if (end < len) end++; // Include closing quote
                        result += '<span class="string">' + content.substring(i, end) + '</span>';
                        i = end;
                        processed = true;
                    }

                    if (!processed) {
                        result += content[i];
                        i++;
                    }
                }

                // Now apply keyword highlighting to the result
                let finalResult = result;
                const keywords = ['function', 'var', 'let', 'const', 'if', 'else', 'for', 'while', 'return', 'class', 'extends', 'import', 'export', 'default', 'new', 'this', 'true', 'false', 'null', 'undefined', 'await', 'async', 'from', 'of', 'do', 'try', 'catch', 'finally', 'throw', 'with', 'yield', 'static', 'get', 'set', 'addEventListener', 'stop', 'start'];

                keywords.forEach(keyword => {
                    const regex = new RegExp('(>)([^<]*\\b' + keyword + '\\b)', 'g');
                    finalResult = finalResult.replace(regex, function(match, before, codePart) {
                        return before + codePart.replace(new RegExp('\\b' + keyword + '\\b', 'g'), '<span class="keyword">' + keyword + '</span>');
                    });
                });

                // Escape HTML in the final result
                finalResult = finalResult
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '<')
                    .replace(/>/g, '>');

                element.innerHTML = finalResult;
            } catch (e) {
                console.warn('Syntax highlighting failed:', e);
                element.textContent = content;
            }
        }

        // IMPROVED CODE COMPARISON FUNCTION
        function compareCode(oldCode, newCode) {
            if (!oldCode) return [];

            try {
                // Use consistent beautification for both codes
                const beautifyOptions = {
                    indent_size: 2,
                    preserve_newlines: true,
                    max_preserve_newlines: 2,
                    space_in_empty_paren: false,
                    wrap_line_length: 0
                };

                const oldFormatted = typeof js_beautify !== 'undefined'
                    ? js_beautify(oldCode, beautifyOptions)
                    : oldCode;
                const newFormatted = typeof js_beautify !== 'undefined'
                    ? js_beautify(newCode, beautifyOptions)
                    : newCode;

                const oldLines = oldFormatted.split('\n');
                const newLines = newFormatted.split('\n');

                const changedLines = [];
                const maxLength = Math.max(oldLines.length, newLines.length);

                for (let i = 0; i < maxLength; i++) {
                    const oldLine = oldLines[i] || '';
                    const newLine = newLines[i] || '';

                    // Normalize whitespace for comparison but preserve meaningful differences
                    const oldNormalized = oldLine.trim();
                    const newNormalized = newLine.trim();

                    if (oldNormalized !== newNormalized) {
                        changedLines.push(i + 1);
                    }
                }

                return changedLines;
            } catch (e) {
                console.warn('Code comparison failed:', e);
                return []; // Return no changes on error to avoid false positives
            }
        }

        // ENHANCED FETCH CODE FUNCTION
        async function fetchCode(url) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });

                if (response.ok) {
                    let newCode = await response.text();

                    // Remove BOM if present
                    if (newCode.charCodeAt(0) === 0xFEFF) {
                        newCode = newCode.slice(1);
                    }

                    currentCode = newCode;

                    if (previousCode !== undefined && previousCode !== currentCode) {
                        const changes = compareCode(previousCode, currentCode);
                        displayCode(currentCode, changes);
                        if (changes.length > 0) {
                            updateStatus('Code changed! ' + changes.length + ' lines modified.');

                            // Play sound and start loop
                            startAudioLoop();
                            stopAudioOnUserActivity(); // Set up to stop on user activity

                            // Stop monitoring if option is enabled
                            if (shouldStopOnChanges) {
                                stopMonitoring();
                                toggleBtn.textContent = 'Start';
                                toggleBtn.className = 'monitor-btn monitor-btn-start';
                                isMonitoring = false;
                                stopOnChangesInput.disabled = false;
                                updateStatus('Code changed! Monitoring stopped. ' + changes.length + ' lines modified. Press Tab to navigate.');
                            }
                        } else {
                            updateStatus('No meaningful changes detected.');
                        }
                    } else if (previousCode !== undefined && previousCode === currentCode) {
                        displayCode(currentCode);
                        updateStatus('No changes detected.');
                    } else {
                        displayCode(currentCode);
                        updateStatus('Initial code loaded.');
                    }

                    previousCode = currentCode;
                } else {
                    updateStatus('Error: ' + response.status + ' - ' + response.statusText, true);
                    if(response.status == 403) {
                        window.open(window.location.origin, "_blank");
                    }
                }
            } catch (error) {
                updateStatus('Network error: ' + error.message, true);
            }
        }

        async function startMonitoring(url) {
            if (!url) {
                updateStatus('Please enter a valid URL.', true);
                return;
            }

            // Reset navigation
            changedLines = [];
            currentChangedLineIndex = -1;
            stopAudioLoop(); // Stop any existing audio

            updateStatus('Starting to monitor: ' + url);
            await fetchCode(url);

            monitorInterval = setInterval(async () => {
                await fetchCode(url);
            }, CHECK_INTERVAL);
        }

        function stopMonitoring() {
            if (monitorInterval) {
                clearInterval(monitorInterval);
                monitorInterval = null;
                updateStatus('Monitoring stopped.');
            }
            stopAudioLoop(); // Stop audio when monitoring stops
        }

        return container;
    }

    function addStyles() {
        if (document.getElementById('js-cdn-monitor-styles')) return;

        const style = document.createElement('style');
        style.id = 'js-cdn-monitor-styles';
        style.textContent = `
            .monitor-container {
                position: fixed;
                top: 50px;
                right: 20px;
                width: 800px;
                height: 600px;
                background: #2d3748;
                border: 1px solid #4a5568;
                border-radius: 8px;
                z-index: 10000;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                display: none;
                flex-direction: column;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .monitor-header {
                background: #1a202c;
                padding: 12px 16px;
                border-bottom: 1px solid #4a5568;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
                cursor: grab;
            }
            .monitor-header:active {
                cursor: grabbing;
            }
            .monitor-title {
                color: #e2e8f0;
                font-weight: bold;
                font-size: 14px;
            }
            .monitor-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .monitor-input {
                background: #4a5568;
                border: 1px solid #718096;
                color: #e2e8f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                width: 300px;
            }
            .monitor-btn {
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                color: white;
            }
            .monitor-btn-start {
                background: #38a169;
            }
            .monitor-btn-stop {
                background: #e53e3e;
            }
            .monitor-btn-close {
                background: #e53e3e;
                padding: 4px 8px;
                font-size: 16px;
                line-height: 1;
            }
            .monitor-status {
                background: #2d3748;
                padding: 8px 16px;
                border-bottom: 1px solid #4a5568;
                color: #a0aec0;
                font-size: 12px;
            }
            .monitor-status.success {
                color: #68d391;
            }
            .monitor-status.error {
                color: #fc8181;
            }
            .monitor-editor-container {
                flex: 1;
                overflow: auto;
                background: #1a202c;
                outline: none; /* Remove focus outline */
            }
            .monitor-editor {
                padding: 16px;
                background: #1a202c;
                color: #e2e8f0;
                font-size: 13px;
                line-height: 1.5;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            }
            .code-line {
                display: flex;
                padding-left: 8px;
            }
            .code-line.changed {
                background-color: rgba(239, 68, 68, 0.2);
                border-left: 3px solid #ef4444;
            }
            .code-line.navigating {
                background-color: rgba(92, 153, 226, 0.5) !important;
                border-left: 3px solid #4299e1 !important;
                animation: pulse 1s infinite;
            }
            @keyframes pulse {
                0% { background-color: rgba(92, 153, 226, 0.5); }
                50% { background-color: rgba(92, 153, 226, 0.8); }
                100% { background-color: rgba(92, 153, 226, 0.5); }
            }
            .line-number {
                color: #718096;
                user-select: none;
                margin-right: 16px;
                font-size: 11px;
                flex-shrink: 0;
            }
            .line-code {
                white-space: pre-wrap;
                word-wrap: break-word;
                flex: 1;
            }
            .keyword {
                color: #66d9ef;
                font-weight: bold;
            }
            .string {
                color: #a6e22e;
            }
            .number {
                color: #f92672;
            }
            .comment {
                color: #999;
                font-style: italic;
            }
            .floating-btn {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: #4299e1;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 9999;
                font-size: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            }
            .floating-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            }
        `;

        document.head.appendChild(style);
    }

    function makeDraggable(element, handle) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            isDragging = true;
            dragOffset.x = e.clientX - element.offsetLeft;
            dragOffset.y = e.clientY - element.offsetTop;

            // Bring to front when starting to drag
            element.style.zIndex = '10001';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                // Get viewport dimensions
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Get element dimensions
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;

                // Calculate new position with boundaries
                let newX = e.clientX - dragOffset.x;
                let newY = e.clientY - dragOffset.y;

                // Constrain to viewport boundaries with padding
                const padding = 20;
                newX = Math.max(padding, Math.min(newX, viewportWidth - elementWidth - padding));
                newY = Math.max(padding, Math.min(newY, viewportHeight - elementHeight - padding));

                // Apply constrained position
                element.style.left = newX + 'px';
                element.style.top = newY + 'px';
                element.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                // Reset z-index after dragging
                element.style.zIndex = '10000';
            }
        });
    }

    // Create floating button to open monitor
    function createFloatingButton() {
        const button = document.createElement('div');
        button.innerHTML = '👁️';
        button.title = 'Open JS CDN Monitor';
        button.className = 'floating-btn';

        button.addEventListener('click', () => {
            const monitor = document.getElementById('js-cdn-monitor');
            if (monitor.style.display === 'none') {
                monitor.style.display = 'flex';
                isMonitorOpen = true;

                // Focus the editor container for Tab key handling
                const editorContainer = document.getElementById('editor-container');
                if (editorContainer) {
                    editorContainer.tabIndex = -1; // Make it focusable
                    editorContainer.focus();
                }
            } else {
                monitor.style.display = 'none';
                isMonitorOpen = false;
            }
        });

        document.body.appendChild(button);
    }

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createMonitorUI();
            createFloatingButton();
        });
    } else {
        createMonitorUI();
        createFloatingButton();
    }

})();