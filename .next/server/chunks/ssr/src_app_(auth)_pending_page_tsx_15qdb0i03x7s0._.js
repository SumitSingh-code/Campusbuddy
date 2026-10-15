module.exports=[19138,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(60721);let f={pending:{icon:"⏳",title:"Account Pending Approval",desc:"Your account is under review. Our admins verify each student manually. This usually takes a few hours.",color:"#D4AF37",bg:"rgba(212,175,55,.1)"},banned:{icon:"🚫",title:"Account Banned",desc:"Your account has been permanently banned for violating our Community Guidelines. If you believe this is a mistake, contact us.",color:"#E85D4E",bg:"rgba(232,93,78,.1)"},rejected:{icon:"❌",title:"Account Rejected",desc:"Your account application was rejected. This may be due to incorrect details. Please contact us if you need help.",color:"#E85D4E",bg:"rgba(232,93,78,.1)"},suspended:{icon:"⚠️",title:"Account Suspended",desc:"Your account has been temporarily suspended. Please contact us to understand the reason and resolve the issue.",color:"#D4AF37",bg:"rgba(212,175,55,.1)"}},g=`
.pending-page {
  min-height: 100dvh; background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.pending-card {
  width: 100%; max-width: 400px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 2rem 1.75rem;
  text-align: center;
  animation: pcIn .3s ease;
}
@keyframes pcIn { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none} }

.pending-icon-wrap {
  width: 72px; height: 72px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.pending-icon { font-size: 2.25rem; }
.pending-title { font-size: 1.2rem; font-weight: 800; margin: 0 0 .65rem; }
.pending-desc { font-size: .8375rem; color: var(--ink-muted); line-height: 1.6; margin-bottom: 1.5rem; }

.pending-profile-info {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 12px; padding: .85rem; margin-bottom: 1.5rem;
  text-align: left;
}
.pending-profile-row { display: flex; justify-content: space-between; align-items: center; padding: .35rem 0; border-bottom: 1px solid var(--border); }
.pending-profile-row:last-child { border-bottom: none; }
.pending-profile-label { font-size: .75rem; color: var(--ink-muted); }
.pending-profile-value { font-size: .8125rem; font-weight: 600; color: var(--ink); }

.pending-steps { display: flex; flex-direction: column; gap: .75rem; margin-bottom: 1.5rem; text-align: left; }
.pending-step { display: flex; align-items: center; gap: .75rem; font-size: .8125rem; color: var(--ink-muted); }
.pending-step--done { color: #50C878; }
.pending-step--active { color: var(--accent); font-weight: 600; }
.pending-step-dot { width: 10px; height: 10px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

.pending-contact { margin-bottom: 1.5rem; }
.pending-contact p { font-size: .78rem; color: var(--ink-muted); margin-bottom: .25rem; }
.pending-contact-link { color: var(--accent); font-size: .8125rem; font-weight: 600; text-decoration: none; }

.pending-signout-btn {
  width: 100%; padding: .75rem;
  background: transparent; border: 1.5px solid var(--border);
  color: var(--ink-muted); border-radius: 12px;
  font-size: .875rem; font-weight: 600; cursor: pointer;
  transition: border-color .15s;
}
.pending-signout-btn:hover { border-color: var(--ink-muted); }
`;a.s(["default",0,function(){let{profile:a,signOut:h}=(0,e.useAuth)(),i=(0,d.useRouter)(),j=a?.status||"pending",k=f[j]||f.pending;return(0,c.useEffect)(()=>{a?.status==="active"&&i.replace("/feed")},[a,i]),(0,b.jsxs)("div",{className:"pending-page",children:[(0,b.jsxs)("div",{className:"pending-card",children:[(0,b.jsx)("div",{className:"pending-icon-wrap",style:{background:k.bg},children:(0,b.jsx)("span",{className:"pending-icon",children:k.icon})}),(0,b.jsx)("h1",{className:"pending-title",style:{color:k.color},children:k.title}),(0,b.jsx)("p",{className:"pending-desc",children:k.desc}),a&&(0,b.jsxs)("div",{className:"pending-profile-info",children:[(0,b.jsxs)("div",{className:"pending-profile-row",children:[(0,b.jsx)("span",{className:"pending-profile-label",children:"Name"}),(0,b.jsx)("span",{className:"pending-profile-value",children:a.full_name})]}),(0,b.jsxs)("div",{className:"pending-profile-row",children:[(0,b.jsx)("span",{className:"pending-profile-label",children:"Roll No."}),(0,b.jsx)("span",{className:"pending-profile-value",children:a.roll_number})]}),(0,b.jsxs)("div",{className:"pending-profile-row",children:[(0,b.jsx)("span",{className:"pending-profile-label",children:"Department"}),(0,b.jsx)("span",{className:"pending-profile-value",children:a.department})]})]}),"pending"===j&&(0,b.jsxs)("div",{className:"pending-steps",children:[(0,b.jsxs)("div",{className:"pending-step pending-step--done",children:[(0,b.jsx)("div",{className:"pending-step-dot"}),(0,b.jsx)("span",{children:"Account created"})]}),(0,b.jsxs)("div",{className:"pending-step pending-step--active",children:[(0,b.jsx)("div",{className:"pending-step-dot"}),(0,b.jsx)("span",{children:"Admin review (in progress)"})]}),(0,b.jsxs)("div",{className:"pending-step",children:[(0,b.jsx)("div",{className:"pending-step-dot"}),(0,b.jsx)("span",{children:"Access granted"})]})]}),(0,b.jsxs)("div",{className:"pending-contact",children:[(0,b.jsx)("p",{children:"Need help?"}),(0,b.jsx)("a",{href:"mailto:grievance@unigram.app",className:"pending-contact-link",children:"grievance@unigram.app"})]}),(0,b.jsx)("button",{className:"pending-signout-btn",onClick:()=>h().then(()=>i.push("/login")),children:"Sign Out"})]}),(0,b.jsx)("style",{children:g})]})}])}];

//# sourceMappingURL=src_app_%28auth%29_pending_page_tsx_15qdb0i03x7s0._.js.map