const API_BASE = "http://192.168.4.1/api/tles"; // ← Change this to your ESP32 IP

const tleForm = document.getElementById("tleForm");
const tleTableBody = document.getElementById("tleTableBody");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("form-title");
const saveBtn = document.getElementById("saveBtn");

let editId = null;

// Load TLEs from ESP32
async function loadTLEs() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    console.error(err);
    tleTableBody.innerHTML = `
      <tr><td colspan="4" class="text-danger text-center">
      Error connecting to ESP32 
      </td></tr>`;
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

async function saveTLE(tle) {
  const method = editId ? "PUT" : "POST";
  const url = editId ? `${API_BASE}/${editId}` : API_BASE;

  try {
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tle),
    });
    await loadTLEs();
  } catch (err) {
    alert("Error saving TLE to ESP32.");
  }
}

async function deleteTLE(id) {
  if (!confirm("Delete this TLE?")) return;
  try {
    await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    await loadTLEs();
  } catch (err) {
    alert("Error deleting TLE.");
  }
}

async function editTLE(id) {
  const res = await fetch(`${API_BASE}/${id}`);
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
  await saveTLE(tle);
  tleForm.reset();
  cancelEditBtn.click();
});

loadTLEs();
