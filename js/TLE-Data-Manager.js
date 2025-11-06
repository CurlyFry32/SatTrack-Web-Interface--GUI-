// ====== CONFIG ======
const LOCAL_API_BASE = "http://192.168.4.1/api/tles"; // Your ESP32 endpoint
let updateTimer = null;

// ====== DOM ELEMENTS ======
const tleForm = document.getElementById("tleForm");
const tleTableBody = document.getElementById("tleTableBody");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("form-title");
const saveBtn = document.getElementById("saveBtn");

let editId = null;

// ====== SETTINGS INTEGRATION ======
function getTLESettings() {
  const frequency = localStorage.getItem("tleFrequency") || "daily";
  const source = localStorage.getItem("tleSource") || "celestrak";
  const customURL = localStorage.getItem("tleCustomURL") || "";

  let updateIntervalMs;
  switch (frequency) {
    case "hourly":
      updateIntervalMs = 60 * 60 * 1000;
      break;
    case "6h":
      updateIntervalMs = 6 * 60 * 60 * 1000;
      break;
    case "manual":
      updateIntervalMs = null;
      break;
    case "daily":
    default:
      updateIntervalMs = 24 * 60 * 60 * 1000;
      break;
  }

  let sourceURL;
  if (source === "celestrak") {
    sourceURL = "https://celestrak.org/NORAD/elements/active.txt";
  } else if (source === "space-track") {
    sourceURL = "https://www.space-track.org/";
  } else if (source === "custom" && customURL.trim() !== "") {
    sourceURL = customURL.trim();
  } else {
    sourceURL = "https://celestrak.org/NORAD/elements/active.txt";
  }

  return { frequency, source, customURL, updateIntervalMs, sourceURL };
}

// ====== ESP32 CRUD LOGIC ======
async function loadTLEs() {
  try {
    const res = await fetch(LOCAL_API_BASE);
    const data = await res.json();
    renderTable(data);
    return data;
  } catch (err) {
    console.error(err);
    tleTableBody.innerHTML = `
      <tr><td colspan="4" class="text-danger text-center">
      Error connecting to ESP32 
      </td></tr>`;
    return [];
  }
}

function renderTable(data) {
  tleTableBody.innerHTML = "";
  if (!data.length) {
    tleTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center text-muted">No TLEs saved</td></tr>`;
    return;
  }

  data.forEach((tle) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tle.name}</td>
      <td><pre>${tle.tleData}</pre></td>
      <td>${tle.lastUpdated || "—"}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1" onclick="editTLE('${tle.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteTLE('${tle.id}')">Delete</button>
      </td>`;
    tleTableBody.appendChild(row);
  });
}

async function saveTLE(tle, id = null) {
  const method = id ? "PUT" : "POST";
  const url = id ? `${LOCAL_API_BASE}/${id}` : LOCAL_API_BASE;

  try {
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tle),
    });
  } catch (err) {
    console.error("Error saving TLE:", err);
  }
}

async function deleteTLE(id) {
  if (!confirm("Delete this TLE?")) return;
  try {
    await fetch(`${LOCAL_API_BASE}/${id}`, { method: "DELETE" });
    await loadTLEs();
  } catch (err) {
    alert("Error deleting TLE.");
  }
}

async function editTLE(id) {
  const res = await fetch(`${LOCAL_API_BASE}/${id}`);
  const tle = await res.json();

  document.getElementById("tleName").value = tle.name;
  document.getElementById("tleData").value = tle.tleData;
  document.getElementById("tleDescription").value = tle.description || "";

  editId = id;
  formTitle.innerText = "Edit TLE";
  saveBtn.innerText = "Update TLE";
  cancelEditBtn.classList.remove("d-none");
}

cancelEditBtn.addEventListener("click", () => {
  editId = null;
  tleForm.reset();
  formTitle.innerText = "Add New TLE";
  saveBtn.innerText = "Save TLE";
  cancelEditBtn.classList.add("d-none");
});

tleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tle = {
    name: document.getElementById("tleName").value.trim(),
    tleData: document.getElementById("tleData").value.trim(),
    description: document.getElementById("tleDescription").value.trim(),
    lastUpdated: new Date().toLocaleString(),
  };
  await saveTLE(tle, editId);
  tleForm.reset();
  cancelEditBtn.click();
  await loadTLEs();
});

// ====== AUTO-UPDATE LOGIC ======
async function fetchRemoteTLEs() {
  const { sourceURL } = getTLESettings();
  try {
    const res = await fetch(sourceURL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const lines = text.trim().split(/\r?\n/);
    const tleMap = new Map();

    for (let i = 0; i < lines.length; i += 3) {
      const name = lines[i]?.trim();
      const line1 = lines[i + 1]?.trim();
      const line2 = lines[i + 2]?.trim();
      if (name && line1 && line2) {
        tleMap.set(name.toLowerCase(), `${line1}\n${line2}`);
      }
    }
    return tleMap;
  } catch (err) {
    console.error("Failed to fetch remote TLEs:", err);
    return new Map();
  }
}

async function updateExistingTLEs() {
  const existing = await loadTLEs();
  if (!existing.length) return;

  const remoteTLEs = await fetchRemoteTLEs();
  let updatedCount = 0;

  for (const sat of existing) {
    const remoteData = remoteTLEs.get(sat.name.toLowerCase());
    if (remoteData && remoteData !== sat.tleData) {
      const updatedTLE = {
        ...sat,
        tleData: remoteData,
        lastUpdated: new Date().toLocaleString(),
      };
      await saveTLE(updatedTLE, sat.id);
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`✅ Updated ${updatedCount} TLE(s) from remote source`);
    await loadTLEs();
  } else {
    console.log("No TLEs needed updating.");
  }
}

function initTLEManager() {
  const settings = getTLESettings();
  console.log("TLE Manager initialized with:", settings);
  loadTLEs();

  if (updateTimer) clearInterval(updateTimer);

  if (settings.updateIntervalMs) {
    updateExistingTLEs(); // initial sync
    updateTimer = setInterval(updateExistingTLEs, settings.updateIntervalMs);
  } else {
    console.log("Auto-update disabled (manual mode).");
  }
}

window.addEventListener("storage", (event) => {
  if (["tleFrequency", "tleSource", "tleCustomURL"].includes(event.key)) {
    console.log("Settings changed; reinitializing TLE manager...");
    initTLEManager();
  }
});

document.addEventListener("DOMContentLoaded", initTLEManager);
