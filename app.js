const STORAGE_KEY = "leettrack-data-v1";

const initialState = {
  problems: [],
  explore: [],
};

const motivationMessages = [
  { cap: 0, text: "Start small: solve one problem today." },
  { cap: 25, text: "Good start. Keep your daily consistency alive." },
  { cap: 50, text: "Halfway momentum. Push one medium problem next." },
  { cap: 75, text: "Strong run. Finish the remaining set with intent." },
  { cap: 99, text: "Almost there. Clean up the final unsolved problems." },
  { cap: 100, text: "Complete set achieved. Time to expand your list." },
];

let state = loadState();

const refs = {
  statsGrid: document.getElementById("statsGrid"),
  completionText: document.getElementById("completionText"),
  completionBar: document.getElementById("completionBar"),
  motivationText: document.getElementById("motivationText"),
  problemForm: document.getElementById("problemForm"),
  problemTitle: document.getElementById("problemTitle"),
  problemTopic: document.getElementById("problemTopic"),
  problemDifficulty: document.getElementById("problemDifficulty"),
  problemStatus: document.getElementById("problemStatus"),
  problemList: document.getElementById("problemList"),
  statusFilter: document.getElementById("statusFilter"),
  difficultyFilter: document.getElementById("difficultyFilter"),
  searchInput: document.getElementById("searchInput"),
  problemCardTemplate: document.getElementById("problemCardTemplate"),
  exploreForm: document.getElementById("exploreForm"),
  exploreTitle: document.getElementById("exploreTitle"),
  exploreType: document.getElementById("exploreType"),
  exploreStatus: document.getElementById("exploreStatus"),
  exploreList: document.getElementById("exploreList"),
  exploreCardTemplate: document.getElementById("exploreCardTemplate"),
  seedDataBtn: document.getElementById("seedDataBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

bindEvents();
renderAll();

function bindEvents() {
  refs.problemForm.addEventListener("submit", onAddProblem);
  refs.exploreForm.addEventListener("submit", onAddExplore);

  refs.statusFilter.addEventListener("change", renderProblems);
  refs.difficultyFilter.addEventListener("change", renderProblems);
  refs.searchInput.addEventListener("input", renderProblems);

  refs.seedDataBtn.addEventListener("click", seedData);
  refs.resetBtn.addEventListener("click", resetAllData);
}

function onAddProblem(event) {
  event.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    title: refs.problemTitle.value.trim(),
    topic: refs.problemTopic.value.trim(),
    difficulty: refs.problemDifficulty.value,
    status: refs.problemStatus.value,
    code: "",
    thoughts: "",
    createdAt: Date.now(),
  };

  if (!item.title || !item.topic || !item.difficulty || !item.status) {
    return;
  }

  state.problems.unshift(item);
  saveAndRender();
  refs.problemForm.reset();
}

function onAddExplore(event) {
  event.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    title: refs.exploreTitle.value.trim(),
    type: refs.exploreType.value,
    status: refs.exploreStatus.value,
    notes: "",
    createdAt: Date.now(),
  };

  if (!item.title || !item.type || !item.status) {
    return;
  }

  state.explore.unshift(item);
  saveAndRender();
  refs.exploreForm.reset();
}

function renderAll() {
  renderStats();
  renderProblems();
  renderExplore();
}

function renderStats() {
  const totalProblems = state.problems.length;
  const solvedProblems = state.problems.filter((p) => p.status === "Solved").length;
  const inProgress = state.problems.filter((p) => p.status === "In Progress").length;
  const notStarted = state.problems.filter((p) => p.status === "Not Started").length;
  const totalExplore = state.explore.length;
  const completedExplore = state.explore.filter((e) => e.status === "Completed").length;

  const completion = totalProblems ? Math.round((solvedProblems / totalProblems) * 100) : 0;

  const stats = [
    { label: "Problems Total", value: totalProblems },
    { label: "Solved", value: solvedProblems },
    { label: "In Progress", value: inProgress },
    { label: "Not Started", value: notStarted },
    { label: "Explore Modules", value: totalExplore },
    { label: "Explore Done", value: completedExplore },
  ];

  refs.statsGrid.innerHTML = stats
    .map(
      (s) => `
      <article class="stat">
        <p class="label">${escapeHtml(s.label)}</p>
        <p class="value">${s.value}</p>
      </article>
    `
    )
    .join("");

  refs.completionText.textContent = `${completion}%`;
  refs.completionBar.style.width = `${completion}%`;
  refs.motivationText.textContent = getMotivation(completion);
}

function renderProblems() {
  const statusFilter = refs.statusFilter.value;
  const difficultyFilter = refs.difficultyFilter.value;
  const q = refs.searchInput.value.trim().toLowerCase();

  const items = state.problems.filter((problem) => {
    if (statusFilter !== "All" && problem.status !== statusFilter) {
      return false;
    }
    if (difficultyFilter !== "All" && problem.difficulty !== difficultyFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (`${problem.title} ${problem.topic}`).toLowerCase().includes(q);
  });

  if (!items.length) {
    refs.problemList.innerHTML = '<div class="empty">No problems match the current filters.</div>';
    return;
  }

  refs.problemList.innerHTML = "";

  for (const problem of items) {
    const clone = refs.problemCardTemplate.content.cloneNode(true);
    const card = clone.querySelector(".card");
    const title = clone.querySelector(".card-title");
    const meta = clone.querySelector(".card-meta");
    const difficulty = clone.querySelector(".difficulty");
    const statusSelect = clone.querySelector(".status-select");
    const deleteBtn = clone.querySelector(".delete-btn");
    const codeInput = clone.querySelector(".problem-code");
    const thoughtsInput = clone.querySelector(".problem-thoughts");

    title.textContent = problem.title;
    meta.textContent = `${problem.topic}`;

    difficulty.textContent = problem.difficulty;
    difficulty.classList.add(problem.difficulty.toLowerCase());

    statusSelect.value = problem.status;
    statusSelect.addEventListener("change", (event) => {
      updateProblem(problem.id, { status: event.target.value });
    });

    codeInput.value = problem.code || "";
    codeInput.addEventListener("input", (event) => {
      updateProblem(problem.id, { code: event.target.value }, false);
    });

    thoughtsInput.value = problem.thoughts || "";
    thoughtsInput.addEventListener("input", (event) => {
      updateProblem(problem.id, { thoughts: event.target.value }, false);
    });

    deleteBtn.addEventListener("click", () => {
      state.problems = state.problems.filter((p) => p.id !== problem.id);
      saveAndRender();
    });

    card.dataset.id = problem.id;
    refs.problemList.appendChild(clone);
  }
}

function renderExplore() {
  if (!state.explore.length) {
    refs.exploreList.innerHTML = '<div class="empty">No lesson or crash course modules yet.</div>';
    return;
  }

  refs.exploreList.innerHTML = "";

  for (const module of state.explore) {
    const clone = refs.exploreCardTemplate.content.cloneNode(true);
    const card = clone.querySelector(".card");
    const title = clone.querySelector(".card-title");
    const typePill = clone.querySelector(".type-pill");
    const statusSelect = clone.querySelector(".status-select");
    const deleteBtn = clone.querySelector(".delete-btn");
    const notes = clone.querySelector(".notes");

    title.textContent = module.title;
    typePill.textContent = module.type;

    statusSelect.value = module.status;
    statusSelect.addEventListener("change", (event) => {
      updateExplore(module.id, { status: event.target.value });
    });

    notes.value = module.notes || "";
    notes.addEventListener("input", (event) => {
      updateExplore(module.id, { notes: event.target.value }, false);
    });

    deleteBtn.addEventListener("click", () => {
      state.explore = state.explore.filter((item) => item.id !== module.id);
      saveAndRender();
    });

    card.dataset.id = module.id;
    refs.exploreList.appendChild(clone);
  }
}

function updateProblem(id, patch, rerender = true) {
  state.problems = state.problems.map((problem) => (problem.id === id ? { ...problem, ...patch } : problem));
  persist();
  if (rerender) {
    renderAll();
  } else {
    renderStats();
  }
}

function updateExplore(id, patch, rerender = true) {
  state.explore = state.explore.map((module) => (module.id === id ? { ...module, ...patch } : module));
  persist();
  if (rerender) {
    renderAll();
  } else {
    renderStats();
  }
}

function saveAndRender() {
  persist();
  renderAll();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(initialState);
    }
    const parsed = JSON.parse(raw);
    return {
      problems: Array.isArray(parsed.problems) ? parsed.problems : [],
      explore: Array.isArray(parsed.explore) ? parsed.explore : [],
    };
  } catch {
    return structuredClone(initialState);
  }
}

function getMotivation(percent) {
  let message = motivationMessages[0].text;
  for (const step of motivationMessages) {
    if (percent >= step.cap) {
      message = step.text;
    }
  }
  return message;
}

function seedData() {
  state = {
    problems: [
      {
        id: crypto.randomUUID(),
        title: "Two Sum",
        topic: "Arrays",
        difficulty: "Easy",
        status: "Solved",
        code: "function twoSum(nums, target) {\\n  const seen = new Map();\\n  for (let i = 0; i < nums.length; i++) {\\n    const need = target - nums[i];\\n    if (seen.has(need)) return [seen.get(need), i];\\n    seen.set(nums[i], i);\\n  }\\n}",
        thoughts: "Use hash map for complements to move from O(n^2) brute force to O(n).",
        createdAt: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        title: "Binary Tree Level Order Traversal",
        topic: "Trees",
        difficulty: "Medium",
        status: "In Progress",
        code: "",
        thoughts: "",
        createdAt: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        title: "LFU Cache",
        topic: "Design",
        difficulty: "Hard",
        status: "Not Started",
        code: "",
        thoughts: "",
        createdAt: Date.now(),
      },
    ],
    explore: [
      {
        id: crypto.randomUUID(),
        title: "Graph Theory Basics",
        type: "Lesson",
        status: "In Progress",
        notes: "Revisit BFS vs DFS decision rules. Build shortest path template.",
        createdAt: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        title: "Dynamic Programming Crash Course",
        type: "Crash Course",
        status: "Completed",
        notes: "State definition first, then transition, then base case. Practice 1D optimization.",
        createdAt: Date.now(),
      },
    ],
  };

  saveAndRender();
}

function resetAllData() {
  state = structuredClone(initialState);
  saveAndRender();
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
