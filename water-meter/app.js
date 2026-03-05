// Token Water Meter - Main Application
// Visualizes AI token usage as water filling a bucket

class TokenWaterMeter {
    constructor() {
        // DOM elements
        this.water = document.getElementById('water');
        this.bucket = this.water.closest('.bucket');
        this.tokensEl = document.getElementById('tokens');
        this.energyEl = document.getElementById('energy');
        this.gallonsEl = document.getElementById('gallons');
        this.costEl = document.getElementById('cost');
        this.providerEl = document.getElementById('provider');
        this.apiKeyEl = document.getElementById('apiKey');
        this.apiKeyGroup = document.getElementById('api-key-group');
        this.claudeCodeGroup = document.getElementById('claude-code-group');
        this.tokenInput = document.getElementById('tokenInput');
        this.fetchBtn = document.getElementById('fetchBtn');
        this.demoBtn = document.getElementById('demoBtn');
        this.watchBtn = document.getElementById('watchBtn');
        this.filledBuckets = document.getElementById('filledBuckets');
        this.bucketCount = document.getElementById('bucketCount');

        // Constants for scale conversion
        this.TOKENS_PER_GALLON = 200000; // 5 gallons = 1M tokens
        this.WH_PER_TOKEN = 0.001; // Approximate Wh per token
        this.MAX_GALLONS = 5;

        // Pricing (approximate USD per 1M tokens - input/output avg)
        this.PRICING = {
            'claude-code': { input: 3.00, output: 15.00, avg: 9.00 }, // Opus pricing
            anthropic: { input: 3.00, output: 15.00, avg: 9.00 },
            openai: { input: 2.50, output: 10.00, avg: 6.25 },
            demo: { input: 5.00, output: 10.00, avg: 7.50 }
        };

        this.currentTokens = 0;
        this.watchInterval = null;
        this.init();
    }

    init() {
        // Event listeners
        this.providerEl.addEventListener('change', () => this.handleProviderChange());
        this.fetchBtn.addEventListener('click', () => this.fetchUsage());
        this.demoBtn.addEventListener('click', () => this.runDemo());
        this.watchBtn.addEventListener('click', () => this.toggleWatch());

        // Enter key on token input
        this.tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchUsage();
        });

        // Initialize provider state
        this.handleProviderChange();

        // Check for usage.json file on load
        this.checkUsageFile();
    }

    handleProviderChange() {
        const provider = this.providerEl.value;

        if (provider === 'claude-code') {
            this.apiKeyGroup.style.display = 'none';
            this.claudeCodeGroup.style.display = 'block';
            this.watchBtn.style.display = 'inline-block';
            this.fetchBtn.textContent = 'Update Meter';
        } else if (provider === 'demo') {
            this.apiKeyGroup.style.display = 'none';
            this.claudeCodeGroup.style.display = 'none';
            this.watchBtn.style.display = 'none';
            this.fetchBtn.textContent = 'Fetch Usage';
        } else {
            this.apiKeyGroup.style.display = 'block';
            this.claudeCodeGroup.style.display = 'none';
            this.watchBtn.style.display = 'none';
            this.fetchBtn.textContent = 'Fetch Usage';
        }
    }

    async checkUsageFile() {
        try {
            const response = await fetch('usage.json');
            if (response.ok) {
                const data = await response.json();
                if (data.tokens) {
                    this.tokenInput.value = data.tokens;
                    this.updateMeter(data.tokens, 'claude-code');
                }
            }
        } catch (e) {
            // No usage file found, that's fine
        }
    }

    async fetchUsage() {
        const provider = this.providerEl.value;
        const apiKey = this.apiKeyEl.value.trim();

        if (provider === 'claude-code') {
            // Use manual input
            const tokens = parseInt(this.tokenInput.value, 10);
            if (isNaN(tokens) || tokens < 0) {
                alert('Please enter a valid token count');
                return;
            }
            this.updateMeter(tokens, provider);
            return;
        }

        if (provider !== 'demo' && !apiKey) {
            alert('Please enter your API key');
            return;
        }

        this.fetchBtn.disabled = true;
        this.fetchBtn.textContent = 'Fetching...';

        try {
            let usageData;

            if (provider === 'anthropic') {
                usageData = await this.fetchAnthropicUsage(apiKey);
            } else if (provider === 'openai') {
                usageData = await this.fetchOpenAIUsage(apiKey);
            } else {
                usageData = this.generateDemoData();
            }

            this.updateMeter(usageData.tokens, provider);
        } catch (error) {
            console.error('Error fetching usage:', error);
            alert(`Error fetching usage: ${error.message}\n\nNote: Due to CORS restrictions, you may need to run this through a backend proxy.`);
        } finally {
            this.fetchBtn.disabled = false;
            this.fetchBtn.textContent = provider === 'claude-code' ? 'Update Meter' : 'Fetch Usage';
        }
    }

    async fetchAnthropicUsage(apiKey) {
        throw new Error(
            'Anthropic usage API requires server-side access. ' +
            'Try Claude Code CLI or Demo Mode.'
        );
    }

    async fetchOpenAIUsage(apiKey) {
        throw new Error(
            'OpenAI usage API requires server-side access. ' +
            'Try Demo Mode or set up a backend proxy.'
        );
    }

    generateDemoData() {
        const baseTokens = Math.floor(Math.random() * 300000) + 50000;
        return {
            tokens: baseTokens,
            inputTokens: Math.floor(baseTokens * 0.4),
            outputTokens: Math.floor(baseTokens * 0.6)
        };
    }

    toggleWatch() {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
            this.watchBtn.textContent = 'Watch File';
            this.watchBtn.classList.remove('watching');
        } else {
            this.watchBtn.textContent = 'Stop Watch';
            this.watchBtn.classList.add('watching');
            this.watchInterval = setInterval(() => this.checkUsageFile(), 2000);
        }
    }

    updateMeter(tokens, provider = 'demo') {
        this.currentTokens = tokens;

        // Calculate derived values
        const gallons = tokens / this.TOKENS_PER_GALLON;
        const energy = tokens * this.WH_PER_TOKEN;
        const costPer1M = this.PRICING[provider]?.avg || 7.50;
        const cost = (tokens / 1000000) * costPer1M;

        // Calculate full buckets and remainder
        const fullBuckets = Math.floor(gallons / this.MAX_GALLONS);
        const remainderGallons = gallons % this.MAX_GALLONS;
        const fillPercent = (remainderGallons / this.MAX_GALLONS) * 100;

        // Update water level with animation
        this.water.style.height = `${fillPercent}%`;

        // Remove overflow state (we now show mini buckets instead)
        this.bucket.classList.remove('overflow');

        // Render filled bucket icons
        this.renderFilledBuckets(fullBuckets);

        // Animate number updates
        this.animateValue(this.tokensEl, 0, tokens, 1000, (v) => v.toLocaleString());
        this.animateValue(this.energyEl, 0, energy, 1000, (v) => v.toFixed(2));
        this.animateValue(this.gallonsEl, 0, gallons, 1000, (v) => v.toFixed(2));
        this.animateValue(this.costEl, 0, cost, 1000, (v) => `$${v.toFixed(2)}`);
    }

    renderFilledBuckets(count) {
        // Clear existing
        this.filledBuckets.innerHTML = '';

        // Cap display at 20 mini buckets, show "+N more" for excess
        const displayCount = Math.min(count, 20);
        const excess = count - displayCount;

        for (let i = 0; i < displayCount; i++) {
            const miniBucket = document.createElement('div');
            miniBucket.className = 'mini-bucket';
            miniBucket.innerHTML = `
                <div class="mini-bucket-handle"></div>
                <div class="mini-bucket-water"></div>
            `;
            // Stagger animation
            miniBucket.style.animationDelay = `${i * 50}ms`;
            this.filledBuckets.appendChild(miniBucket);
        }

        // Update count text
        if (count > 0) {
            const totalTokens = count * this.MAX_GALLONS * this.TOKENS_PER_GALLON;
            if (excess > 0) {
                this.bucketCount.textContent = `${count} full buckets (+${excess} not shown)`;
            } else {
                this.bucketCount.textContent = `${count} full bucket${count > 1 ? 's' : ''} (${(totalTokens / 1000000).toFixed(1)}M tokens)`;
            }
        } else {
            this.bucketCount.textContent = '';
        }
    }

    animateValue(element, start, end, duration, formatter) {
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (end - start) * easeOut;

            element.textContent = formatter(current);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }

    runDemo() {
        this.demoBtn.disabled = true;
        this.demoBtn.textContent = 'Running...';

        // Reset first
        this.updateMeter(0);

        // Simulate gradual filling
        let currentTokens = 0;
        const targetTokens = Math.floor(Math.random() * 800000) + 200000;
        const steps = 20;
        const increment = targetTokens / steps;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            currentTokens = Math.min(currentTokens + increment, targetTokens);
            this.updateMeter(Math.floor(currentTokens), 'demo');

            if (step >= steps) {
                clearInterval(interval);
                this.demoBtn.disabled = false;
                this.demoBtn.textContent = 'Run Demo';
            }
        }, 100);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.meter = new TokenWaterMeter();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenWaterMeter;
}
