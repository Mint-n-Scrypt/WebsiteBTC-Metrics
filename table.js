document.addEventListener('DOMContentLoaded', async () => {
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
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 5000); // 5-second timeout
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                if (response.status === 429) {
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

    async function loadBitcoinPrice() {
        const element = document.getElementById('btc-price-usd');
        if (!element) return;
        const cacheKey = 'btcPriceUsd';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `$${cached.price.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            element.style.background = cached.change > 0.1 ? '#28a745' : cached.change < -0.1 ? '#dc143c' : '#cccccc';
            return;
        }
        try {
            const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin?market_data=true');
            const price = data.market_data.current_price.usd;
            const change = data.market_data.price_change_percentage_24h;
            const result = { price, change };
            setCachedData(cacheKey, result);
            element.innerText = `$${price.toFixed(2)}`;
            element.style.background = change > 0.1 ? '#28a745' : change < -0.1 ? '#dc143c' : '#cccccc';
        } catch (error) {
            element.innerText = cached ? `$${cached.price.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'Bitcoin Price: Data unavailable';
            element.style.background = cached ? (cached.change > 0.1 ? '#28a745' : cached.change < -0.1 ? '#dc143c' : '#cccccc') : '#f9f9f9';
        }
    }

    async function loadAllTimeHigh() {
        const element = document.getElementById('ath-price-usd');
        if (!element) return;
        element.innerText = 'Loading ATH...';
        const cacheKey = 'athPriceUsd';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `$${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            return;
        }
        try {
            const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin?market_data=true');
            if (!data.market_data || !data.market_data.ath || !data.market_data.ath.usd) {
                throw new Error('Invalid API response');
            }
            const athPrice = data.market_data.ath.usd;
            const result = { value: athPrice };
            setCachedData(cacheKey, result);
            element.innerText = `$${athPrice.toFixed(2)}`;
        } catch (error) {
            try {
                const cmData = await fetchData('https://api.coinmetrics.io/v4/timeseries/market-metrics?assets=btc&metrics=PriceUSD');
                if (!cmData.data || !Array.isArray(cmData.data)) {
                    throw new Error('Invalid response');
                }
                const prices = cmData.data.map(item => parseFloat(item.PriceUSD)).filter(price => !isNaN(price));
                if (prices.length === 0) {
                    throw new Error('No valid data');
                }
                const athPrice = Math.max(...prices);
                const result = { value: athPrice };
                setCachedData(cacheKey, result);
                element.innerText = `$${athPrice.toFixed(2)} (Estimated from Coin Metrics)`;
            } catch (cmError) {
                element.innerText = cached ? `$${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'ATH Price: Data unavailable';
            }
        }
    }

    await loadBitcoinPrice();
    await loadAllTimeHigh();
});
