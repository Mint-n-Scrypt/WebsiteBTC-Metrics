document.addEventListener('DOMContentLoaded', () => {
    const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

    function getCachedData(key) {
        const data = localStorage.getItem(key);
        const timestamp = localStorage.getItem(key + '_timestamp');
        if (data && timestamp && Date.now() - parseInt(timestamp) < CACHE_DURATION) {
            return JSON.parse(data);
        }
        return null;
    }

    function setCachedData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem(key + '_timestamp', Date.now());
    }

    function formatTimestamp(timestamp) {
        return new Date(parseInt(timestamp)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`Throttling detected for ${url}, retrying once...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const retryResponse = await fetch(url);
                    if (!retryResponse.ok) throw new Error(`HTTP ${retryResponse.status}`);
                    return await retryResponse.json();
                }
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    function applyColor(element, value, metricType) {
        let color;
        if (metricType === 'rsi') {
            if (value <= 30) color = '#28a745'; // Dark Green (very oversold)
            else if (value <= 40) color = '#90ee90'; // Light Green (oversold)
            else if (value <= 60) color = '#fff3cd'; // Neutral
            else if (value <= 70) color = '#f08080'; // Light Red (overbought)
            else color = '#dc143c'; // Dark Red (very overbought)
        } else if (metricType === 'sharpe') {
            if (value < -1) color = '#28a745'; // Dark Green (very poor)
            else if (value <= 0) color = '#90ee90'; // Light Green (poor)
            else if (value <= 1) color = '#fff3cd'; // Neutral
            else if (value <= 2) color = '#f08080'; // Light Red (good)
            else color = '#dc143c'; // Dark Red (excellent)
        }
        element.style.backgroundColor = color;
        element.style.color = '#000000'; // Black text for contrast
    }

    async function loadSharpeRatio() {
        const element = document.getElementById('sharpe-ratio');
        const cacheKey = 'sharpeRatio';
        const cached = getCachedData(cacheKey);

        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `Sharpe Ratio: ${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            applyColor(element, cached.value, 'sharpe');
            return;
        }

        try {
            const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=364&interval=daily');
            const pricesWithTimestamps = data.prices; // Array of [timestamp, price]
            const weeklyPrices = [];
            let lastTimestamp = pricesWithTimestamps[0][0];
            weeklyPrices.push(pricesWithTimestamps[0][1]); // Start with the first price

            // Sample prices approximately every 7 days using timestamps
            for (let i = 1; i < pricesWithTimestamps.length; i++) {
                const currentTimestamp = pricesWithTimestamps[i][0];
                const daysDiff = (currentTimestamp - lastTimestamp) / (1000 * 60 * 60 * 24);
                if (daysDiff >= 7) {
                    weeklyPrices.push(pricesWithTimestamps[i][1]);
                    lastTimestamp = currentTimestamp;
                }
            }

            if (weeklyPrices.length < 52) throw new Error('Insufficient weekly data');
            const returns = [];
            for (let i = 1; i < weeklyPrices.length; i++) {
                returns.push((weeklyPrices[i] - weeklyPrices[i - 1]) / weeklyPrices[i - 1]);
            }
            const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1); // Use n-1 for sample variance
            const stdDev = Math.sqrt(variance);
            const riskFreeRate = 0.045 / 52; // 4.5% annual rate (approximate 2025 U.S. Treasury yield)
            const sharpeRatio = ((meanReturn - riskFreeRate) / stdDev) * Math.sqrt(52);
            const result = { value: sharpeRatio };
            setCachedData(cacheKey, result);
            element.innerText = `Sharpe Ratio: ${sharpeRatio.toFixed(2)}`;
            applyColor(element, sharpeRatio, 'sharpe');
        } catch (error) {
            console.error('Sharpe Ratio error:', error.message);
            element.innerText = cached ? `Sharpe Ratio: ${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'Sharpe Ratio: Data unavailable';
            element.style.backgroundColor = cached ? element.style.backgroundColor : '#f9f9f9';
            if (cached) applyColor(element, cached.value, 'sharpe');
        }
    }

    async function loadRsi() {
        const element = document.getElementById('rsi');
        const cacheKey = 'rsi';
        const cached = getCachedData(cacheKey);

        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `Weekly RSI: ${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            applyColor(element, cached.value, 'rsi');
            return;
        }

        try {
            const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=728&interval=daily'); // 2 years of data
            const pricesWithTimestamps = data.prices; // Array of [timestamp, price]
            const weeklyPrices = [];
            let lastTimestamp = pricesWithTimestamps[0][0];
            weeklyPrices.push(pricesWithTimestamps[0][1]); // Start with the first price

            // Sample prices approximately every 7 days using timestamps
            for (let i = 1; i < pricesWithTimestamps.length; i++) {
                const currentTimestamp = pricesWithTimestamps[i][0];
                const daysDiff = (currentTimestamp - lastTimestamp) / (1000 * 60 * 60 * 24);
                if (daysDiff >= 7) {
                    weeklyPrices.push(pricesWithTimestamps[i][1]);
                    lastTimestamp = currentTimestamp;
                }
            }

            if (weeklyPrices.length < 104) throw new Error('Insufficient weekly data for RSI'); // Expect ~104 weeks (2 years)
            const changes = [];
            for (let i = 1; i < weeklyPrices.length; i++) {
                changes.push(weeklyPrices[i] - weeklyPrices[i - 1]);
            }

            // Initial 14-period average for gains and losses
            let gains = 0, losses = 0;
            for (let i = changes.length - 14; i < changes.length; i++) {
                if (changes[i] > 0) {
                    gains += changes[i];
                } else if (changes[i] < 0) {
                    losses += Math.abs(changes[i]);
                }
            }
            let avgGain = gains / 14;
            let avgLoss = losses / 14;

            // Apply exponential smoothing for earlier periods
            for (let i = changes.length - 14 - 1; i >= 0; i--) {
                avgGain = (avgGain * 13 + (changes[i] > 0 ? changes[i] : 0)) / 14;
                avgLoss = (avgLoss * 13 + (changes[i] < 0 ? Math.abs(changes[i]) : 0)) / 14;
            }

            const rs = avgLoss === 0 ? avgGain / 0.0001 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            const result = { value: rsi };
            setCachedData(cacheKey, result);
            element.innerText = `Weekly RSI: ${rsi.toFixed(2)}`;
            applyColor(element, rsi, 'rsi');
        } catch (error) {
            console.error('Weekly RSI error:', error.message);
            element.innerText = cached ? `Weekly RSI: ${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'Weekly RSI: Data unavailable';
            element.style.backgroundColor = cached ? element.style.backgroundColor : '#f9f9f9';
            if (cached) applyColor(element, cached.value, 'rsi');
        }
    }

    Promise.all([
        loadSharpeRatio(),
        loadRsi()
    ]).catch(error => {
        console.error('Error loading additional metrics:', error.message);
    });
});
});
