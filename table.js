document.addEventListener('DOMContentLoaded', () => {
    const CACHE_DURATION = 14 * 24 * 60 * 60 * 1000;
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

    async function loadBitcoinPrice() {
        const element = document.getElementById('btc-price-usd');
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
            console.error('Bitcoin Price USD error:', error.message);
            element.innerText = cached ? `$${cached.price.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'Bitcoin Price: Data unavailable';
            element.style.background = cached ? (cached.change > 0.1 ? '#28a745' : cached.change < -0.1 ? '#dc143c' : '#cccccc') : '#f9f9f9';
        }
    }

    async function loadRealizedPrice() {
        const element = document.getElementById('realized-price-usd');
        const cacheKey = 'realizedPriceUsd';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `$${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            return;
        }
        try {
            const cmData = await fetchData('https://api.coinmetrics.io/v4/timeseries/market-metrics?assets=btc&metrics=CapRealUSD');
            const realizedCap = parseFloat(cmData.data[cmData.data.length - 1].CapRealUSD);
            const circulatingSupply = 19700000;
            const realizedPrice = realizedCap / circulatingSupply;
            const result = { value: realizedPrice };
            setCachedData(cacheKey, result);
            element.innerText = `$${realizedPrice.toFixed(2)}`;
        } catch (error) {
            console.error('Realized Price USD error:', error.message);
            try {
                const cgData = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin?market_data=true');
                const marketCap = cgData.market_data.market_cap.usd;
                const realizedPrice = (marketCap * 0.8) / 19700000;
                const result = { value: realizedPrice };
                setCachedData(cacheKey, result);
                element.innerText = `$${realizedPrice.toFixed(2)} (Estimated)`;
            } catch (e) {
                element.innerText = cached ? `$${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'Realized Price: Data unavailable';
            }
        }
    }

    async function loadMcvRatio() {
        const element = document.getElementById('mcv-ratio');
        const cacheKey = 'mcvRatio';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `${cached.value.toFixed(0)} (Last updated: ${formatTimestamp(timestamp)})`;
            return;
        }
        try {
            const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin?market_data=true');
            const marketCap = data.market_data.market_cap.usd;
            const volume24h = data.market_data.total_volume.usd;
            if (volume24h === 0) throw new Error('Zero trading volume');
            const mcvRatio = marketCap / volume24h;
            const result = { value: mcvRatio };
            setCachedData(cacheKey, result);
            element.innerText = mcvRatio.toFixed(0);
        } catch (error) {
            console.error('MCV Ratio error:', error.message);
            element.innerText = cached ? `${cached.value.toFixed(0)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'MCV Ratio: Data unavailable';
        }
    }

    Promise.all([
        loadBitcoinPrice(),
        loadRealizedPrice(),
        loadMcvRatio()
    ]).catch(error => {
        console.error('Error loading table metrics:', error.message);
    });
});
