document.addEventListener('DOMContentLoaded', () => {
    const btcPriceElement = document.getElementById('btc-price-usd');
    const realizedPriceElement = document.getElementById('realized-price-usd');
    const mcvRatioElement = document.getElementById('mcv-ratio');

    btcPriceElement.innerText = 'Test: Bitcoin Price Loaded';
    realizedPriceElement.innerText = 'Test: Realized Price Loaded';
    mcvRatioElement.innerText = 'Test: MCV Ratio Loaded';
});
});
