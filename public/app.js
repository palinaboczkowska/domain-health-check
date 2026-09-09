const form = document.getElementById("check-form");
const input = document.getElementById("domain-input");
const button = document.getElementById("check-button");
const status = document.getElementById("status");
const grid = document.getElementById("check-grid");

function setStatus(text, variant) {
  status.textContent = text;
  status.className = variant ?? "";
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.innerHTML = "";
  const label = document.createElement("span");
  label.className = "button-label";
  if (isLoading) {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    label.textContent = "Checking...";
    button.append(spinner, label);
  } else {
    label.textContent = "Check";
    button.append(label);
  }
}

function showSkeleton() {
  grid.innerHTML = "";
  for (let i = 0; i < 4; i += 1) {
    const li = document.createElement("li");
    li.className = "loading-card";
    grid.appendChild(li);
  }
}

function renderCheckCard(check) {
  const li = document.createElement("li");
  li.className = "check-card";

  const header = document.createElement("div");
  header.className = "check-card__header";

  const name = document.createElement("span");
  name.className = "check-name";
  name.textContent = check.checkName;

  const pill = document.createElement("span");
  pill.className = `status-pill status-${check.status}`;
  pill.textContent = check.status;

  header.append(name, pill);

  const summary = document.createElement("p");
  summary.className = "check-summary";
  summary.textContent = check.summary;

  li.append(header, summary);
  return li;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const domain = input.value.trim();
  if (!domain) return;

  setLoading(true);
  setStatus(`Checking ${domain}...`);
  showSkeleton();

  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await response.json();

    if (!response.ok) {
      grid.innerHTML = "";
      setStatus(data.error ?? "Something went wrong.", "error");
      return;
    }

    setStatus(`Checked ${data.domain}`);
    grid.innerHTML = "";
    for (const check of data.checks) {
      grid.appendChild(renderCheckCard(check));
    }
  } catch {
    grid.innerHTML = "";
    setStatus("Network error. Please try again.", "error");
  } finally {
    setLoading(false);
  }
});
