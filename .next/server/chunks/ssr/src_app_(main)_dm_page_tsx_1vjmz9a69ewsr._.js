module.exports=[8534,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(33540),f=a.i(74215),g=a.i(44597),h=a.i(3512),i=a.i(60721),j=a.i(19032),k=a.i(66812),l=a.i(23292);let m=`
.dm-page { max-width: 600px; margin: 0 auto; min-height: 100%; }

.dm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1rem 0.5rem;
  position: sticky; top: 52px; background: var(--bg); z-index: 10;
  border-bottom: 1px solid var(--border);
}
.dm-title { font-size: 1.125rem; font-weight: 700; color: var(--ink); }
.dm-new-btn {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: var(--accent); color: var(--bg); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: opacity .15s;
}
.dm-new-btn:active { opacity: .75; }

.dm-list { display: flex; flex-direction: column; }
.dm-row {
  display: flex; align-items: center; gap: .85rem;
  padding: .85rem 1rem; border: none; background: transparent;
  cursor: pointer; text-align: left; width: 100%;
  border-bottom: 1px solid var(--border); transition: background .12s;
}
.dm-row:active, .dm-row:hover { background: var(--surface); }
.dm-row--unread { background: rgba(var(--accent-rgb, 212,175,55),.04); }

.dm-avatar {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  position: relative; background: var(--surface2);
  display: flex; align-items: center; justify-content: center;
}
.dm-avatar-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
.dm-avatar-initials { font-size: .9rem; font-weight: 700; color: var(--accent); }
.dm-unread-dot {
  position: absolute; top: 1px; right: 1px;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); border: 2px solid var(--bg);
}

.dm-row-content { flex: 1; min-width: 0; }
.dm-row-top { display: flex; justify-content: space-between; align-items: baseline; gap: .5rem; }
.dm-row-name { font-weight: 600; font-size: .9rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-row-time { font-size: .72rem; color: var(--ink-muted); flex-shrink: 0; }
.dm-row-preview { font-size: .8125rem; color: var(--ink-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: .1rem; }
.dm-row-dept { font-size: .7rem; color: var(--ink-muted); margin-top: .15rem; }

.dm-unread-badge {
  background: var(--accent); color: var(--bg);
  font-size: .68rem; font-weight: 700; border-radius: 99px;
  padding: 1px 6px; flex-shrink: 0;
}

.dm-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: .85rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center;
}
.dm-start-btn {
  background: var(--accent); color: var(--bg); border: none; border-radius: 10px;
  padding: .65rem 1.25rem; font-weight: 700; font-size: .875rem; cursor: pointer;
  margin-top: .5rem; transition: opacity .15s;
}
.dm-start-btn:active { opacity: .75; }
.dm-error { padding: 2rem 1rem; color: var(--danger); text-align: center; }

/* Skeletons */
.dm-skeleton-row { display: flex; gap: .85rem; padding: .85rem 1rem; border-bottom: 1px solid var(--border); }
.dm-skeleton-avatar { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; }
.dm-skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: .5rem; justify-content: center; }
.dm-skeleton-line { height: 14px; border-radius: 6px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* New conversation sheet */
.dm-sheet-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
  animation: dmsOverIn .2s ease;
}
@keyframes dmsOverIn { from{opacity:0} to{opacity:1} }
.dm-sheet {
  background: var(--surface); border-radius: 18px 18px 0 0;
  width: 100%; max-width: 600px;
  max-height: 80dvh; display: flex; flex-direction: column;
  animation: dmsIn .25s ease;
}
@keyframes dmsIn { from{transform:translateY(40px);opacity:0} to{transform:none;opacity:1} }
.dm-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: var(--border); margin: .75rem auto .25rem;
}
.dm-sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .5rem 1rem .75rem;
}
.dm-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.dm-sheet-close {
  width: 30px; height: 30px; border: none; border-radius: 50%;
  background: var(--surface2); color: var(--ink-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.dm-search-wrap {
  position: relative; margin: 0 1rem .75rem;
  display: flex; align-items: center;
  background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 0 .75rem;
}
.dm-search-icon { color: var(--ink-muted); flex-shrink: 0; }
.dm-search-input {
  flex: 1; background: transparent; border: none; outline: none;
  padding: .7rem .5rem; font-size: .9rem; color: var(--ink);
}
.dm-search-clear { background: none; border: none; color: var(--ink-muted); cursor: pointer; padding: 0; display: flex; }

.dm-search-results { flex: 1; overflow-y: auto; padding: 0 0 env(safe-area-inset-bottom, 1rem); }
.dm-search-loading, .dm-search-empty { padding: 1.5rem; text-align: center; color: var(--ink-muted); font-size: .875rem; }
.dm-search-hint { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 2.5rem 1rem; color: var(--ink-muted); text-align: center; }
.dm-search-hint p { font-size: .875rem; }

.dm-search-row {
  display: flex; align-items: center; gap: .85rem;
  width: 100%; padding: .75rem 1rem;
  border: none; background: transparent; cursor: pointer;
  text-align: left; border-bottom: 1px solid var(--border);
  transition: background .12s;
}
.dm-search-row:active, .dm-search-row:hover { background: var(--surface2); }
.dm-search-row:disabled { opacity: .6; cursor: not-allowed; }
.dm-search-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.dm-search-info { flex: 1; min-width: 0; }
.dm-search-name { font-weight: 600; font-size: .875rem; color: var(--ink); }
.dm-search-meta { display: flex; gap: .5rem; font-size: .75rem; color: var(--ink-muted); margin-top: .1rem; }

.dm-spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
`;a.s(["default",0,function(){let{user:a}=(0,i.useAuth)(),n=(0,d.useRouter)(),[o,p]=(0,c.useState)([]),[q,r]=(0,c.useState)(!0),[s,t]=(0,c.useState)(""),[u,v]=(0,c.useState)(!1),[w,x]=(0,c.useState)(""),[y,z]=(0,c.useState)([]),[A,B]=(0,c.useState)(!1),[C,D]=(0,c.useState)(null),E=(0,c.useRef)(null),F=(0,c.useRef)(null),G=(0,c.useCallback)(async()=>{try{let a=await j.f.get("/dm");p(a.data||[])}catch(a){t(a.message||"Failed to load conversations")}finally{r(!1)}},[]);async function H(a){D(a);try{let b=await j.f.post("/dm/start",{other_user_id:a}),c=b.data?.id;if(!c)throw Error("No conversation ID returned");n.push(`/dm/${c}`)}catch(a){l.toast.error(a.message||"Failed to start conversation"),D(null)}}function I(a){return a.split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase()}return((0,c.useEffect)(()=>{G()},[G]),(0,c.useEffect)(()=>{if(u)return w.trim()?(F.current&&clearTimeout(F.current),F.current=setTimeout(async()=>{B(!0);try{let b=await j.f.get(`/profile/search?q=${encodeURIComponent(w.trim())}`);z((b.data||[]).filter(b=>b.id!==a?.id))}catch{}finally{B(!1)}},350),()=>{F.current&&clearTimeout(F.current)}):void z([])},[w,u,a?.id]),(0,c.useEffect)(()=>{u&&setTimeout(()=>E.current?.focus(),120)},[u]),q)?(0,b.jsxs)("div",{className:"dm-page",children:[[void 0,void 0,void 0,void 0,void 0].map((a,c)=>(0,b.jsxs)("div",{className:"dm-skeleton-row",children:[(0,b.jsx)("div",{className:"dm-skeleton-avatar skeleton-pulse"}),(0,b.jsxs)("div",{className:"dm-skeleton-lines",children:[(0,b.jsx)("div",{className:"dm-skeleton-line skeleton-pulse",style:{width:"60%"}}),(0,b.jsx)("div",{className:"dm-skeleton-line skeleton-pulse",style:{width:"40%",height:"12px"}})]})]},c)),(0,b.jsx)("style",{children:m})]}):(0,b.jsxs)("div",{className:"dm-page",children:[(0,b.jsxs)("div",{className:"dm-header",children:[(0,b.jsx)("h1",{className:"dm-title",children:"Messages"}),(0,b.jsx)("button",{className:"dm-new-btn",onClick:()=>v(!0),"aria-label":"New message",children:(0,b.jsx)(h.f,{size:20})})]}),s?(0,b.jsx)("div",{className:"dm-error",children:s}):0===o.length?(0,b.jsxs)("div",{className:"dm-empty",children:[(0,b.jsx)(g.f,{size:40,strokeWidth:1.2}),(0,b.jsx)("p",{children:"No conversations yet"}),(0,b.jsx)("button",{className:"dm-start-btn",onClick:()=>v(!0),children:"Start a conversation"})]}):(0,b.jsx)("div",{className:"dm-list",children:o.map(c=>{let d=c.other_user,e=c.last_message,f=c.unread_count>0;return(0,b.jsxs)("button",{className:`dm-row${f?" dm-row--unread":""}`,onClick:()=>n.push(`/dm/${c.id}`),children:[(0,b.jsxs)("div",{className:"dm-avatar",children:[d.avatar_url?(0,b.jsx)("img",{src:d.avatar_url,alt:d.full_name,className:"dm-avatar-img"}):(0,b.jsx)("span",{className:"dm-avatar-initials",children:I(d.full_name)}),f&&(0,b.jsx)("span",{className:"dm-unread-dot"})]}),(0,b.jsxs)("div",{className:"dm-row-content",children:[(0,b.jsxs)("div",{className:"dm-row-top",children:[(0,b.jsx)("span",{className:"dm-row-name",children:d.full_name}),e&&(0,b.jsx)("span",{className:"dm-row-time",children:(0,k.f)(e.created_at)})]}),(0,b.jsx)("div",{className:"dm-row-preview",children:e?(e.sender_id===a?.id?"You: ":"")+e.content:(0,b.jsx)("em",{children:"No messages yet"})}),d.department&&(0,b.jsx)("div",{className:"dm-row-dept",children:d.department})]}),f&&c.unread_count>0&&(0,b.jsx)("span",{className:"dm-unread-badge",children:c.unread_count>99?"99+":c.unread_count})]},c.id)})}),u&&(0,b.jsx)("div",{className:"dm-sheet-overlay",onClick:a=>{a.target===a.currentTarget&&v(!1)},children:(0,b.jsxs)("div",{className:"dm-sheet",children:[(0,b.jsx)("div",{className:"dm-sheet-handle"}),(0,b.jsxs)("div",{className:"dm-sheet-header",children:[(0,b.jsx)("h2",{className:"dm-sheet-title",children:"New Message"}),(0,b.jsx)("button",{className:"dm-sheet-close",onClick:()=>v(!1),children:(0,b.jsx)(f.X,{size:18})})]}),(0,b.jsxs)("div",{className:"dm-search-wrap",children:[(0,b.jsx)(e.f,{size:16,className:"dm-search-icon"}),(0,b.jsx)("input",{ref:E,type:"text",className:"dm-search-input",placeholder:"Search by name or roll number…",value:w,onChange:a=>x(a.target.value)}),w&&(0,b.jsx)("button",{className:"dm-search-clear",onClick:()=>x(""),children:(0,b.jsx)(f.X,{size:14})})]}),(0,b.jsxs)("div",{className:"dm-search-results",children:[A&&(0,b.jsx)("div",{className:"dm-search-loading",children:"Searching…"}),!A&&w&&0===y.length&&(0,b.jsx)("div",{className:"dm-search-empty",children:"No students found"}),!A&&y.map(a=>(0,b.jsxs)("button",{className:"dm-search-row",onClick:()=>H(a.id),disabled:C===a.id,children:[(0,b.jsx)("div",{className:"dm-search-avatar",children:a.avatar_url?(0,b.jsx)("img",{src:a.avatar_url,alt:a.full_name,className:"dm-avatar-img"}):(0,b.jsx)("span",{className:"dm-avatar-initials",children:I(a.full_name)})}),(0,b.jsxs)("div",{className:"dm-search-info",children:[(0,b.jsx)("div",{className:"dm-search-name",children:a.full_name}),(0,b.jsxs)("div",{className:"dm-search-meta",children:[a.roll_number&&(0,b.jsx)("span",{children:a.roll_number}),a.department&&(0,b.jsx)("span",{children:a.department})]})]}),C===a.id&&(0,b.jsx)("div",{className:"dm-spinner"})]},a.id)),!w&&(0,b.jsxs)("div",{className:"dm-search-hint",children:[(0,b.jsx)(e.f,{size:28,strokeWidth:1.2}),(0,b.jsx)("p",{children:"Search for a student to start chatting"})]})]})]})}),(0,b.jsx)("style",{children:m})]})}])}];

//# sourceMappingURL=src_app_%28main%29_dm_page_tsx_1vjmz9a69ewsr._.js.map