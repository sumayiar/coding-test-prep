const STORAGE_KEY = "leettrack-diary-v1";
const GITHUB_SETTINGS_KEY = "leettrack-github-settings-v1";

const refs = {
  githubForm: document.getElementById("githubForm"),
  ghOwner: document.getElementById("ghOwner"),
  ghRepo: document.getElementById("ghRepo"),
  ghBranch: document.getElementById("ghBranch"),
  ghFolder: document.getElementById("ghFolder"),
  ghToken: document.getElementById("ghToken"),
  autoPush: document.getElementById("autoPush"),
  githubStatus: document.getElementById("githubStatus"),
  form: document.getElementById("diaryForm"),
  entryDate: document.getElementById("entryDate"),
  entryTitle: document.getElementById("entryTitle"),
  entryText: document.getElementById("entryText"),
  entryFile: document.getElementById("entryFile"),
  diaryList: document.getElementById("diaryList"),
  entryCount: document.getElementById("entryCount"),
  pushAllBtn: document.getElementById("pushAllBtn"),
};

let entries = loadEntries();
let githubSettings = loadGithubSettings();
refs.entryDate.value = new Date().toISOString().slice(0, 10);
hydrateGithubSettings();

refs.form.addEventListener("submit", onSubmit);
refs.githubForm.addEventListener("submit", onSaveGithubSettings);
refs.pushAllBtn.addEventListener("click", onPushAll);
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
    github: null,
    createdAt: Date.now(),
  });

  persist();
  render();
  const newEntry = entries[0];
  if (githubSettings.autoPush) {
    await pushEntry(newEntry.id);
  }
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
        <p class="card-meta">${githubLine(entry)}</p>
        ${preview}
        <div class="card-controls">
          <button class="btn btn-primary btn-small push-btn" data-id="${entry.id}">Push To GitHub</button>
          <button class="btn btn-danger btn-small delete-btn" data-id="${entry.id}">Delete</button>
        </div>
      </article>
      `;
    })
    .join("");

  refs.diaryList.querySelectorAll(".push-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const id = event.currentTarget.dataset.id;
      await pushEntry(id);
    });
  });

  refs.diaryList.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.id;
      deleteEntry(id);
    });
  });
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

async function onSaveGithubSettings(event) {
  event.preventDefault();
  githubSettings = {
    owner: refs.ghOwner.value.trim(),
    repo: refs.ghRepo.value.trim(),
    branch: refs.ghBranch.value.trim() || "main",
    folder: refs.ghFolder.value.trim() || "diary-entries",
    token: refs.ghToken.value.trim(),
    autoPush: refs.autoPush.checked,
  };
  persistGithubSettings();
  setGithubStatus("GitHub settings saved.");
}

async function onPushAll() {
  if (!ensureGithubSettings()) {
    return;
  }
  setGithubStatus("Pushing all entries...");
  for (const entry of entries) {
    await pushEntry(entry.id, true);
  }
  setGithubStatus("Finished pushing all entries.");
}

async function pushEntry(entryId, silent = false) {
  if (!ensureGithubSettings()) {
    return;
  }
  const entry = entries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  const path = `${githubSettings.folder}/${entry.date}-${slugify(entry.title)}-${entry.id.slice(0, 8)}.md`;
  const content = buildEntryMarkdown(entry);
  const encodedContent = btoa(unescape(encodeURIComponent(content)));

  let sha = null;
  try {
    const check = await fetch(buildContentApiUrl(path, true), {
      headers: authHeaders(),
    });
    if (check.ok) {
      const payload = await check.json();
      sha = payload.sha || null;
    }
  } catch {
    // Continue with create flow.
  }

  const payload = {
    message: `Diary: ${entry.date} - ${entry.title}`,
    content: encodedContent,
    branch: githubSettings.branch,
  };
  if (sha) {
    payload.sha = sha;
  }

  try {
    const response = await fetch(buildContentApiUrl(path, false), {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "GitHub push failed.");
    }

    const result = await response.json();
    const htmlUrl = result?.content?.html_url || "";
    entries = entries.map((item) =>
      item.id === entryId
        ? {
            ...item,
            github: {
              pushedAt: new Date().toISOString(),
              path,
              htmlUrl,
            },
          }
        : item
    );
    persist();
    render();
    if (!silent) {
      setGithubStatus(`Pushed "${entry.title}" to GitHub.`);
    }
  } catch (error) {
    if (!silent) {
      setGithubStatus(`Push failed: ${error.message}`);
    }
  }
}

function ensureGithubSettings() {
  if (!githubSettings.owner || !githubSettings.repo || !githubSettings.branch || !githubSettings.folder || !githubSettings.token) {
    setGithubStatus("Missing GitHub settings. Save owner/repo/branch/folder/token first.");
    return false;
  }
  return true;
}

function hydrateGithubSettings() {
  refs.ghOwner.value = githubSettings.owner || "sumayiar";
  refs.ghRepo.value = githubSettings.repo || "coding-test-prep";
  refs.ghBranch.value = githubSettings.branch || "main";
  refs.ghFolder.value = githubSettings.folder || "diary-entries";
  refs.ghToken.value = githubSettings.token || "";
  refs.autoPush.checked = Boolean(githubSettings.autoPush);
}

function loadGithubSettings() {
  try {
    const raw = localStorage.getItem(GITHUB_SETTINGS_KEY);
    if (!raw) {
      return defaultGithubSettings();
    }
    const parsed = JSON.parse(raw);
    return {
      owner: parsed.owner || "sumayiar",
      repo: parsed.repo || "coding-test-prep",
      branch: parsed.branch || "main",
      folder: parsed.folder || "diary-entries",
      token: parsed.token || "",
      autoPush: Boolean(parsed.autoPush),
    };
  } catch {
    return defaultGithubSettings();
  }
}

function defaultGithubSettings() {
  return {
    owner: "sumayiar",
    repo: "coding-test-prep",
    branch: "main",
    folder: "diary-entries",
    token: "",
    autoPush: false,
  };
}

function persistGithubSettings() {
  localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(githubSettings));
}

function authHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubSettings.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function buildContentApiUrl(path, withRef) {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const base = `https://api.github.com/repos/${encodeURIComponent(githubSettings.owner)}/${encodeURIComponent(
    githubSettings.repo
  )}/contents/${encodedPath}`;
  if (!withRef) {
    return base;
  }
  return `${base}?ref=${encodeURIComponent(githubSettings.branch)}`;
}

function buildEntryMarkdown(entry) {
  const lines = [
    `# ${entry.title}`,
    "",
    `- Date: ${entry.date}`,
    `- Created At: ${new Date(entry.createdAt).toISOString()}`,
    "",
    "## Progress Notes",
    entry.text,
  ];

  if (entry.attachment) {
    lines.push("", "## Attachment");
    lines.push(`- File: ${entry.attachment.name}`);
    lines.push("- Note: Attachment binary is stored locally in browser diary only.");
  }

  return lines.join("\n");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function githubLine(entry) {
  if (!entry.github || !entry.github.pushedAt) {
    return "GitHub: not pushed yet";
  }
  if (entry.github.htmlUrl) {
    return `GitHub: pushed (${new Date(entry.github.pushedAt).toLocaleString()}) - ${entry.github.path}`;
  }
  return `GitHub: pushed (${new Date(entry.github.pushedAt).toLocaleString()})`;
}

function setGithubStatus(message) {
  refs.githubStatus.textContent = message;
}

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
