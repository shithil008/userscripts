/**
 * Modern Status Panel Library
 * A modern and minimalistic status monitoring panel
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    // Panel state
    let state = {
        status: 'Idle',
        progress: 0,
        panelTitle: 'Status Monitor',
        reference: '',
        currentStep: 'Initializing',
        requestCount: 0,
        lastUpdate: new Date().toLocaleTimeString(),
        logs: []
    };

    // Add modern styles
    function addStyles() {
        if (document.getElementById('modernPanelStyles')) return;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'modernPanelStyles';
        styleSheet.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            #modernPanel {
                position: fixed;
                top: 10px;
                right: 10px;
                width: min(380px, calc(100vw - 20px));
                max-height: calc(100vh - 20px);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                z-index: 999999;
                animation: slideIn 0.3s ease-out;
                overflow: hidden;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(450px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            #modernPanel.minimized .panel-body {
                display: none;
            }
            
            #modernPanel.minimized {
                width: min(280px, calc(100vw - 20px));
            }
            
            .panel-container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                backdrop-filter: blur(10px);
            }
            
            .panel-header {
                background: rgba(255, 255, 255, 0.1);
                padding: min(16px, 2vh) min(20px, 3vw);
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                cursor: move;
            }
            
            .panel-title {
                color: #ffffff;
                font-size: 16px;
                font-weight: 600;
                letter-spacing: -0.3px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .panel-title::before {
                content: '●';
                color: #4ade80;
                font-size: 20px;
                animation: pulse 2s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            
            .panel-controls {
                display: flex;
                gap: 8px;
            }
            
            .panel-btn {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-size: 16px;
            }
            
            .panel-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }
            
            .panel-body {
                padding: min(16px, 2.5vw);
                color: white;
                max-height: calc(100vh - 100px);
                overflow-y: auto;
                overflow-x: hidden;
            }
            
            .panel-body::-webkit-scrollbar {
                width: 6px;
            }
            
            .panel-body::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
            }
            
            .panel-body::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }
            
            .status-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }
            
            .status-card:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateY(-2px);
            }
            
            .status-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .status-row:last-child {
                margin-bottom: 0;
            }
            
            .status-label {
                font-size: max(10px, min(13px, 3vw));
                font-weight: 500;
                color: rgba(255, 255, 255, 0.7);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .status-value {
                font-size: max(11px, min(14px, 3.2vw));
                font-weight: 600;
                color: #ffffff;
                text-align: right;
                max-width: 60%;
                word-break: break-word;
            }
            
            .progress-container {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .progress-label {
                font-size: 12px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
            }
            
            .progress-bar-container {
                height: 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4ade80 0%, #3b82f6 100%);
                border-radius: 4px;
                transition: width 0.5s ease;
                box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
            }
            
            .logs-container {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 12px;
                padding: 12px;
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 16px;
            }
            
            .logs-container::-webkit-scrollbar {
                width: 6px;
            }
            
            .logs-container::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 3px;
            }
            
            .logs-container::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }
            
            .log-entry {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
                padding: 6px 8px;
                margin-bottom: 4px;
                border-left: 2px solid #4ade80;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                animation: logFadeIn 0.3s ease;
            }
            
            @keyframes logFadeIn {
                from {
                    opacity: 0;
                    transform: translateX(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .log-time {
                color: rgba(255, 255, 255, 0.5);
                font-size: 11px;
                margin-right: 8px;
            }
            
            .action-buttons {
                display: flex;
                justify-content: center;
                gap: 10px;
            }
            
            .action-btn {
                padding: 12px;
                border-radius: 10px;
                border: none;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: 'Inter', sans-serif;
            }
            
            .action-btn.primary {
                background: linear-gradient(135deg, #4ade80 0%, #3b82f6 100%);
                color: white;
            }
            
            .action-btn.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .action-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            }
            
            .action-btn:active {
                transform: translateY(0);
            }
            
            /* Mobile Responsive */
            @media (max-width: 768px) {
                #modernPanel {
                    top: 8px;
                    right: 8px;
                    left: 8px;
                    width: calc(100vw - 16px) !important;
                    max-height: calc(100vh - 16px);
                }
                
                .panel-body {
                    padding: 14px;
                    max-height: calc(100vh - 80px);
                }
                
                .status-card {
                    padding: 12px;
                    margin-bottom: 12px;
                }
            }
            
            @media (max-width: 480px) {
                #modernPanel {
                    top: 4px;
                    right: 4px;
                    left: 4px;
                    width: calc(100vw - 8px) !important;
                    max-height: calc(100vh - 8px);
                }
                
                .panel-header {
                    padding: 10px 12px;
                }
                
                .panel-title {
                    font-size: 13px;
                }
                
                .panel-btn {
                    width: 28px;
                    height: 28px;
                    font-size: 14px;
                }
                
                .panel-body {
                    padding: 10px;
                    max-height: calc(100vh - 60px);
                }
                
                .status-card {
                    padding: 8px;
                    margin-bottom: 10px;
                }
                
                .status-row {
                    margin-bottom: 8px;
                }
                
                .status-label {
                    font-size: 10px;
                }
                
                .status-value {
                    font-size: 11px;
                }
                
                .progress-container {
                    padding: 10px;
                    margin-bottom: 10px;
                }
                
                .progress-label {
                    font-size: 10px;
                }
                
                .logs-container {
                    max-height: 100px;
                    padding: 8px;
                    margin-bottom: 10px;
                }
                
                .log-entry {
                    font-size: 10px;
                    padding: 4px 6px;
                    margin-bottom: 3px;
                }
                
                .log-time {
                    font-size: 9px;
                }
                
                .action-btn {
                    padding: 8px;
                    font-size: 11px;
                }
            }
            
            @media (max-width: 360px) {
                #modernPanel {
                    top: 0 !important;
                    right: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    max-height: 100vh;
                }
                
                .panel-container {
                    border-radius: 0;
                    max-height: 100vh;
                }
                
                .panel-header {
                    padding: 6px 8px;
                }
                
                .panel-title {
                    font-size: 11px;
                }
                
                .panel-title::before {
                    font-size: 14px;
                }
                
                .panel-btn {
                    width: 24px;
                    height: 24px;
                    font-size: 12px;
                }
                
                .panel-body {
                    padding: 6px;
                    max-height: calc(100vh - 45px);
                }
                
                .status-card {
                    padding: 5px;
                    margin-bottom: 6px;
                }
                
                .status-row {
                    margin-bottom: 5px;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 3px;
                }
                
                .status-label {
                    font-size: 8px;
                }
                
                .status-value {
                    font-size: 9px;
                    max-width: 100%;
                    text-align: left;
                }
                
                .progress-container {
                    padding: 6px;
                    margin-bottom: 6px;
                }
                
                .progress-label {
                    font-size: 8px;
                }
                
                .progress-bar-container {
                    height: 5px;
                }
                
                .logs-container {
                    max-height: 60px;
                    padding: 5px;
                    margin-bottom: 6px;
                }
                
                .log-entry {
                    font-size: 8px;
                    padding: 2px 4px;
                    margin-bottom: 2px;
                }
                
                .log-time {
                    font-size: 7px;
                    display: block;
                    margin-bottom: 2px;
                }
                
                .action-btn {
                    padding: 6px;
                    font-size: 9px;
                }
            }
            
            @media (max-width: 300px) {
                #modernPanel {
                    font-size: 10px;
                }
                
                .panel-header {
                    padding: 4px 6px;
                }
                
                .panel-title {
                    font-size: 9px;
                    gap: 4px;
                }
                
                .panel-title::before {
                    font-size: 12px;
                }
                
                .panel-btn {
                    width: 20px;
                    height: 20px;
                    font-size: 10px;
                    border-radius: 4px;
                }
                
                .panel-controls {
                    gap: 4px;
                }
                
                .panel-body {
                    padding: 4px;
                    max-height: calc(100vh - 35px);
                }
                
                .status-card {
                    padding: 4px;
                    margin-bottom: 4px;
                    border-radius: 6px;
                }
                
                .status-row {
                    margin-bottom: 3px;
                    gap: 2px;
                }
                
                .status-label {
                    font-size: 7px;
                    letter-spacing: 0.3px;
                }
                
                .status-value {
                    font-size: 8px;
                }
                
                .progress-container {
                    padding: 4px;
                    margin-bottom: 4px;
                    border-radius: 6px;
                }
                
                .progress-label {
                    font-size: 7px;
                    margin-bottom: 4px;
                }
                
                .progress-bar-container {
                    height: 4px;
                }
                
                .logs-container {
                    max-height: 50px;
                    padding: 4px;
                    margin-bottom: 4px;
                    border-radius: 6px;
                }
                
                .log-entry {
                    font-size: 7px;
                    padding: 2px 3px;
                    margin-bottom: 1px;
                }
                
                .log-time {
                    font-size: 6px;
                    margin-right: 4px;
                    margin-bottom: 1px;
                }
                
                .action-btn {
                    padding: 5px;
                    font-size: 8px;
                    border-radius: 6px;
                }
            }
            
            .panel-header.dragging {
                cursor: grabbing;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // Create panel HTML
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'modernPanel';
        panel.innerHTML = `
            <div class="panel-container">
                <div class="panel-header" id="panelHeader">
                    <div class="panel-title" id="panelTitle">
                        ${state.panelTitle}
                    </div>
                    <div class="panel-controls">
                        <button class="panel-btn" id="minimizeBtn" title="Minimize">−</button>
                        <button class="panel-btn" id="closeBtn" title="Close">×</button>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="status-card">
                        <div class="status-row">
                            <span class="status-label">Reference</span>
                            <span class="status-value" id="reference">${state.reference || '-'}</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Current Step</span>
                            <span class="status-value" id="currentStep">${state.currentStep}</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Request Count</span>
                            <span class="status-value" id="requestCount">${state.requestCount}</span>
                        </div>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Progress</span>
                            <span id="progressPercent">${state.progress}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="progressBar" style="width: ${state.progress}%"></div>
                        </div>
                    </div>
                    
                    <div class="logs-container" id="logsContainer">
                    </div>
                    
                    <div class="action-buttons">
                        <button class="action-btn primary" id="exportBtn">Export Logs</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        setupEventListeners();
        makeDraggable();
        
        addLog('Panel initialized');
    }

    // Setup event listeners
    function setupEventListeners() {
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            document.getElementById('modernPanel').classList.toggle('minimized');
            const btn = document.getElementById('minimizeBtn');
            btn.textContent = document.getElementById('modernPanel').classList.contains('minimized') ? '+' : '−';
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            document.getElementById('modernPanel').style.display = 'none';
        });

        document.getElementById('exportBtn').addEventListener('click', exportLogs);
    }

    // Make panel draggable
    function makeDraggable() {
        const panel = document.getElementById('modernPanel');
        const header = document.getElementById('panelHeader');
        let isDragging = false;
        let currentX, currentY, initialX, initialY;

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - panel.offsetLeft;
            initialY = e.clientY - panel.offsetTop;
            
            if (e.target === header || e.target.classList.contains('panel-title')) {
                isDragging = true;
                header.classList.add('dragging');
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                panel.style.right = 'auto';
                panel.style.top = currentY + 'px';
                panel.style.left = currentX + 'px';
            }
        }

        function dragEnd() {
            isDragging = false;
            header.classList.remove('dragging');
        }
    }

    // Update panel state
    function updatePanel(updates) {
        if (updates.panelTitle !== undefined) {
            state.panelTitle = updates.panelTitle;
            const titleElement = document.getElementById('panelTitle');
            titleElement.textContent = updates.panelTitle;
        }

        if (updates.reference !== undefined) {
            state.reference = updates.reference;
            document.getElementById('reference').textContent = updates.reference || '-';
        }

        if (updates.currentStep !== undefined) {
            state.currentStep = updates.currentStep;
            document.getElementById('currentStep').textContent = updates.currentStep;
            addLog(`Step: ${updates.currentStep}`);
        }

        if (updates.requestCount !== undefined) {
            state.requestCount = updates.requestCount;
            document.getElementById('requestCount').textContent = updates.requestCount;
        }

        if (updates.progress !== undefined) {
            state.progress = updates.progress;
            document.getElementById('progressBar').style.width = updates.progress + '%';
            document.getElementById('progressPercent').textContent = updates.progress + '%';
        }

        state.lastUpdate = new Date().toLocaleTimeString();
    }

    // Add log entry
    function addLog(message) {
        const time = new Date().toLocaleTimeString();
        state.logs.push({ time, message });
        
        const logsContainer = document.getElementById('logsContainer');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">${time}</span><span>${message}</span>`;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        if (state.logs.length > 50) {
            state.logs.shift();
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }

    // Export logs
    function exportLogs() {
        const logsText = state.logs.map(log => `[${log.time}] ${log.message}`).join('\n');
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('Logs exported');
    }

    // Initialize function
    function init(options = {}) {
        addStyles();
        
        // Merge options with state
        if (options.panelTitle) state.panelTitle = options.panelTitle;
        if (options.progress !== undefined) state.progress = options.progress;
        if (options.reference) state.reference = options.reference;
        if (options.currentStep) state.currentStep = options.currentStep;
        if (options.requestCount !== undefined) state.requestCount = options.requestCount;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createPanel);
        } else {
            createPanel();
        }
    }

    // Expose API
    window.ModernStatusPanel = {
        init: init,
        update: updatePanel,
        addLog: addLog,
        show: () => {
            const panel = document.getElementById('modernPanel');
            if (panel) panel.style.display = 'block';
        },
        hide: () => {
            const panel = document.getElementById('modernPanel');
            if (panel) panel.style.display = 'none';
        },
        toggle: () => {
            const panel = document.getElementById('modernPanel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        },
        getState: () => ({ ...state })
    };

})(window);
