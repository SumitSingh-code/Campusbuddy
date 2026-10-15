module.exports=[71644,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(19032);let e=[{name:"Sumit Singh",role:"Founder & Developer",dept:"CRSU, Jind",detail:"Ideated, designed, and built the entire Unigram platform from scratch to connect CRSU students.",initials:"SS",color:"#D4AF37",badge:"👑"}],f=`
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
`;a.s(["default",0,function(){let[a,g]=(0,c.useState)([]),[h,i]=(0,c.useState)(!0);return(0,c.useEffect)(()=>{d.f.get("/contributors").then(a=>g(a.data?.length?a.data:e)).catch(()=>g(e)).finally(()=>i(!1))},[]),(0,b.jsxs)("div",{className:"wall-page",children:[(0,b.jsxs)("div",{className:"wall-hero",children:[(0,b.jsx)("div",{className:"wall-trophy",children:"🏆"}),(0,b.jsx)("h1",{className:"wall-title",children:"Contribution Wall"}),(0,b.jsx)("p",{className:"wall-sub",children:"The people who built Unigram"})]}),h?(0,b.jsx)("div",{className:"wall-loading",children:[void 0,void 0].map((a,c)=>(0,b.jsx)("div",{className:"wall-skeleton skeleton-pulse"},c))}):(0,b.jsx)("div",{className:"wall-list",children:a.map((a,c)=>(0,b.jsxs)("div",{className:"wall-card",style:{animationDelay:`${.08*c}s`},children:[(0,b.jsxs)("div",{className:"wall-avatar",style:{background:`${a.color}22`,borderColor:`${a.color}44`,color:a.color},children:[a.initials,(0,b.jsx)("span",{className:"wall-badge",children:a.badge})]}),(0,b.jsxs)("div",{className:"wall-info",children:[(0,b.jsx)("div",{className:"wall-name",children:a.name}),(0,b.jsx)("div",{className:"wall-role",style:{color:a.color},children:a.role}),(0,b.jsx)("div",{className:"wall-dept",children:a.dept}),(0,b.jsx)("p",{className:"wall-detail",children:a.detail})]})]},a.id||c))}),(0,b.jsxs)("div",{className:"wall-footer",children:[(0,b.jsx)("p",{children:"Want to contribute to Unigram?"}),(0,b.jsx)("a",{href:"mailto:grievance@unigram.app",className:"wall-contact-link",children:"grievance@unigram.app"})]}),(0,b.jsx)("style",{children:f})]})}])}];

//# sourceMappingURL=src_app_%28main%29_wall_page_tsx_0200iexel2mpe._.js.map