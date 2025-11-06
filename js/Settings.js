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
});// ----- View Logs -----
async function viewLogs() {
  try {
    const res = await fetch(`${ESP_API}/logs`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const logs = await res.text();

    // Show logs in a simple modal
    const modal = document.createElement("div");
    modal.className = "modal fade show";
    modal.style.display = "block";
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header">
            <h5 class="modal-title">System Logs</h5>
            <button type="button" class="btn-close btn-close-white" onclick="this.closest('.modal').remove()"></button>
          </div>
          <div class="modal-body">
            <pre style="max-height:60vh; overflow:auto;">${logs}</pre>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch (err) {
    alert("Error loading logs: " + err.message);
  }
}

// ----- Export Logs -----
async function exportLogs() {
  try {
    const res = await fetch(`${ESP_API}/logs`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const logs = await res.text();

    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SatTrack_Logs_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Failed to export logs: " + err.message);
  }
}  
// ====== Firmware Update Checker ======
const GITHUB_FIRMWARE_URL =
  "https://raw.githubusercontent.com/CurlyFry32/SatTrack-Web-Interface--Firmware-/refs/heads/main/firmware.json";
const ESP_API_BASE = "http://192.168.4.1/api";
const FIRMWARE_CHECK_KEY = "lastFirmwareCheck";

document.addEventListener("DOMContentLoaded", () => {
  autoCheckFirmwareIfDue();
});

async function checkFirmwareUpdate(silent = false) {
  const checkBtn = document.getElementById("checkFirmwareBtn");
  if (checkBtn && !silent) checkBtn.disabled = true;

  try {
    // 1️⃣ Get local ESP version
    const localRes = await fetch(`${ESP_API_BASE}/version`);
    if (!localRes.ok) throw new Error(`ESP responded ${localRes.status}`);
    const local = await localRes.json();

    // 2️⃣ Get GitHub latest info
    const remoteRes = await fetch(GITHUB_FIRMWARE_URL + `?t=${Date.now()}`);
    if (!remoteRes.ok) throw new Error(`GitHub responded ${remoteRes.status}`);
    const remote = await remoteRes.json();

    // 3️⃣ Compare versions
    if (compareVersions(remote.version, local.version) > 0) {
      const message = `🛰️ New firmware ${remote.version} is available!\n\nChanges:\n${remote.notes}\n\nDo you want to update now?`;

      if (silent) {
        // auto-check case: prompt subtly
        if (confirm(message)) await triggerFirmwareUpdate(remote.url);
      } else {
        // manual button case
        const confirmed = confirm(message);
        if (confirmed) await triggerFirmwareUpdate(remote.url);
      }
    } else if (!silent) {
      alert(`✅ Device is up to date (v${local.version})`);
    }

    localStorage.setItem(FIRMWARE_CHECK_KEY, new Date().toISOString());
  } catch (err) {
    if (!silent) alert("Firmware check failed: " + err.message);
    console.error("Firmware check failed:", err);
  } finally {
    if (checkBtn && !silent) checkBtn.disabled = false;
  }
}

function compareVersions(v1, v2) {
  const a = v1.split(".").map(Number);
  const b = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function triggerFirmwareUpdate(firmwareUrl) {
  try {
    const res = await fetch(`${ESP_API_BASE}/ota?url=${encodeURIComponent(firmwareUrl)}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`ESP responded ${res.status}`);
    alert("🚀 Firmware update started! The device will reboot automatically.");
  } catch (err) {
    alert("Failed to start OTA update: " + err.message);
  }
}

// ====== Auto Check Logic ======

function getUpdateFrequencyDays() {
  // Read from user setting dropdown (fallback to Weekly)
  const select = document.getElementById("firmwareFrequency");
  const value = select ? select.value : "weekly";

  switch (value.toLowerCase()) {
    case "daily": return 1;
    case "weekly": return 7;
    case "monthly": return 30;
    default: return 7;
  }
}

function autoCheckFirmwareIfDue() {
  const lastCheck = localStorage.getItem(FIRMWARE_CHECK_KEY);
  const daysBetween = getUpdateFrequencyDays();

  if (!lastCheck) {
    console.log("No prior firmware check — running initial check.");
    checkFirmwareUpdate(true);
    return;
  }

  const lastDate = new Date(lastCheck);
  const now = new Date();
  const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

  if (diffDays >= daysBetween) {
    console.log(`Firmware check due (${diffDays.toFixed(1)} days since last).`);
    checkFirmwareUpdate(true);
  } else {
    console.log(`Firmware check not due yet (${diffDays.toFixed(1)} days elapsed).`);
  }
}

