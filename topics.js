const topicGrid = document.getElementById("topicGrid");
const topicCountLabel = document.getElementById("topicCountLabel");

const topics = Array.isArray(window.TOPIC_DATA) ? window.TOPIC_DATA : [];
topicCountLabel.textContent = `${topics.length} topics`;

if (!topics.length) {
  topicGrid.innerHTML = '<div class="empty">No topics available.</div>';
} else {
  topicGrid.innerHTML = topics
    .map(
      (topic) => `
      <article class="card topic-card">
        <div class="card-head">
          <h3 class="card-title">${escapeHtml(topic.name)}</h3>
          <span class="pill type-pill">Topic</span>
        </div>
        <p class="card-meta">${escapeHtml(topic.summary)}</p>
        <div class="card-controls">
          <a class="btn btn-primary btn-small" href="topic.html?topic=${encodeURIComponent(topic.slug)}">Open Guide</a>
          <a class="btn btn-ghost btn-small" href="${topic.tagUrl}" target="_blank" rel="noopener noreferrer">Tag Page</a>
        </div>
      </article>
    `
    )
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
