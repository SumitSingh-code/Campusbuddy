// Unigram \u2014 Privacy Policy
// Redirects to the standalone HTML page (no login required).

export function render() {
  // Immediately redirect to standalone page
  window.location.replace('/privacy.html');
  return `<div class="empty-state"><div class="spinner"></div></div>`;
}

export function init() {}
export function destroy() {}
