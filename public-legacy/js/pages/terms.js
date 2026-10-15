// Unigram \u2014 Terms & Conditions
// Redirects to the standalone HTML page (no login required).

export function render() {
  // Immediately redirect to standalone page
  window.location.replace('/terms.html');
  return `<div class="empty-state"><div class="spinner"></div></div>`;
}

export function init() {}
export function destroy() {}
