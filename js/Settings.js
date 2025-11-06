// js/darkmode.js (now includes settings handling)
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('flexSwitchDarkMode');
    const darkModeToggle2 = document.getElementById('flexSwitchDarkModes');
    const tleFrequency = document.getElementById('tleFrequency');
    const tleSource = document.getElementById('tleSource');
    const tleCustomURL = document.getElementById('tleCustomURL');
    const factoryResetBtn = document.getElementById('factoryResetBtn');
    const body = document.body;
    const html = document.documentElement;

    /* =======================
       DARK MODE
    ======================= */
    const darkEnabled = localStorage.getItem('darkMode') === 'enabled';
    if (darkEnabled) {
        enableDarkMode();
        if (darkModeToggle) darkModeToggle.checked = true;
        if (darkModeToggle2) darkModeToggle2.checked = true;
    } else {
        disableDarkMode();
    }

    function enableDarkMode() {
        body.classList.add('dark-mode');
        html.setAttribute('data-bs-theme', 'dark');
        localStorage.setItem('darkMode', 'enabled');
    }

    function disableDarkMode() {
        body.classList.remove('dark-mode');
        html.setAttribute('data-bs-theme', 'light');
        localStorage.setItem('darkMode', 'disabled');
    }

    function toggleDarkMode(enabled) {
        if (enabled) enableDarkMode();
        else disableDarkMode();
        if (darkModeToggle) darkModeToggle.checked = enabled;
        if (darkModeToggle2) darkModeToggle2.checked = enabled;
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => toggleDarkMode(darkModeToggle.checked));
    }
    if (darkModeToggle2) {
        darkModeToggle2.addEventListener('change', () => toggleDarkMode(darkModeToggle2.checked));
    }

    /* =======================
       SOFTWARE SETTINGS
    ======================= */

    // Load saved settings
    const savedFrequency = localStorage.getItem('tleFrequency') || 'daily';
    const savedSource = localStorage.getItem('tleSource') || 'celestrak';
    const savedCustomURL = localStorage.getItem('tleCustomURL') || '';

    if (tleFrequency) tleFrequency.value = savedFrequency;
    if (tleSource) tleSource.value = savedSource;
    if (tleCustomURL) {
        tleCustomURL.value = savedCustomURL;
        tleCustomURL.style.display = savedSource === 'custom' ? 'block' : 'none';
    }

    // Handle TLE frequency change
    if (tleFrequency) {
        tleFrequency.addEventListener('change', () => {
            localStorage.setItem('tleFrequency', tleFrequency.value);
        });
    }

    // Handle TLE source change
    if (tleSource) {
        tleSource.addEventListener('change', () => {
            localStorage.setItem('tleSource', tleSource.value);
            tleCustomURL.style.display = tleSource.value === 'custom' ? 'block' : 'none';
        });
    }

    // Handle custom URL change
    if (tleCustomURL) {
        tleCustomURL.addEventListener('input', () => {
            localStorage.setItem('tleCustomURL', tleCustomURL.value);
        });
    }

    // Factory Reset
    if (factoryResetBtn) {
        factoryResetBtn.addEventListener('click', () => {
            if (confirm('⚠️ Are you sure you want to restore default configuration?')) {
                localStorage.clear();
                alert('Settings restored to default. Reloading...');
                location.reload();
            }
        });
    }
});
