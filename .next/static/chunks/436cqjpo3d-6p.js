(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,56420,e=>{var t=e.i(71645);let r=(...e)=>e.filter((e,t,r)=>!!e&&""!==e.trim()&&r.indexOf(e)===t).join(" ").trim(),a={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"},i=(0,t.createContext)({}),s=(0,t.forwardRef)(({color:e,size:s,width:n,height:d,strokeWidth:o,absoluteStrokeWidth:l,nonScalingStroke:c,className:h="",children:m,iconNode:u=[],icon:p={node:u,aliases:[],size:24},...f},g)=>{let{size:x=24,strokeWidth:b=2,absoluteStrokeWidth:v=!1,nonScalingStroke:w=!1,color:k="currentColor",className:y=""}=(0,t.useContext)(i)??{},j=!!m||(e=>{for(let t in e)if(t.startsWith("aria-")||"role"===t||"title"===t)return!0;return!1})(f),[N,z,S=[]]=function(e,t={}){return function(e,t={}){let i=t.attributeNames??{},s=e=>i[e]??e,n=e.size??e.width??a.width,d=e.size??e.height??a.height,o=e.aliases?.filter(e=>"string"==typeof e&&""!==e.trim()).map(e=>`lucide-${e}`)??[],l=[...e.name?[`lucide-${e.name}`]:[],...o],c=t.className?.split(" ").filter(Boolean)??[],h=!1===t.includeDefaultClasses?r(...c):r("lucide",...l,...c),m=t.absoluteStrokeWidth?Number(t.strokeWidth??a["stroke-width"])*Number(e.size??e.width??a.width)/Number(t.size??t.width??a.width):t.strokeWidth??a["stroke-width"];return["svg",{...Object.entries(a).reduce((e,[t,r])=>(e[s(t)]=r,e),{}),..."color"in t&&t.color&&{[s("stroke")]:t.color},..."size"in t&&null!=t.size&&{[s("width")]:t.size,[s("height")]:t.size},..."width"in t&&null!=t.width&&{[s("width")]:t.width},..."height"in t&&null!=t.height&&{[s("height")]:t.height},[s("stroke-width")]:m,...h&&{[s("class")]:h},[s("viewBox")]:`0 0 ${n} ${d}`,...!1===t.hasA11yProp?{[s("aria-hidden")]:"true"}:{},..."attributes"in t&&t.attributes},e.node.map(e=>{let[r,a,i]=e,n=t.nonScalingStroke?{[s("vector-effect")]:"non-scaling-stroke",...a}:a;return i?[r,n,i]:[r,n]})]}(e,{...t,attributeNames:{...t.attributeNames,class:"className","stroke-width":"strokeWidth","stroke-linecap":"strokeLinecap","stroke-linejoin":"strokeLinejoin","vector-effect":"vectorEffect"}})}(p,{color:e??k,width:n??s??x,height:d??s??x,strokeWidth:o??b,absoluteStrokeWidth:l??v,nonScalingStroke:c??w,className:r(y,h),hasA11yProp:j,attributes:f});return(0,t.createElement)(N,{ref:g,...z},[...S.map(([e,r])=>(0,t.createElement)(e,r)),...Array.isArray(m)?m:[m]])});e.s(["f",0,function(e,r=[],a=[]){let i,n="string"==typeof e?function(e,t,r=[]){if(null==t)throw Error("[lucide]: iconNode is required when icon name is used");return{name:e?.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),size:24,node:t,...r.length>0?{aliases:r}:{}}}(e,r,a):e,d=(0,t.forwardRef)(({className:e,...r},a)=>(0,t.createElement)(s,{ref:a,icon:n,className:e,...r}));return n.name&&(d.displayName=(i=(e=>{let t="",r=!1;for(let a of e){if("-"===a||"_"===a||a<=" "){r=t.length>0;continue}0===t.length?t+=a.toLowerCase():t+=r?a.toUpperCase():a,r=!1}return t})(n.name)).charAt(0).toUpperCase()+i.slice(1)),d}],56420)},11241,e=>{var t=e.i(56420);let r={name:"arrow-left",size:24,node:[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]};r.node;let a=(0,t.f)(r);e.s(["f",0,a],11241)},30274,e=>{var t=e.i(56420);let r={name:"send",size:24,node:[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]};r.node;let a=(0,t.f)(r);e.s(["f",0,a],30274)},88880,e=>{var t=e.i(43476),r=e.i(71645),a=e.i(18566),i=e.i(11241),s=e.i(30274),n=e.i(56420);let d={name:"loader-circle",size:24,node:[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],aliases:["loader-2"]};d.node;let o=(0,n.f)(d);var l=e.i(94690),c=e.i(9165),h=e.i(7471),m=e.i(27465),u=e.i(46696);let p=`
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
`;e.s(["default",0,function(){let e,{conversationId:n}=(0,a.useParams)(),{user:d}=(0,l.useAuth)(),f=(0,a.useRouter)(),[g,x]=(0,r.useState)(null),[b,v]=(0,r.useState)([]),[w,k]=(0,r.useState)(!0),[y,j]=(0,r.useState)(!1),[N,z]=(0,r.useState)(""),S=(0,r.useRef)(null),_=(0,r.useRef)(null),$=(0,r.useRef)(null),C=(0,r.useCallback)((e=!1)=>{S.current?.scrollIntoView({behavior:e?"smooth":"instant"})},[]);async function E(){let e=N.trim();if(!e||y)return;j(!0),z(""),_.current?.focus();let t=`temp-${Date.now()}`,r={id:t,conversation_id:n,sender_id:d.id,content:e,created_at:new Date().toISOString()};v(e=>[...e,r]),setTimeout(()=>C(!0),50);try{await c.f.post(`/dm/${n}/messages`,{content:e}),v(e=>e.filter(e=>e.id!==t))}catch(r){u.toast.error(r.message||"Failed to send message"),v(e=>e.filter(e=>e.id!==t)),z(e)}finally{j(!1)}}function T(e){return e.split(" ").map(e=>e[0]).join("").slice(0,2).toUpperCase()}(0,r.useEffect)(()=>{let e=!1;return async function(){try{let[t,r]=await Promise.all([c.f.get(`/dm/${n}`),c.f.get(`/dm/${n}/messages`)]);if(e)return;x(t.data||null),v(r.data||[]),c.f.post(`/dm/${n}/read`,{}).catch(()=>{})}catch(t){e||u.toast.error(t.message||"Failed to load conversation")}finally{e||k(!1)}}(),()=>{e=!0}},[n]),(0,r.useEffect)(()=>{w||setTimeout(()=>C(!1),50)},[w,C]),(0,r.useEffect)(()=>{if(!n||!d)return;let e=h.f.channel(`dm-thread-${n}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`conversation_id=eq.${n}`},e=>{let t=e.new;v(e=>e.some(e=>e.id===t.id)?e:[...e,t]),setTimeout(()=>C(!0),50),t.sender_id!==d.id&&c.f.post(`/dm/${n}/read`,{}).catch(()=>{})}).subscribe();return $.current=e,()=>{h.f.removeChannel(e)}},[n,d,C]);let D=g?.other_user;return(0,t.jsxs)("div",{className:"thread-wrap",children:[(0,t.jsxs)("div",{className:"thread-topbar",children:[(0,t.jsx)("button",{className:"thread-back",onClick:()=>f.push("/dm"),children:(0,t.jsx)(i.f,{size:20})}),D?(0,t.jsxs)("div",{className:"thread-user-info",children:[(0,t.jsx)("div",{className:"thread-avatar",children:D.avatar_url?(0,t.jsx)("img",{src:D.avatar_url,alt:D.full_name,className:"thread-avatar-img"}):(0,t.jsx)("span",{className:"thread-avatar-initials",children:T(D.full_name)})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"thread-user-name",children:D.full_name}),D.department&&(0,t.jsx)("div",{className:"thread-user-dept",children:D.department})]})]}):(0,t.jsx)("div",{className:"thread-user-loading"})]}),(0,t.jsxs)("div",{className:"thread-messages",children:[w?(0,t.jsx)("div",{className:"thread-loading",children:(0,t.jsx)(o,{size:24,className:"thread-spinner"})}):0===b.length?(0,t.jsxs)("div",{className:"thread-empty",children:[(0,t.jsx)("p",{children:"No messages yet"}),(0,t.jsx)("span",{children:"Send a message to start the conversation"})]}):(e=[],b.forEach(t=>{let r=new Date(t.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}),a=e[e.length-1];a?.date===r?a.messages.push(t):e.push({date:r,messages:[t]})}),e).map(e=>(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"thread-date-divider",children:e.date}),e.messages.map((r,a)=>{let i=r.sender_id===d?.id,s=e.messages[a-1],n=!i&&(!s||s.sender_id!==r.sender_id);return(0,t.jsxs)("div",{className:`thread-msg-row${i?" thread-msg-row--own":""}`,children:[!i&&(0,t.jsx)("div",{className:"thread-msg-avatar",children:n&&D?.avatar_url?(0,t.jsx)("img",{src:D.avatar_url,alt:"",className:"thread-small-avatar"}):n?(0,t.jsx)("span",{className:"thread-small-initials",children:D?T(D.full_name):"?"}):null}),(0,t.jsxs)("div",{className:"thread-bubble-wrap",children:[(0,t.jsx)("div",{className:`thread-bubble${i?" thread-bubble--own":""}`,children:r.is_deleted?(0,t.jsx)("em",{className:"thread-deleted",children:"This message was deleted"}):r.content}),(0,t.jsxs)("div",{className:`thread-msg-time${i?" thread-msg-time--own":""}`,children:[(0,m.f)(r.created_at),r.id.startsWith("temp-")&&(0,t.jsx)("span",{children:" · Sending…"})]})]})]},r.id)})]},e.date)),(0,t.jsx)("div",{ref:S})]}),(0,t.jsx)("div",{className:"thread-input-area",children:(0,t.jsxs)("div",{className:"thread-input-wrap",children:[(0,t.jsx)("textarea",{ref:_,className:"thread-input",placeholder:"Message…",value:N,onChange:function(e){z(e.target.value);let t=e.target;t.style.height="auto",t.style.height=Math.min(t.scrollHeight,120)+"px"},onKeyDown:function(e){"Enter"!==e.key||e.shiftKey||(e.preventDefault(),E())},rows:1,disabled:y}),(0,t.jsx)("button",{className:"thread-send-btn",onClick:E,disabled:!N.trim()||y,"aria-label":"Send",children:y?(0,t.jsx)(o,{size:18,className:"thread-spinner"}):(0,t.jsx)(s.f,{size:18})})]})}),(0,t.jsx)("style",{children:p})]})}],88880)},27465,e=>{e.s(["f",0,function(e){if(!e)return"";let t=new Date(e),r=(Date.now()-t.getTime())/1e3,a=r/60,i=a/60,s=i/24,n=s/7;return r<60?"just now":a<60?`${Math.floor(a)}m`:i<24?`${Math.floor(i)}h`:s<7?`${Math.floor(s)}d`:n<4?`${Math.floor(n)}w`:t.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"})}])}])})();