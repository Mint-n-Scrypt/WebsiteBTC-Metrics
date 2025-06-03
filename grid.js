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

    async function loadMayerMultiple() {
        const element = document.getElementById('mayer-multiple');
        const cacheKey = 'mayerMultiple';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `Mayer Multiple: ${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            element.style.background = cached.value < 0.8 ? '#28a745' : cached.value < 1.3 ? '#90ee90' : cached.value < 2.4 ? '#f9f9f9' : cached.value < 3.0 ? '#f08080' : '#dc143c';
            return;
        }
        try {
            const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=200&interval=daily');
            const prices = data.prices.map(item => item[1]);
            const currentPrice = prices[prices.length - 1];
            const ma200 = prices.slice(-200).reduce((sum, price) => sum + price, 0) / 200;
            const mayerMultiple = currentPrice / ma200;
            const result = { value: mayerMultiple };
            setCachedData(cacheKey, result);
            element.innerText = `Mayer Multiple: ${mayerMultiple.toFixed(2)}`;
            element.style.background = mayerMultiple < 0.8 ? '#28a745' : mayerMultiple < 1.3 ? '#90ee90' : mayerMultiple < 2.4 ? '#fff3cd' : mayerMultiple < 3.0 ? '#f08080' : '#dc143c';
        } catch (error) {
            console.error('Mayer Multiple error:', error.message);
            element.innerText = cached ? `Mayer Multiple: ${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'Mayer Multiple: Data unavailable';
            element.style.background = cached ? (cached.value < 0.8 ? '#28a745' : cached.value < 1.3 ? '#90ee90' : cached.value < 2.4 ? '#fff3cd' : cached.value < 3.0 ? '#f08080' : '#dc143c') : '#f9f9f9';
        }
    }

    async function loadMvrvRatio() {
        const element = document.getElementById('mvrv-ratio');
        const cacheKey = 'mvrvRatio';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `MVRV Ratio: ${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            element.style.background = cached.value < 0.8 ? '#28a745' : cached.value < 1.2 ? '#90ee90' : cached.value < 2.0 ? '#fff3cd' : cached.value < 3.0 ? '#f08080' : '#dc143c';
            return;
        }
        try {
            const cgData = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin?market_data=true');
            const marketCap = cgData.market_data.market_cap.usd;
            let realizedCap = marketCap * 0.8;
            try {
                const cmData = await fetchData('https://api.coinmetrics.io/v4/timeseries/market-metrics?assets=btc&metrics=CapRealUSD');
                realizedCap = parseFloat(cmData.data[cmData.data.length - 1].CapRealUSD);
            } catch (e) {
                console.warn('Coinmetrics failed for MVRV, using fallback');
            }
            const mvrvRatio = marketCap / realizedCap;
            const result = { value: mvrvRatio };
            setCachedData(cacheKey, result);
            element.innerText = `MVRV Ratio: ${mvrvRatio.toFixed(2)}`;
            element.style.background = mvrvRatio < 0.8 ? '#28a745' : mvrvRatio < 1.2 ? '#90ee90' : mvrvRatio < 2.0 ? '#fff3cd' : mvrvRatio < 3.0 ? '#f08080' : '#dc143c';
        } catch (error) {
            console.error('MVRV Ratio error:', error.message);
            element.innerText = cached ? `MVRV Ratio: ${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'MVRV Ratio: Data unavailable';
            element.style.background = cached ? (cached.value < 0.8 ? '#28a745' : cached.value < 1.2 ? '#90ee90' : cached.value < 2.0 ? '#fff3cd' : cached.value < 3.0 ? '#f08080' : '#dc143c') : '#f9f9f9';
        }
    }

    async function loadPuellMultiple() {
        const element = document.getElementById('puell-multiple');
        const cacheKey = 'puellMultiple';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `Puell Multiple: ${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            element.style.background = cached.value < 0.3 ? '#28a745' : cached.value < 0.5 ? '#90ee90' : cached.value < 1.5 ? '#fff3cd' : cached.value < 3.0 ? '#f08080' : '#dc143c';
            return;
        }
        try {
            const cgData = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily');
            const prices = cgData.prices.map(item => item[1]);
            const currentPrice = prices[prices.length - 1];
            const blockReward = 3.125;
            const blocksPerDay = 144;
            const dailyIssuance = blockReward * blocksPerDay * currentPrice;
            const issuanceValues = prices.map(price => blockReward * blocksPerDay * price);
            const ma365 = issuanceValues.slice(-365).reduce((sum, val) => sum + val, 0) / 365;
            const puellMultiple = dailyIssuance / ma365;
            const result = { value: puellMultiple };
            setCachedData(cacheKey, result);
            element.innerText = `Puell Multiple: ${puellMultiple.toFixed(2)}`;
            element.style.background = puellMultiple < 0.3 ? '#28a745' : puellMultiple < 0.5 ? '#90ee90' : puellMultiple < 1.5 ? '#fff3cd' : puellMultiple < 3.0 ? '#f08080' : '#dc143c';
        } catch (error) {
            console.error('Puell Multiple error:', error.message);
            element.innerText = cached ? `Puell Multiple: ${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'Puell Multiple: Data unavailable';
            element.style.background = cached ? (cached.value < 0.3 ? '#28a745' : cached.value < 0.5 ? '#90ee90' : cached.value < 1.5 ? '#fff3cd' : cached.value < 3.0 ? '#f08080' : '#dc143c') : '#f9f9f9';
        }
    }

    async function loadNupl() {
        const element = document.getElementById('nupl');
        const cacheKey = 'nupl';
        const cached = getCachedData(cacheKey);
        if (cached) {
            const timestamp = localStorage.getItem(cacheKey + '_timestamp');
            element.innerText = `NUPL: ${cached.value.toFixed(2)} (Last updated: ${formatTimestamp(timestamp)})`;
            element.style.background = cached.value < -0.4 ? '#28a745' : cached.value < -0.2 ? '#90ee90' : cached.value < 0.5 ? '#fff3cd' : cached.value < 0.75 ? '#f08080' : '#dc143c';
            return;
        }
        try {
            const cgData = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin?market_data=true');
            const marketCap = cgData.market_data.market_cap.usd;
            let realizedCap = marketCap * 0.8;
            try {
                const cmData = await fetchData('https://api.coinmetrics.io/v4/timeseries/market-metrics?assets=btc&metrics=CapRealUSD');
                realizedCap = parseFloat(cmData.data[cmData.data.length - 1].CapRealUSD);
            } catch (e) {
                console.warn('Coinmetrics failed for NUPL, using fallback');
            }
            const nupl = (marketCap - realizedCap) / marketCap;
            const result = { value: nupl };
            setCachedData(cacheKey, result);
            element.innerText = `NUPL: ${nupl.toFixed(2)}`;
            element.style.background = nupl < -0.4 ? '#28a745' : nupl < -0.2 ? '#90ee90' : nupl < 0.5 ? '#fff3cd' : nupl < 0.75 ? '#f08080' : '#dc143c';
        } catch (error) {
            console.error('NUPL error:', error.message);
            element.innerText = cached ? `NUPL: ${cached.value.toFixed(2)} (Data unavailable, Last updated: ${formatTimestamp(localStorage.getItem(cacheKey + '_timestamp'))})` : 'NUPL: Data unavailable';
            element.style.background = cached ? (cached.value < -0.4 ? '#28a745' : cached.value < -0.2 ? '#90ee90' : cached.value < 0.5 ? '#fff3cd' : cached.value < 0.75 ? '#f08080' : '#dc143c') : '#f9f9f9';
        }
    }

    Promise.all([
        loadMayerMultiple(),
        loadMvrvRatio(),
        loadPuellMultiple(),
        loadNupl()
    ]).catch(error => {
        console.error('Error loading grid metrics:', error.message);
    });
});
