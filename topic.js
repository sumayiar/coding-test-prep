const params = new URLSearchParams(window.location.search);
const slug = params.get("topic");

const topicName = document.getElementById("topicName");
const topicSummary = document.getElementById("topicSummary");
const tagLink = document.getElementById("tagLink");
const problemLinks = document.getElementById("problemLinks");

const topics = Array.isArray(window.TOPIC_DATA) ? window.TOPIC_DATA : [];
const topic = topics.find((item) => item.slug === slug);

if (!topic) {
  topicName.textContent = "Topic Not Found";
  topicSummary.textContent = "Select a topic from the topic library page.";
  tagLink.style.display = "none";
  problemLinks.innerHTML = '<div class="empty">No topic data found for this link.</div>';
} else {
  document.title = `${topic.name} - LeetTrack`;
  topicName.textContent = topic.name;
  topicSummary.textContent = topic.summary;
  tagLink.href = topic.tagUrl;

  problemLinks.innerHTML = topic.problems
    .map(
      (problem) => `
      <article class="card">
        <div class="card-head">
          <h3 class="card-title">${escapeHtml(problem.title)}</h3>
          <span class="pill difficulty medium">Practice</span>
        </div>
        <div class="card-controls">
          <a class="btn btn-primary btn-small" href="${problem.url}" target="_blank" rel="noopener noreferrer">Open Problem</a>
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
