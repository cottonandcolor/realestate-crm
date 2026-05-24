// Legacy static prototype — see Next.js app in project root

const leadData = [
  { name: "Alice Johnson", email: "alice@example.com", phone: "555-1234", tags: "Buyer" },
  { name: "Bob Smith", email: "bob@example.com", phone: "555-5678", tags: "Seller" },
  { name: "Carol Lee", email: "carol@example.com", phone: "555-9012", tags: "Investor" },
];

const listingData = [
  { title: "Modern Condo", price: "$2,400 / month" },
  { title: "Spacious Townhouse", price: "$3,200 / month" },
];

const taskData = {
  todo: ["Call new leads", "Schedule open house"],
  inprogress: ["Prepare contract for 1401 Elm"],
  done: ["Update MLS listings"],
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function initTheme() {
  const saved = localStorage.getItem("theme");
  const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}
$("#themeToggle")?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});
initTheme();

$("#leadCount").textContent = leadData.length;
$("#listingCount").textContent = listingData.length;
$("#showingCount").textContent = 3;

function renderLeads(data) {
  const tbody = $("#leadTableBody");
  tbody.innerHTML = "";
  data.forEach((l) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${l.name}</td><td>${l.email}</td><td>${l.phone}</td><td>${l.tags}</td><td><button>✉️</button></td>`;
    tbody.appendChild(tr);
  });
}
renderLeads(leadData);

$("#leadSearch")?.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  renderLeads(
    leadData.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        l.phone.includes(term) ||
        l.tags.toLowerCase().includes(term)
    )
  );
});

function renderListings() {
  const grid = $(".grid");
  grid.innerHTML = "";
  listingData.forEach((l) => {
    const card = document.createElement("div");
    card.className = "listing-card glass";
    card.innerHTML = `<div class="info"><h3>${l.title}</h3><p>${l.price}</p></div>`;
    grid.appendChild(card);
  });
}
renderListings();

function renderKanban() {
  Object.entries(taskData).forEach(([col, items]) => {
    const ul = $(`#${col}List`);
    ul.innerHTML = "";
    items.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      li.draggable = true;
      ul.appendChild(li);
    });
  });
}
renderKanban();
