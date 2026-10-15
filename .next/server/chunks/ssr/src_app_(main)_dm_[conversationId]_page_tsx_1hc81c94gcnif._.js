module.exports=[83864,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(19107),f=a.i(74746),g=a.i(64831);let h={name:"loader-circle",size:24,node:[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],aliases:["loader-2"]};h.node;let i=(0,g.f)(h);var j=a.i(60721),k=a.i(19032),l=a.i(10849),m=a.i(66812),n=a.i(23292);let o=`
.thread-wrap {
  display: flex; flex-direction: column;
  height: calc(100dvh - 52px - 64px);
  max-width: 600px; margin: 0 auto;
}

/* Topbar */
.thread-topbar {
  display: flex; align-items: center; gap: .75rem;
  padding: .65rem 1rem;
  background: var(--bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 52px; z-index: 10; flex-shrink: 0;
}
.thread-back {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: var(--surface); color: var(--ink);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
}
.thread-user-info { display: flex; align-items: center; gap: .65rem; }
.thread-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.thread-avatar-img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
.thread-avatar-initials { font-size: .75rem; font-weight: 700; color: var(--accent); }
.thread-user-name { font-size: .9rem; font-weight: 700; color: var(--ink); }
.thread-user-dept { font-size: .72rem; color: var(--ink-muted); }
.thread-user-loading { height: 18px; width: 120px; border-radius: 6px; background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

/* Messages */
.thread-messages { flex: 1; overflow-y: auto; padding: .75rem .75rem 0; display: flex; flex-direction: column; gap: .25rem; }
.thread-loading { display: flex; justify-content: center; align-items: center; padding: 3rem; }
.thread-spinner { animation: spin .7s linear infinite; color: var(--accent); }
@keyframes spin { to{transform:rotate(360deg)} }
.thread-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .4rem; padding: 3rem 1rem; color: var(--ink-muted); text-align: center; flex: 1; }
.thread-empty p { font-weight: 600; font-size: .875rem; color: var(--ink); }
.thread-empty span { font-size: .8rem; }

.thread-date-divider {
  text-align: center; font-size: .7rem; color: var(--ink-muted);
  margin: .85rem 0 .35rem; letter-spacing: .03em;
  position: relative;
}
.thread-date-divider::before,
.thread-date-divider::after {
  content: ''; position: absolute; top: 50%; width: 28%;
  height: 1px; background: var(--border);
}
.thread-date-divider::before { left: 0; }
.thread-date-divider::after { right: 0; }

.thread-msg-row {
  display: flex; align-items: flex-end; gap: .45rem; margin-bottom: .15rem;
}
.thread-msg-row--own { flex-direction: row-reverse; }
.thread-msg-avatar { width: 24px; flex-shrink: 0; }
.thread-small-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
.thread-small-initials { width: 24px; height: 24px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: .6rem; font-weight: 700; color: var(--accent); }

.thread-bubble-wrap { display: flex; flex-direction: column; max-width: 72%; }
.thread-msg-row--own .thread-bubble-wrap { align-items: flex-end; }

.thread-bubble {
  background: var(--surface); border-radius: 16px 16px 16px 4px;
  padding: .55rem .8rem; font-size: .875rem; color: var(--ink);
  line-height: 1.45; word-break: break-word; white-space: pre-wrap;
}
.thread-bubble--own {
  background: var(--accent); color: var(--bg);
  border-radius: 16px 16px 4px 16px;
}
.thread-deleted { color: var(--ink-muted); font-style: italic; }
.thread-msg-time { font-size: .65rem; color: var(--ink-muted); margin-top: .15rem; padding: 0 .1rem; }
.thread-msg-time--own { text-align: right; }

/* Input */
.thread-input-area {
  padding: .65rem .75rem;
  background: var(--bg); border-top: 1px solid var(--border);
  padding-bottom: calc(.65rem + env(safe-area-inset-bottom, 0));
  flex-shrink: 0;
}
.thread-input-wrap {
  display: flex; align-items: flex-end; gap: .6rem;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; padding: .5rem .5rem .5rem .85rem;
}
.thread-input {
  flex: 1; background: transparent; border: none; outline: none;
  resize: none; font-size: .875rem; color: var(--ink); line-height: 1.45;
  max-height: 120px; font-family: inherit;
}
.thread-input::placeholder { color: var(--ink-muted); }
.thread-send-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--accent); color: var(--bg); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: opacity .15s;
}
.thread-send-btn:disabled { opacity: .45; cursor: not-allowed; }
.thread-send-btn:not(:disabled):active { opacity: .8; }
`;a.s(["default",0,function(){let a,{conversationId:g}=(0,d.useParams)(),{user:h}=(0,j.useAuth)(),p=(0,d.useRouter)(),[q,r]=(0,c.useState)(null),[s,t]=(0,c.useState)([]),[u,v]=(0,c.useState)(!0),[w,x]=(0,c.useState)(!1),[y,z]=(0,c.useState)(""),A=(0,c.useRef)(null),B=(0,c.useRef)(null),C=(0,c.useRef)(null),D=(0,c.useCallback)((a=!1)=>{A.current?.scrollIntoView({behavior:a?"smooth":"instant"})},[]);async function E(){let a=y.trim();if(!a||w)return;x(!0),z(""),B.current?.focus();let b=`temp-${Date.now()}`,c={id:b,conversation_id:g,sender_id:h.id,content:a,created_at:new Date().toISOString()};t(a=>[...a,c]),setTimeout(()=>D(!0),50);try{await k.f.post(`/dm/${g}/messages`,{content:a}),t(a=>a.filter(a=>a.id!==b))}catch(c){n.toast.error(c.message||"Failed to send message"),t(a=>a.filter(a=>a.id!==b)),z(a)}finally{x(!1)}}function F(a){return a.split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase()}(0,c.useEffect)(()=>{let a=!1;return async function(){try{let[b,c]=await Promise.all([k.f.get(`/dm/${g}`),k.f.get(`/dm/${g}/messages`)]);if(a)return;r(b.data||null),t(c.data||[]),k.f.post(`/dm/${g}/read`,{}).catch(()=>{})}catch(b){a||n.toast.error(b.message||"Failed to load conversation")}finally{a||v(!1)}}(),()=>{a=!0}},[g]),(0,c.useEffect)(()=>{u||setTimeout(()=>D(!1),50)},[u,D]),(0,c.useEffect)(()=>{if(!g||!h)return;let a=l.f.channel(`dm-thread-${g}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`conversation_id=eq.${g}`},a=>{let b=a.new;t(a=>a.some(a=>a.id===b.id)?a:[...a,b]),setTimeout(()=>D(!0),50),b.sender_id!==h.id&&k.f.post(`/dm/${g}/read`,{}).catch(()=>{})}).subscribe();return C.current=a,()=>{l.f.removeChannel(a)}},[g,h,D]);let G=q?.other_user;return(0,b.jsxs)("div",{className:"thread-wrap",children:[(0,b.jsxs)("div",{className:"thread-topbar",children:[(0,b.jsx)("button",{className:"thread-back",onClick:()=>p.push("/dm"),children:(0,b.jsx)(e.f,{size:20})}),G?(0,b.jsxs)("div",{className:"thread-user-info",children:[(0,b.jsx)("div",{className:"thread-avatar",children:G.avatar_url?(0,b.jsx)("img",{src:G.avatar_url,alt:G.full_name,className:"thread-avatar-img"}):(0,b.jsx)("span",{className:"thread-avatar-initials",children:F(G.full_name)})}),(0,b.jsxs)("div",{children:[(0,b.jsx)("div",{className:"thread-user-name",children:G.full_name}),G.department&&(0,b.jsx)("div",{className:"thread-user-dept",children:G.department})]})]}):(0,b.jsx)("div",{className:"thread-user-loading"})]}),(0,b.jsxs)("div",{className:"thread-messages",children:[u?(0,b.jsx)("div",{className:"thread-loading",children:(0,b.jsx)(i,{size:24,className:"thread-spinner"})}):0===s.length?(0,b.jsxs)("div",{className:"thread-empty",children:[(0,b.jsx)("p",{children:"No messages yet"}),(0,b.jsx)("span",{children:"Send a message to start the conversation"})]}):(a=[],s.forEach(b=>{let c=new Date(b.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}),d=a[a.length-1];d?.date===c?d.messages.push(b):a.push({date:c,messages:[b]})}),a).map(a=>(0,b.jsxs)("div",{children:[(0,b.jsx)("div",{className:"thread-date-divider",children:a.date}),a.messages.map((c,d)=>{let e=c.sender_id===h?.id,f=a.messages[d-1],g=!e&&(!f||f.sender_id!==c.sender_id);return(0,b.jsxs)("div",{className:`thread-msg-row${e?" thread-msg-row--own":""}`,children:[!e&&(0,b.jsx)("div",{className:"thread-msg-avatar",children:g&&G?.avatar_url?(0,b.jsx)("img",{src:G.avatar_url,alt:"",className:"thread-small-avatar"}):g?(0,b.jsx)("span",{className:"thread-small-initials",children:G?F(G.full_name):"?"}):null}),(0,b.jsxs)("div",{className:"thread-bubble-wrap",children:[(0,b.jsx)("div",{className:`thread-bubble${e?" thread-bubble--own":""}`,children:c.is_deleted?(0,b.jsx)("em",{className:"thread-deleted",children:"This message was deleted"}):c.content}),(0,b.jsxs)("div",{className:`thread-msg-time${e?" thread-msg-time--own":""}`,children:[(0,m.f)(c.created_at),c.id.startsWith("temp-")&&(0,b.jsx)("span",{children:" · Sending…"})]})]})]},c.id)})]},a.date)),(0,b.jsx)("div",{ref:A})]}),(0,b.jsx)("div",{className:"thread-input-area",children:(0,b.jsxs)("div",{className:"thread-input-wrap",children:[(0,b.jsx)("textarea",{ref:B,className:"thread-input",placeholder:"Message…",value:y,onChange:function(a){z(a.target.value);let b=a.target;b.style.height="auto",b.style.height=Math.min(b.scrollHeight,120)+"px"},onKeyDown:function(a){"Enter"!==a.key||a.shiftKey||(a.preventDefault(),E())},rows:1,disabled:w}),(0,b.jsx)("button",{className:"thread-send-btn",onClick:E,disabled:!y.trim()||w,"aria-label":"Send",children:w?(0,b.jsx)(i,{size:18,className:"thread-spinner"}):(0,b.jsx)(f.f,{size:18})})]})}),(0,b.jsx)("style",{children:o})]})}],83864)}];

//# sourceMappingURL=src_app_%28main%29_dm_%5BconversationId%5D_page_tsx_1hc81c94gcnif._.js.map