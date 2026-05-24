const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const COLUMNS = [
  { id: "todo", title: "To Do", color: "#6b7280" },
  { id: "in_progress", title: "In Progress", color: "#2563eb" },
  { id: "in_review", title: "In Review", color: "#b7791f" },
  { id: "done", title: "Done", color: "#0f9f6e" },
];

const seedMembers = [
  { id: crypto.randomUUID(), name: "Alex Rivera", color: "#2563eb" },
  { id: crypto.randomUUID(), name: "Mina Patel", color: "#0f9f6e" },
];

const seedTasks = [
  {
    id: crypto.randomUUID(),
    title: "Map onboarding empty states",
    description: "Tighten the first-run experience before shipping the demo.",
    status: "todo",
    priority: "high",
    due_date: offsetDate(1),
    labels: ["Design"],
    assignee_id: seedMembers[0].id,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: "Review RLS task policies",
    description: "Confirm anonymous guests can only read and write their own rows.",
    status: "in_progress",
    priority: "normal",
    due_date: offsetDate(3),
    labels: ["Security", "Supabase"],
    assignee_id: seedMembers[1].id,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: "Prepare deployment notes",
    description: "Add local setup, schema, and hosting instructions to the final document.",
    status: "in_review",
    priority: "low",
    due_date: offsetDate(5),
    labels: ["Docs"],
    assignee_id: "",
    created_at: new Date().toISOString(),
  },
];

const state = {
  tasks: [],
  members: [],
  comments: [],
  activities: [],
  user: null,
  draggingTaskId: null,
  pointerDrag: null,
  suppressCardClick: false,
  usingSupabase: false,
  search: "",
  priority: "all",
  assignee: "all",
  label: "all",
};

const els = {
  board: document.querySelector("#board"),
  loadingBanner: document.querySelector("#loadingBanner"),
  errorBanner: document.querySelector("#errorBanner"),
  connectionStatus: document.querySelector("#connectionStatus"),
  totalTasks: document.querySelector("#totalTasks"),
  doneTasks: document.querySelector("#doneTasks"),
  overdueTasks: document.querySelector("#overdueTasks"),
  searchInput: document.querySelector("#searchInput"),
  priorityFilter: document.querySelector("#priorityFilter"),
  assigneeFilter: document.querySelector("#assigneeFilter"),
  labelFilter: document.querySelector("#labelFilter"),
  taskModal: document.querySelector("#taskModal"),
  taskForm: document.querySelector("#taskForm"),
  taskModalTitle: document.querySelector("#taskModalTitle"),
  taskId: document.querySelector("#taskId"),
  taskTitle: document.querySelector("#taskTitle"),
  taskDescription: document.querySelector("#taskDescription"),
  taskStatus: document.querySelector("#taskStatus"),
  taskPriority: document.querySelector("#taskPriority"),
  taskDueDate: document.querySelector("#taskDueDate"),
  taskAssignee: document.querySelector("#taskAssignee"),
  taskLabels: document.querySelector("#taskLabels"),
  deleteTaskButton: document.querySelector("#deleteTaskButton"),
  taskCollaborationPanel: document.querySelector("#taskCollaborationPanel"),
  commentList: document.querySelector("#commentList"),
  commentInput: document.querySelector("#commentInput"),
  addCommentButton: document.querySelector("#addCommentButton"),
  activityList: document.querySelector("#activityList"),
  memberModal: document.querySelector("#memberModal"),
  memberForm: document.querySelector("#memberForm"),
  memberName: document.querySelector("#memberName"),
  memberColor: document.querySelector("#memberColor"),
  memberList: document.querySelector("#memberList"),
  openTaskModal: document.querySelector("#openTaskModal"),
  openMemberModal: document.querySelector("#openMemberModal"),
  emptyColumnTemplate: document.querySelector("#emptyColumnTemplate"),
};

let supabaseClient = null;

init();

async function init() {
  renderColumnOptions();
  bindEvents();
  setLoading(true);

  try {
    state.usingSupabase = isSupabaseConfigured();
    if (state.usingSupabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await signInGuest();
      await Promise.all([loadTasks(), loadMembers(), loadComments(), loadActivities()]);
      els.connectionStatus.textContent = "Connected to Supabase with an anonymous guest session.";
    } else {
      loadLocalDemo();
      els.connectionStatus.textContent = "Demo mode: add your Supabase URL and anon key in app.js to enable persisted guest data.";
    }
  } catch (error) {
    showError(error.message);
    loadLocalDemo();
    els.connectionStatus.textContent = "Supabase was unavailable, so this browser is using local demo storage.";
  } finally {
    setLoading(false);
    render();
  }
}

function isSupabaseConfigured() {
  return SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_PROJECT_REF") && SUPABASE_ANON_KEY.length > 30;
}

async function signInGuest() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (sessionData.session?.user) {
    state.user = sessionData.session.user;
    return;
  }

  const { data, error } = await supabaseClient.auth.signInAnonymously();
  if (error) throw error;
  state.user = data.user;
}

async function loadTasks() {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  state.tasks = data || [];
}

async function loadMembers() {
  const { data, error } = await supabaseClient
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  state.members = data || [];
}

async function loadComments() {
  const { data, error } = await supabaseClient
    .from("task_comments")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  state.comments = data || [];
}

async function loadActivities() {
  const { data, error } = await supabaseClient
    .from("task_activity")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  state.activities = data || [];
}

function loadLocalDemo() {
  const saved = JSON.parse(localStorage.getItem("nextplay-board") || "null");
  if (saved) {
    state.tasks = saved.tasks || [];
    state.members = saved.members || [];
    state.comments = saved.comments || [];
    state.activities = saved.activities || [];
    return;
  }

  state.members = seedMembers;
  state.tasks = seedTasks;
  state.comments = [
    {
      id: crypto.randomUUID(),
      task_id: seedTasks[1].id,
      body: "Anonymous auth and RLS are the highest-risk parts, so keep this easy to verify.",
      created_at: new Date().toISOString(),
    },
  ];
  state.activities = seedTasks.map((task) => ({
    id: crypto.randomUUID(),
    task_id: task.id,
    message: `Created task in ${columnTitle(task.status)}`,
    created_at: task.created_at,
  }));
  saveLocal();
}

function saveLocal() {
  if (!state.usingSupabase) {
    localStorage.setItem(
      "nextplay-board",
      JSON.stringify({
        tasks: state.tasks,
        members: state.members,
        comments: state.comments,
        activities: state.activities,
      })
    );
  }
}

function bindEvents() {
  els.openTaskModal.addEventListener("click", () => openTaskModal());
  els.openMemberModal.addEventListener("click", () => openModal(els.memberModal));
  els.taskForm.addEventListener("submit", handleTaskSubmit);
  els.memberForm.addEventListener("submit", handleMemberSubmit);
  els.deleteTaskButton.addEventListener("click", handleTaskDelete);
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });
  els.priorityFilter.addEventListener("change", (event) => {
    state.priority = event.target.value;
    render();
  });
  els.assigneeFilter.addEventListener("change", (event) => {
    state.assignee = event.target.value;
    render();
  });
  els.labelFilter.addEventListener("change", (event) => {
    state.label = event.target.value;
    render();
  });
  els.addCommentButton.addEventListener("click", handleCommentSubmit);
  els.commentInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCommentSubmit();
    }
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModals());
  });

  [els.taskModal, els.memberModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModals();
    });
  });
}

function renderColumnOptions() {
  els.taskStatus.innerHTML = COLUMNS.map((column) => `<option value="${column.id}">${column.title}</option>`).join("");
}

function render() {
  renderMembers();
  renderAssigneeOptions();
  renderBoardFilters();
  renderStats();
  renderBoard();
}

function renderMembers() {
  if (!state.members.length) {
    els.memberList.innerHTML = `<div class="empty-state"><strong>No members yet</strong><span>Add teammates to assign work.</span></div>`;
    return;
  }

  els.memberList.innerHTML = state.members
    .map((member) => {
      return `
        <div class="member-row">
          ${avatarFor(member)}
          <strong>${escapeHtml(member.name)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderAssigneeOptions() {
  els.taskAssignee.innerHTML = [
    `<option value="">Unassigned</option>`,
    ...state.members.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`),
  ].join("");
}

function renderBoardFilters() {
  const currentAssignee = state.assignee;
  const currentLabel = state.label;
  els.assigneeFilter.innerHTML = [
    `<option value="all">All assignees</option>`,
    `<option value="unassigned">Unassigned</option>`,
    ...state.members.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`),
  ].join("");
  els.assigneeFilter.value = [...els.assigneeFilter.options].some((option) => option.value === currentAssignee)
    ? currentAssignee
    : "all";
  state.assignee = els.assigneeFilter.value;

  const labels = [...new Set(state.tasks.flatMap((task) => normalizeLabels(task.labels)))].sort((a, b) => a.localeCompare(b));
  els.labelFilter.innerHTML = [
    `<option value="all">All labels</option>`,
    ...labels.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`),
  ].join("");
  els.labelFilter.value = labels.includes(currentLabel) ? currentLabel : "all";
  state.label = els.labelFilter.value;
}

function renderStats() {
  els.totalTasks.textContent = state.tasks.length;
  els.doneTasks.textContent = state.tasks.filter((task) => task.status === "done").length;
  els.overdueTasks.textContent = state.tasks.filter((task) => getDueState(task.due_date) === "overdue").length;
}

function renderBoard() {
  const visibleTasks = getVisibleTasks();
  els.board.innerHTML = COLUMNS.map((column) => {
    const tasks = visibleTasks.filter((task) => task.status === column.id);
    return `
      <article class="column">
        <div class="column-header">
          <div class="column-title">
            <span class="column-dot" style="background:${column.color}"></span>
            <span>${column.title}</span>
          </div>
          <span class="column-count">${tasks.length}</span>
        </div>
        <div class="drop-zone" data-status="${column.id}">
          ${tasks.length ? tasks.map(renderTaskCard).join("") : els.emptyColumnTemplate.innerHTML}
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
    card.addEventListener("pointerdown", handlePointerDown);
    card.addEventListener("pointermove", handlePointerMove);
    card.addEventListener("pointerup", handlePointerUp);
    card.addEventListener("pointercancel", handlePointerCancel);
  });

  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (state.suppressCardClick) {
        event.preventDefault();
        return;
      }
      openTaskModal(card.dataset.id);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTaskModal(card.dataset.id);
      }
    });
  });

  document.querySelectorAll(".drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", handleDrop);
  });
}

function renderTaskCard(task) {
  const member = state.members.find((item) => item.id === task.assignee_id);
  const dueState = getDueState(task.due_date);
  const labels = normalizeLabels(task.labels);
  return `
    <article class="task-card" data-id="${task.id}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(task.title)}">
      <div class="card-inner">
        <div class="task-title-row">
          <h3>${escapeHtml(task.title)}</h3>
          <span class="priority ${task.priority || "normal"}">${task.priority || "normal"}</span>
        </div>
        ${task.description ? `<p class="description">${escapeHtml(task.description)}</p>` : ""}
        ${labels.length ? `<div class="label-row">${labels.map((label) => `<span class="label-pill">${escapeHtml(label)}</span>`).join("")}</div>` : ""}
        <div class="card-meta">
          ${task.due_date ? `<span class="due-pill ${dueState}">${formatDueDate(task.due_date, dueState)}</span>` : ""}
          ${member ? avatarFor(member) : ""}
        </div>
      </div>
    </article>
  `;
}

function getVisibleTasks() {
  return state.tasks.filter((task) => {
    const member = state.members.find((item) => item.id === task.assignee_id);
    const searchable = [
      task.title,
      task.description,
      task.priority,
      member?.name,
      ...normalizeLabels(task.labels),
    ].join(" ").toLowerCase();
    const matchesSearch = !state.search || searchable.includes(state.search);
    const matchesPriority = state.priority === "all" || task.priority === state.priority;
    const matchesAssignee =
      state.assignee === "all" ||
      (state.assignee === "unassigned" && !task.assignee_id) ||
      task.assignee_id === state.assignee;
    const matchesLabel = state.label === "all" || normalizeLabels(task.labels).includes(state.label);
    return matchesSearch && matchesPriority && matchesAssignee && matchesLabel;
  });
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  clearError();
  const task = {
    title: els.taskTitle.value.trim(),
    description: els.taskDescription.value.trim(),
    status: els.taskStatus.value,
    priority: els.taskPriority.value,
    due_date: els.taskDueDate.value || null,
    assignee_id: els.taskAssignee.value || null,
    labels: parseLabels(els.taskLabels.value),
  };

  try {
    if (els.taskId.value) {
      await updateTask(els.taskId.value, task);
    } else {
      await createTask(task);
    }
    closeModals();
    render();
  } catch (error) {
    showError(error.message);
  }
}

async function createTask(task) {
  if (state.usingSupabase) {
    const payload = { ...task, user_id: state.user.id };
    const { data, error } = await supabaseClient.from("tasks").insert(payload).select().single();
    if (error) throw error;
    state.tasks.push(data);
    await createActivity(data.id, `Created task in ${columnTitle(data.status)}`);
    return;
  }

  const createdTask = { ...task, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  state.tasks.push(createdTask);
  await createActivity(createdTask.id, `Created task in ${columnTitle(createdTask.status)}`);
  saveLocal();
}

async function updateTask(id, patch) {
  const previous = state.tasks.find((task) => task.id === id);
  if (state.usingSupabase) {
    const { data, error } = await supabaseClient.from("tasks").update(patch).eq("id", id).select().single();
    if (error) throw error;
    state.tasks = state.tasks.map((task) => (task.id === id ? data : task));
    await recordTaskChanges(previous, data, patch);
    return;
  }

  const updated = { ...previous, ...patch };
  state.tasks = state.tasks.map((task) => (task.id === id ? updated : task));
  await recordTaskChanges(previous, updated, patch);
  saveLocal();
}

async function handleTaskDelete() {
  const id = els.taskId.value;
  if (!id) return;

  try {
    if (state.usingSupabase) {
      const { error } = await supabaseClient.from("tasks").delete().eq("id", id);
      if (error) throw error;
    }
    state.tasks = state.tasks.filter((task) => task.id !== id);
    state.comments = state.comments.filter((comment) => comment.task_id !== id);
    state.activities = state.activities.filter((activity) => activity.task_id !== id);
    saveLocal();
    closeModals();
    render();
  } catch (error) {
    showError(error.message);
  }
}

async function handleCommentSubmit() {
  const taskId = els.taskId.value;
  const body = els.commentInput.value.trim();
  if (!taskId || !body) return;

  try {
    if (state.usingSupabase) {
      const { data, error } = await supabaseClient
        .from("task_comments")
        .insert({ task_id: taskId, body, user_id: state.user.id })
        .select()
        .single();
      if (error) throw error;
      state.comments.push(data);
    } else {
      state.comments.push({
        id: crypto.randomUUID(),
        task_id: taskId,
        body,
        created_at: new Date().toISOString(),
      });
      saveLocal();
    }
    await createActivity(taskId, "Added a comment");
    els.commentInput.value = "";
    renderTaskDetails(taskId);
  } catch (error) {
    showError(error.message);
  }
}

async function createActivity(taskId, message) {
  const activity = {
    task_id: taskId,
    message,
  };

  if (state.usingSupabase) {
    const { data, error } = await supabaseClient
      .from("task_activity")
      .insert({ ...activity, user_id: state.user.id })
      .select()
      .single();
    if (error) throw error;
    state.activities.push(data);
    return;
  }

  state.activities.push({
    ...activity,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  });
  saveLocal();
}

async function recordTaskChanges(previous, next, patch) {
  if (!previous || !next) return;
  const messages = [];
  if (patch.status && previous.status !== next.status) {
    messages.push(`Moved from ${columnTitle(previous.status)} to ${columnTitle(next.status)}`);
  }
  if (patch.assignee_id !== undefined && previous.assignee_id !== next.assignee_id) {
    messages.push(`Assigned to ${memberName(next.assignee_id)}`);
  }
  if (patch.priority && previous.priority !== next.priority) {
    messages.push(`Changed priority to ${next.priority}`);
  }
  if (patch.due_date !== undefined && previous.due_date !== next.due_date) {
    messages.push(next.due_date ? `Updated due date to ${formatDueDate(next.due_date, getDueState(next.due_date))}` : "Cleared due date");
  }
  if (patch.title && previous.title !== next.title) {
    messages.push("Renamed the task");
  }

  for (const message of messages) {
    await createActivity(next.id, message);
  }
}

async function handleMemberSubmit(event) {
  event.preventDefault();
  const member = {
    name: els.memberName.value.trim(),
    color: els.memberColor.value,
  };

  try {
    if (state.usingSupabase) {
      const { data, error } = await supabaseClient
        .from("team_members")
        .insert({ ...member, user_id: state.user.id })
        .select()
        .single();
      if (error) throw error;
      state.members.push(data);
    } else {
      state.members.push({ ...member, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      saveLocal();
    }
    els.memberForm.reset();
    closeModals();
    render();
  } catch (error) {
    showError(error.message);
  }
}

function handleDragStart(event) {
  state.draggingTaskId = event.currentTarget.dataset.id;
  event.dataTransfer.effectAllowed = "move";
  event.currentTarget.classList.add("dragging");
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  state.draggingTaskId = null;
  state.suppressCardClick = true;
  setTimeout(() => {
    state.suppressCardClick = false;
  }, 0);
  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("drag-over"));
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

async function handleDrop(event) {
  event.preventDefault();
  const nextStatus = event.currentTarget.dataset.status;
  event.currentTarget.classList.remove("drag-over");
  const task = state.tasks.find((item) => item.id === state.draggingTaskId);
  if (!task || task.status === nextStatus) return;

  try {
    await updateTask(task.id, { status: nextStatus });
    render();
  } catch (error) {
    showError(error.message);
  }
}

function handlePointerDown(event) {
  if (event.button !== 0) return;
  state.pointerDrag = {
    id: event.currentTarget.dataset.id,
    startX: event.clientX,
    startY: event.clientY,
    active: false,
    card: event.currentTarget,
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event) {
  if (!state.pointerDrag) return;
  const distance = Math.hypot(event.clientX - state.pointerDrag.startX, event.clientY - state.pointerDrag.startY);
  if (distance < 8 && !state.pointerDrag.active) return;

  state.pointerDrag.active = true;
  state.pointerDrag.card.classList.add("dragging");
  state.suppressCardClick = true;
  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("drag-over"));
  const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest(".drop-zone");
  zone?.classList.add("drag-over");
}

async function handlePointerUp(event) {
  if (!state.pointerDrag) return;
  const drag = state.pointerDrag;
  state.pointerDrag = null;
  drag.card.classList.remove("dragging");
  drag.card.releasePointerCapture?.(event.pointerId);
  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("drag-over"));

  if (!drag.active) return;

  const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest(".drop-zone");
  const nextStatus = zone?.dataset.status;
  const task = state.tasks.find((item) => item.id === drag.id);
  if (nextStatus && task && task.status !== nextStatus) {
    try {
      await updateTask(task.id, { status: nextStatus });
      render();
    } catch (error) {
      showError(error.message);
    }
  }

  setTimeout(() => {
    state.suppressCardClick = false;
  }, 0);
}

function handlePointerCancel(event) {
  if (!state.pointerDrag) return;
  state.pointerDrag.card.classList.remove("dragging");
  state.pointerDrag.card.releasePointerCapture?.(event.pointerId);
  state.pointerDrag = null;
  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("drag-over"));
  setTimeout(() => {
    state.suppressCardClick = false;
  }, 0);
}

function openTaskModal(id = "") {
  const task = state.tasks.find((item) => item.id === id);
  els.taskForm.reset();
  els.taskId.value = task?.id || "";
  els.taskModalTitle.textContent = task ? "Edit task" : "Create task";
  els.deleteTaskButton.style.visibility = task ? "visible" : "hidden";
  els.taskTitle.value = task?.title || "";
  els.taskDescription.value = task?.description || "";
  els.taskStatus.value = task?.status || "todo";
  els.taskPriority.value = task?.priority || "normal";
  els.taskDueDate.value = task?.due_date || "";
  els.taskAssignee.value = task?.assignee_id || "";
  els.taskLabels.value = normalizeLabels(task?.labels).join(", ");
  els.taskCollaborationPanel.style.display = task ? "grid" : "none";
  if (task) renderTaskDetails(task.id);
  openModal(els.taskModal);
}

function renderTaskDetails(taskId) {
  const comments = state.comments
    .filter((comment) => comment.task_id === taskId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const activities = state.activities
    .filter((activity) => activity.task_id === taskId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  els.commentList.innerHTML = comments.length
    ? comments.map(renderComment).join("")
    : `<div class="inline-empty">No comments yet.</div>`;
  els.activityList.innerHTML = activities.length
    ? activities.map(renderActivity).join("")
    : `<div class="inline-empty">No activity yet.</div>`;
}

function renderComment(comment) {
  return `
    <article class="comment-item">
      <p>${escapeHtml(comment.body)}</p>
      <span>${formatTimestamp(comment.created_at)}</span>
    </article>
  `;
}

function renderActivity(activity) {
  return `
    <article class="activity-item">
      <span class="activity-dot"></span>
      <div>
        <strong>${escapeHtml(activity.message)}</strong>
        <span>${formatTimestamp(activity.created_at)}</span>
      </div>
    </article>
  `;
}

function openModal(modal) {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModals() {
  [els.taskModal, els.memberModal].forEach((modal) => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });
}

function setLoading(isLoading) {
  els.loadingBanner.classList.toggle("is-visible", isLoading);
}

function showError(message) {
  els.errorBanner.textContent = message;
  els.errorBanner.classList.add("is-visible");
}

function clearError() {
  els.errorBanner.textContent = "";
  els.errorBanner.classList.remove("is-visible");
}

function avatarFor(member) {
  const initials = member.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `<span class="avatar" title="${escapeHtml(member.name)}" style="background:${member.color || "#2563eb"}">${escapeHtml(initials)}</span>`;
}

function parseLabels(value) {
  return value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeLabels(labels) {
  if (!labels) return [];
  if (Array.isArray(labels)) return labels;
  if (typeof labels === "string") {
    try {
      const parsed = JSON.parse(labels);
      return Array.isArray(parsed) ? parsed : parseLabels(labels);
    } catch {
      return parseLabels(labels);
    }
  }
  return [];
}

function getDueState(dateValue) {
  if (!dateValue) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateValue}T00:00:00`);
  const diffDays = Math.ceil((due - today) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "soon";
  return "normal";
}

function formatDueDate(dateValue, stateName) {
  const formatted = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${dateValue}T00:00:00`));
  if (stateName === "overdue") return `Overdue ${formatted}`;
  if (stateName === "soon") return `Due ${formatted}`;
  return formatted;
}

function formatTimestamp(value) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function columnTitle(status) {
  return COLUMNS.find((column) => column.id === status)?.title || "Unknown";
}

function memberName(id) {
  if (!id) return "Unassigned";
  return state.members.find((member) => member.id === id)?.name || "Unknown member";
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
