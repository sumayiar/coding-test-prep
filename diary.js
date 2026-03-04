const STORAGE_KEY = "leettrack-diary-v1";

const refs = {
  form: document.getElementById("diaryForm"),
  entryDate: document.getElementById("entryDate"),
  entryTitle: document.getElementById("entryTitle"),
  entryText: document.getElementById("entryText"),
  entryFile: document.getElementById("entryFile"),
  diaryList: document.getElementById("diaryList"),
  entryCount: document.getElementById("entryCount"),
};

let entries = loadEntries();
refs.entryDate.value = new Date().toISOString().slice(0, 10);

refs.form.addEventListener("submit", onSubmit);
render();

async function onSubmit(event) {
  event.preventDefault();

  const date = refs.entryDate.value;
  const title = refs.entryTitle.value.trim();
  const text = refs.entryText.value.trim();
  const file = refs.entryFile.files[0];

  if (!date || !title || !text) {
    return;
  }

  const attachment = file ? await toAttachment(file) : null;

  entries.unshift({
    id: crypto.randomUUID(),
    date,
    title,
    text,
    attachment,
    createdAt: Date.now(),
  });

  persist();
  render();
  refs.form.reset();
  refs.entryDate.value = new Date().toISOString().slice(0, 10);
}

function render() {
  refs.entryCount.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  if (!entries.length) {
    refs.diaryList.innerHTML = '<div class="empty">No diary entries yet. Add your first daily check-in.</div>';
    return;
  }

  refs.diaryList.innerHTML = entries
    .map((entry) => {
      const preview = renderAttachment(entry.attachment);
      return `
      <article class="card diary-card">
        <div class="card-head">
          <h3 class="card-title">${escapeHtml(entry.title)}</h3>
          <span class="pill type-pill">${escapeHtml(entry.date)}</span>
        </div>
        <p class="card-meta">${escapeHtml(entry.text)}</p>
        ${preview}
        <div class="card-controls">
          <button class="btn btn-danger btn-small" onclick="deleteEntry('${entry.id}')">Delete</button>
        </div>
      </article>
      `;
    })
    .join("");
}

function renderAttachment(attachment) {
  if (!attachment) {
    return "";
  }

  if (attachment.type.startsWith("image/")) {
    return `
      <a class="attachment-link" href="${attachment.dataUrl}" download="${escapeHtml(attachment.name)}">
        <img class="diary-image" src="${attachment.dataUrl}" alt="Uploaded progress image" />
      </a>
      <p class="card-meta">Attachment: ${escapeHtml(attachment.name)}</p>
    `;
  }

  return `
    <a class="attachment-link" href="${attachment.dataUrl}" download="${escapeHtml(attachment.name)}">Download attachment: ${escapeHtml(attachment.name)}</a>
  `;
}

function deleteEntry(id) {
  entries = entries.filter((entry) => entry.id !== id);
  persist();
  render();
}

window.deleteEntry = deleteEntry;

function toAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        dataUrl: reader.result,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
