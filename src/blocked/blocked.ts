const params = new URLSearchParams(window.location.search);
const domain = params.get("domain") ?? "unknown";

const domainEl = document.getElementById("blocked-domain");
if (domainEl) {
  domainEl.textContent = domain;
}

document.getElementById("go-back-btn")?.addEventListener("click", () => {
  history.back();
});
