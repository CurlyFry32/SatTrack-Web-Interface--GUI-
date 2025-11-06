const API_BASE = "http://192.168.4.1/api";

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".control-btn");
  const azSlider = document.getElementById("azSlider");
  const elSlider = document.getElementById("elSlider");
  const azValue = document.getElementById("azValue");
  const elValue = document.getElementById("elValue");
  const statusDisplay = document.getElementById("statusDisplay");
  const homeBtn = document.getElementById("homeBtn");
  const syncBtn = document.getElementById("syncBtn");

  let holdInterval = null;

  // Hold-to-move behavior
  buttons.forEach((btn) => {
    const dir = btn.dataset.dir;

    btn.addEventListener("mousedown", () => startMove(dir));
    btn.addEventListener("touchstart", () => startMove(dir));

    btn.addEventListener("mouseup", stopMove);
    btn.addEventListener("mouseleave", stopMove);
    btn.addEventListener("touchend", stopMove);
    btn.addEventListener("touchcancel", stopMove);
  });

  azSlider.addEventListener("input", () => {
    azValue.textContent = `${azSlider.value}°`;
  });

  azSlider.addEventListener("change", () => {
    sendPosition("azimuth", azSlider.value);
  });

  elSlider.addEventListener("input", () => {
    elValue.textContent = `${elSlider.value}°`;
  });

  elSlider.addEventListener("change", () => {
    sendPosition("elevation", elSlider.value);
  });

  homeBtn.addEventListener("click", () => sendMotorCommand("home"));
  syncBtn.addEventListener("click", syncPosition);

  updateStatus();
  setInterval(updateStatus, 5000);

  async function startMove(direction) {
    await sendMotorCommand(direction);

    // repeat every 300ms while held
    if (holdInterval) clearInterval(holdInterval);
    holdInterval = setInterval(() => sendMotorCommand(direction), 300);
  }

  async function stopMove() {
    if (holdInterval) {
      clearInterval(holdInterval);
      holdInterval = null;
    }
    await sendMotorCommand("stop");
  }

  async function sendMotorCommand(direction) {
    try {
      const res = await fetch(`${API_BASE}/motors/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      statusDisplay.textContent = `Command: ${direction.toUpperCase()} — ${data.status}`;
    } catch (err) {
      statusDisplay.textContent = "Error sending motor command.";
    }
  }

  async function sendPosition(axis, value) {
    try {
      const res = await fetch(`${API_BASE}/motors/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [axis]: parseFloat(value) }),
      });
      const data = await res.json();
      statusDisplay.textContent = `Set ${axis} to ${value}° — ${data.status}`;
    } catch (err) {
      statusDisplay.textContent = `Error setting ${axis}.`;
    }
  }

  async function syncPosition() {
    try {
      const res = await fetch(`${API_BASE}/motors/sync`);
      const data = await res.json();
      statusDisplay.textContent = `Synced — AZ: ${data.azimuth}°, EL: ${data.elevation}°`;
      azSlider.value = data.azimuth;
      elSlider.value = data.elevation;
      azValue.textContent = `${data.azimuth}°`;
      elValue.textContent = `${data.elevation}°`;
    } catch {
      statusDisplay.textContent = "Sync failed.";
    }
  }

  async function updateStatus() {
    try {
      const res = await fetch(`${API_BASE}/motors/status`);
      const data = await res.json();
      statusDisplay.textContent = `Status: ${data.state} (AZ: ${data.azimuth}°, EL: ${data.elevation}°)`;
    } catch {
      statusDisplay.textContent = "Status: Offline";
    }
  }
});
