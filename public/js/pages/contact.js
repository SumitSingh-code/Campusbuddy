// Unigram \u2014 Grievance Redressal
// Redirects to the standalone HTML page (no login required).

export function render() {
  // Immediately redirect to standalone page
  window.location.replace('/contact.html');
  return `<div class="empty-state"><div class="spinner"></div></div>`;
}

export function init() {}
export function destroy() {}
