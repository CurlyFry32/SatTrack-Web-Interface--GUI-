// === Map Initialization ===
const map = L.map("map", {
  worldCopyJump: false,
  zoomSnap: 0.5,
  minZoom: 1,
  maxZoom: 6
}).setView([0, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 6,
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

const satObjects = {};

// === Default fallback TLE (NOAA 15) ===
const fallbackTLE = {
  name: "NOAA 15",
  tle1: "1 25338U 98030A   24310.53793981  .00000102  00000+0  83458-4 0  9997",
  tle2: "2 25338  98.6737 327.2941 0010455  98.9853 261.2683 14.25955749216571"
};

// === Load TLEs from ESP-32 (or fallback) ===
async function loadTLEs() {
  try {
    const response = await fetch("/api/tles"); // ESP endpoint
    if (!response.ok) throw new Error("ESP connection failed");
    const tleData = await response.json();

    if (!tleData || tleData.length === 0) {
      console.warn("No TLEs found on ESP — using NOAA 15 fallback");
      addSatellite(fallbackTLE);
    } else {
      tleData.forEach((sat) => addSatellite(sat));
    }
  } catch (err) {
    console.warn("ESP fetch error:", err);
    console.warn("Falling back to NOAA 15 default TLE.");
    addSatellite(fallbackTLE);
  }
}

// === Add Satellite to Map ===
function addSatellite(tle) {
  const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);
  const marker = L.marker([0, 0]).addTo(map).bindPopup(tle.name);
  const trail = L.polyline([], { color: "#ff6600", weight: 1.5 }).addTo(map);
  satObjects[tle.name] = { satrec, marker, trail };
  updateSatellites();
}

// === Time Control and Display ===
// === Time Control and Display (Seconds-based) ===
const timeLabel = document.getElementById("timeLabel");
const timeButtons = document.querySelectorAll(".time-btn");

let offsetSeconds = 0;

function updateClock() {
  const displayed = new Date(Date.now() + offsetSeconds * 1000);
  timeLabel.textContent = "Time: " + displayed.toUTCString();
}

timeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    offsetSeconds = parseInt(btn.dataset.offset);
    updateClock();
    updateSatellites();

    // highlight active button
    timeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// initialize time display
updateClock();


// === Satellite Propagation ===
function normalizeLon(lon) {
  return ((lon + 540) % 360) - 180;
}

function updateSatellites() {
  const now = new Date(Date.now() + offsetSeconds * 10000);
  Object.values(satObjects).forEach(({ marker, satrec, trail }) => {
    const pv = satellite.propagate(satrec, now);
    if (!pv.position) return;
    const gmst = satellite.gstime(now);
    const gd = satellite.eciToGeodetic(pv.position, gmst);
    const lat = satellite.degreesLat(gd.latitude);
    const lon = normalizeLon(satellite.degreesLong(gd.longitude));

    if (!isNaN(lat) && !isNaN(lon)) marker.setLatLng([lat, lon]);
    
const rawPoints = [];
const stepSeconds = 60; // one-minute propagation steps

 // compute every 30 seconds for finer detail
for (let i = 0; i <= 7200; i += stepSeconds){  // 2 hours forward
      const t = new Date(now.getTime() + i * 1000);
      const pred = satellite.propagate(satrec, t);
      if (!pred.position) continue;
      const gmstF = satellite.gstime(t);
      const gdF = satellite.eciToGeodetic(pred.position, gmstF);
      const la = satellite.degreesLat(gdF.latitude);
      const lo = normalizeLon(satellite.degreesLong(gdF.longitude));
      if (!isNaN(la) && !isNaN(lo)) rawPoints.push([la, lo]);
    }

    // --- handle dateline crossing ---
    const segments = [];
    let segment = [];
    let prevLon = null;
    for (const [la, lo] of rawPoints) {
      if (prevLon !== null && Math.abs(lo - prevLon) > 180) {//If jump of more than 180 degrees remove segment
        segments.push(segment);
        segment = [];
      }
      segment.push([la, lo]);
      prevLon = lo;
    }
    if (segment.length > 0) segments.push(segment);

    // --- smooth each segment using Catmull–Rom interpolation ---
    function catmullRomSpline(points, resolution = 10) {
      if (points.length < 4) return points;
      const smoothed = [];
      for (let i = 0; i < points.length - 3; i++) {
        const [p0, p1, p2, p3] = points.slice(i, i + 4);
        for (let t = 0; t <= 1; t += 1 / resolution) {
          const t2 = t * t;
          const t3 = t2 * t;
          const lat =
            0.5 *
            (2 * p1[0] +
              (-p0[0] + p2[0]) * t +
              (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
              (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
          const lon =
            0.5 *
            (2 * p1[1] +
              (-p0[1] + p2[1]) * t +
              (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
              (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
          smoothed.push([lat, lon]);
        }
      }
      return smoothed;
    }

    const smoothedSegments = segments.map((seg) => (seg.length >= 4 ? catmullRomSpline(seg, 8) : seg));

    trail.setLatLngs(smoothedSegments);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") offsetSeconds -= 60;  // -1 minute
  if (e.key === "ArrowRight") offsetSeconds += 60; // +1 minute
  updateClock();
  updateSatellites();
});

// Live time update every second
setInterval(() => {
  updateClock();
  updateSatellites();
}, 1000);

// Start everything
loadTLEs();
updateClock();
