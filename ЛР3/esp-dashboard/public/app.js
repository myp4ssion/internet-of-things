// public/app.js
const $ = (id) => document.getElementById(id);

async function fetchLatest() {
  try {
    const res = await fetch("/api/latest");
    const json = await res.json();
    if (!json.ok) return;
    const latest = json.latest;
    if (!latest) {
      $("temp-value").innerText = "—";
      $("humi-value").innerText = "—";
      $("light-value").innerText = "—";
      $("last-ts").innerText = "Нет данных";
      return;
    }

    $("temp-value").innerText = isFinite(latest.temp)
      ? latest.temp
      : latest.raw?.valueA ?? "—";
    $("humi-value").innerText = isFinite(latest.humi)
      ? latest.humi
      : latest.raw?.valueB ?? "—";
    $("light-value").innerText = isFinite(latest.light)
      ? latest.light
      : latest.raw?.valueC ?? "—";
    $("last-ts").innerText = new Date(latest.ts).toLocaleString();
  } catch (err) {
    console.error(err);
  }
}

async function fetchHistory() {
  try {
    const res = await fetch("/api/history?limit=40");
    const json = await res.json();
    if (!json.ok) return;
    const items = json.items || [];
    const body = $("history-body");
    body.innerHTML = "";
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${new Date(it.ts).toLocaleString()}</td>
                      <td>${
                        isFinite(it.temp) ? it.temp : it.raw?.valueA ?? ""
                      }</td>
                      <td>${
                        isFinite(it.humi) ? it.humi : it.raw?.valueB ?? ""
                      }</td>
                      <td>${
                        isFinite(it.light) ? it.light : it.raw?.valueC ?? ""
                      }</td>`;
      body.appendChild(tr);
    }
  } catch (err) {
    console.error(err);
  }
}

// initial
fetchLatest();
fetchHistory();

// auto-refresh every 10s
setInterval(() => {
  fetchLatest();
  fetchHistory();
}, 10000);

$("btn-refresh").addEventListener("click", () => {
  fetchLatest();
  fetchHistory();
});
