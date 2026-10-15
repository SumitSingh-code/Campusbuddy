module.exports=[26660,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(83900),e=a.i(3512),f=a.i(74215),g=a.i(51675),h=a.i(60721),i=a.i(19032),j=a.i(66812),k=a.i(26711),l=a.i(23292);let m=["General","Exam","Event","Holiday","Admission","Other"],n=`
.notices-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.notices-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border); }
.notices-title { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.notices-post-btn { display: flex; align-items: center; gap: .4rem; padding: .55rem 1rem; background: var(--accent); color: var(--bg); border: none; border-radius: 9px; font-size: .8125rem; font-weight: 700; cursor: pointer; }

.notices-filters { display: flex; gap: .45rem; padding: .75rem 1rem; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.notices-filters::-webkit-scrollbar { display: none; }
.notices-chip { flex-shrink: 0; padding: .4rem .85rem; border-radius: 99px; border: 1.5px solid var(--border); background: transparent; color: var(--ink-muted); font-size: .78rem; font-weight: 600; cursor: pointer; }
.notices-chip.active { border-color: var(--accent); background: rgba(212,175,55,.1); color: var(--accent); }

.notices-loading { display: flex; flex-direction: column; gap: .75rem; padding: .75rem 1rem; }
.notices-skeleton { height: 110px; border-radius: 14px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.notices-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center; }
.notices-empty p { font-size: .875rem; }

.notices-list { display: flex; flex-direction: column; gap: .75rem; padding: .75rem 1rem; }
.notice-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1rem; }
.notice-top { display: flex; align-items: center; gap: .5rem; margin-bottom: .65rem; }
.notice-cat-icon { font-size: 1.1rem; }
.notice-meta-wrap { flex: 1; display: flex; gap: .5rem; align-items: center; }
.notice-cat-badge { font-size: .7rem; font-weight: 600; background: var(--surface2); border-radius: 4px; padding: .15rem .45rem; color: var(--ink-muted); }
.notice-time { font-size: .7rem; color: var(--ink-muted); }
.notice-delete-btn { width: 28px; height: 28px; border: none; background: transparent; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 6px; }

.notice-title { font-size: .9375rem; font-weight: 700; color: var(--ink); margin: 0 0 .45rem; }
.notice-content { font-size: .8375rem; color: var(--ink-muted); line-height: 1.55; margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; cursor: pointer; }
.notice-content.expanded { display: block; -webkit-line-clamp: unset; }
.notice-read-more { background: none; border: none; color: var(--accent); font-size: .78rem; font-weight: 600; cursor: pointer; padding: .2rem 0; }
.notice-attachment { display: inline-flex; align-items: center; gap: .35rem; font-size: .78rem; color: var(--accent); text-decoration: none; margin-top: .5rem; font-weight: 600; }
.notice-poster { font-size: .7rem; color: var(--ink-muted); margin-top: .65rem; }

/* Sheet */
.notices-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.notices-sheet { background: var(--surface); border-radius: 18px 18px 0 0; width: 100%; max-width: 600px; animation: ncIn .25s ease; }
@keyframes ncIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.notices-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.notices-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.notices-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.notices-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.notices-form { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: .65rem; }
.notices-label { font-size: .78rem; font-weight: 600; color: var(--ink-muted); }
.notices-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: .65rem .85rem; font-size: .875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.notices-input:focus { border-color: var(--accent); }
.notices-textarea { resize: none; }
.notices-submit-btn { width: 100%; padding: .8rem; background: var(--accent); color: var(--bg); border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700; cursor: pointer; }
.notices-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
`;a.s(["default",0,function(){let{isAdmin:a}=(0,h.useAuth)(),[o,p]=(0,c.useState)([]),[q,r]=(0,c.useState)(!0),[s,t]=(0,c.useState)("All"),[u,v]=(0,c.useState)(!1),[w,x]=(0,c.useState)(""),[y,z]=(0,c.useState)(""),[A,B]=(0,c.useState)("General"),[C,D]=(0,c.useState)(!1),[E,F]=(0,c.useState)(null),[G,H]=(0,c.useState)(null);async function I(){r(!0);try{let a="All"!==s?`?category=${encodeURIComponent(s)}`:"",b=await i.f.get(`/notices${a}`);p(b.data||[])}catch(a){l.toast.error(a.message||"Failed to load notices")}finally{r(!1)}}async function J(){if(!w.trim()||!y.trim())return void l.toast.error("Title and content are required");D(!0);try{let a=await i.f.post("/notices",{title:w.trim(),content:y.trim(),category:A});p(b=>[a.data,...b]),v(!1),x(""),z(""),B("General"),l.toast.success("Notice posted")}catch(a){l.toast.error(a.message)}finally{D(!1)}}async function K(){if(E){try{await i.f.delete(`/notices/${E}`),p(a=>a.filter(a=>a.id!==E)),l.toast.success("Notice deleted")}catch(a){l.toast.error(a.message)}F(null)}}return(0,c.useEffect)(()=>{I()},[s]),(0,b.jsxs)("div",{className:"notices-page",children:[(0,b.jsxs)("div",{className:"notices-header",children:[(0,b.jsx)("h1",{className:"notices-title",children:"📢 Notices"}),a&&(0,b.jsxs)("button",{className:"notices-post-btn",onClick:()=>v(!0),children:[(0,b.jsx)(e.f,{size:15})," Post"]})]}),(0,b.jsx)("div",{className:"notices-filters",children:["All",...m].map(a=>(0,b.jsx)("button",{className:`notices-chip${s===a?" active":""}`,onClick:()=>t(a),children:a},a))}),q?(0,b.jsx)("div",{className:"notices-loading",children:[void 0,void 0,void 0].map((a,c)=>(0,b.jsx)("div",{className:"notices-skeleton skeleton-pulse"},c))}):0===o.length?(0,b.jsxs)("div",{className:"notices-empty",children:[(0,b.jsx)(d.f,{size:36,strokeWidth:1.2}),(0,b.jsx)("p",{children:"No notices yet"})]}):(0,b.jsx)("div",{className:"notices-list",children:o.map(c=>(0,b.jsxs)("div",{className:"notice-card",children:[(0,b.jsxs)("div",{className:"notice-top",children:[(0,b.jsx)("span",{className:"notice-cat-icon",children:{General:"📢",Exam:"📝",Event:"🎉",Holiday:"🏖️",Admission:"🎓",Other:"📌"}[c.category]||"📌"}),(0,b.jsxs)("div",{className:"notice-meta-wrap",children:[(0,b.jsx)("span",{className:"notice-cat-badge",children:c.category}),(0,b.jsx)("span",{className:"notice-time",children:(0,j.f)(c.created_at)})]}),a&&(0,b.jsx)("button",{className:"notice-delete-btn",onClick:()=>F(c.id),children:(0,b.jsx)(g.f,{size:14})})]}),(0,b.jsx)("h2",{className:"notice-title",children:c.title}),(0,b.jsx)("p",{className:`notice-content${G===c.id?" expanded":""}`,onClick:()=>H(G===c.id?null:c.id),children:c.content}),c.content.length>120&&(0,b.jsx)("button",{className:"notice-read-more",onClick:()=>H(G===c.id?null:c.id),children:G===c.id?"Show less":"Read more"}),c.attachment_url&&(0,b.jsx)("a",{href:c.attachment_url,target:"_blank",rel:"noopener noreferrer",className:"notice-attachment",children:"📎 View Attachment"}),(0,b.jsxs)("div",{className:"notice-poster",children:["Posted by ",c.poster_name||"Admin"]})]},c.id))}),u&&(0,b.jsx)("div",{className:"notices-overlay",onClick:a=>{a.target===a.currentTarget&&v(!1)},children:(0,b.jsxs)("div",{className:"notices-sheet",children:[(0,b.jsx)("div",{className:"notices-sheet-handle"}),(0,b.jsxs)("div",{className:"notices-sheet-header",children:[(0,b.jsx)("h2",{className:"notices-sheet-title",children:"Post Notice"}),(0,b.jsx)("button",{className:"notices-sheet-close",onClick:()=>v(!1),children:(0,b.jsx)(f.X,{size:18})})]}),(0,b.jsxs)("div",{className:"notices-form",children:[(0,b.jsx)("label",{className:"notices-label",children:"Title *"}),(0,b.jsx)("input",{className:"notices-input",placeholder:"Notice title",value:w,onChange:a=>x(a.target.value),maxLength:200}),(0,b.jsx)("label",{className:"notices-label",children:"Category"}),(0,b.jsx)("select",{className:"notices-input",value:A,onChange:a=>B(a.target.value),children:m.map(a=>(0,b.jsx)("option",{children:a},a))}),(0,b.jsx)("label",{className:"notices-label",children:"Content *"}),(0,b.jsx)("textarea",{className:"notices-input notices-textarea",placeholder:"Write the notice…",value:y,onChange:a=>z(a.target.value),rows:5}),(0,b.jsx)("button",{className:"notices-submit-btn",onClick:J,disabled:C,children:C?"Posting…":"Post Notice"})]})]})}),E&&(0,b.jsx)(k.f,{message:"Delete this notice?",confirmLabel:"Delete",onConfirm:K,onCancel:()=>F(null)}),(0,b.jsx)("style",{children:n})]})}])}];

//# sourceMappingURL=src_app_%28main%29_notices_page_tsx_1yzi5n-au3gh4._.js.map