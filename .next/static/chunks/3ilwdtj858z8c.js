(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,98047,e=>{"use strict";var l=e.i(43476),a=e.i(71645),i=e.i(9165);let t=[{name:"Sumit Singh",role:"Founder & Developer",dept:"CRSU, Jind",detail:"Ideated, designed, and built the entire Unigram platform from scratch to connect CRSU students.",initials:"SS",color:"#D4AF37",badge:"👑"}],r=`
.wall-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.wall-hero { text-align: center; padding: 2.5rem 1rem 1.5rem; }
.wall-trophy { font-size: 3rem; margin-bottom: .75rem; }
.wall-title { font-size: 1.5rem; font-weight: 800; color: var(--ink); margin: 0 0 .35rem; letter-spacing: -.03em; }
.wall-sub { font-size: .875rem; color: var(--ink-muted); }

.wall-loading { display: flex; flex-direction: column; gap: .75rem; padding: 0 1rem; }
.wall-skeleton { height: 100px; border-radius: 16px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.wall-list { display: flex; flex-direction: column; gap: .85rem; padding: 0 1rem; }
.wall-card {
  display: flex; gap: 1rem; align-items: flex-start;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 1.1rem;
  animation: wallIn .4s both;
}
@keyframes wallIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none} }

.wall-avatar {
  width: 56px; height: 56px; border-radius: 14px;
  border: 1.5px solid; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.1rem;
  position: relative;
}
.wall-badge {
  position: absolute; bottom: -4px; right: -4px;
  font-size: .85rem; line-height: 1;
}

.wall-info { flex: 1; min-width: 0; }
.wall-name { font-weight: 700; font-size: .9375rem; color: var(--ink); margin-bottom: .1rem; }
.wall-role { font-size: .78rem; font-weight: 600; margin-bottom: .1rem; }
.wall-dept { font-size: .72rem; color: var(--ink-muted); margin-bottom: .4rem; }
.wall-detail { font-size: .8125rem; color: var(--ink-muted); line-height: 1.55; margin: 0; }

.wall-footer { text-align: center; padding: 2rem 1rem 1rem; color: var(--ink-muted); font-size: .8125rem; }
.wall-contact-link { color: var(--accent); font-weight: 600; text-decoration: none; }
`;e.s(["default",0,function(){let[e,n]=(0,a.useState)([]),[o,s]=(0,a.useState)(!0);return(0,a.useEffect)(()=>{i.f.get("/contributors").then(e=>n(e.data?.length?e.data:t)).catch(()=>n(t)).finally(()=>s(!1))},[]),(0,l.jsxs)("div",{className:"wall-page",children:[(0,l.jsxs)("div",{className:"wall-hero",children:[(0,l.jsx)("div",{className:"wall-trophy",children:"🏆"}),(0,l.jsx)("h1",{className:"wall-title",children:"Contribution Wall"}),(0,l.jsx)("p",{className:"wall-sub",children:"The people who built Unigram"})]}),o?(0,l.jsx)("div",{className:"wall-loading",children:[void 0,void 0].map((e,a)=>(0,l.jsx)("div",{className:"wall-skeleton skeleton-pulse"},a))}):(0,l.jsx)("div",{className:"wall-list",children:e.map((e,a)=>(0,l.jsxs)("div",{className:"wall-card",style:{animationDelay:`${.08*a}s`},children:[(0,l.jsxs)("div",{className:"wall-avatar",style:{background:`${e.color}22`,borderColor:`${e.color}44`,color:e.color},children:[e.initials,(0,l.jsx)("span",{className:"wall-badge",children:e.badge})]}),(0,l.jsxs)("div",{className:"wall-info",children:[(0,l.jsx)("div",{className:"wall-name",children:e.name}),(0,l.jsx)("div",{className:"wall-role",style:{color:e.color},children:e.role}),(0,l.jsx)("div",{className:"wall-dept",children:e.dept}),(0,l.jsx)("p",{className:"wall-detail",children:e.detail})]})]},e.id||a))}),(0,l.jsxs)("div",{className:"wall-footer",children:[(0,l.jsx)("p",{children:"Want to contribute to Unigram?"}),(0,l.jsx)("a",{href:"mailto:grievance@unigram.app",className:"wall-contact-link",children:"grievance@unigram.app"})]}),(0,l.jsx)("style",{children:r})]})}])}]);