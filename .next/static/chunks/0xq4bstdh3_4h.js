(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,56420,e=>{var r=e.i(71645);let t=(...e)=>e.filter((e,r,t)=>!!e&&""!==e.trim()&&t.indexOf(e)===r).join(" ").trim(),a={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"},i=(0,r.createContext)({}),s=(0,r.forwardRef)(({color:e,size:s,width:n,height:o,strokeWidth:d,absoluteStrokeWidth:l,nonScalingStroke:c,className:m="",children:h,iconNode:u=[],icon:p={node:u,aliases:[],size:24},...f},x)=>{let{size:g=24,strokeWidth:v=2,absoluteStrokeWidth:b=!1,nonScalingStroke:w=!1,color:k="currentColor",className:y=""}=(0,r.useContext)(i)??{},j=!!h||(e=>{for(let r in e)if(r.startsWith("aria-")||"role"===r||"title"===r)return!0;return!1})(f),[N,z,S=[]]=function(e,r={}){return function(e,r={}){let i=r.attributeNames??{},s=e=>i[e]??e,n=e.size??e.width??a.width,o=e.size??e.height??a.height,d=e.aliases?.filter(e=>"string"==typeof e&&""!==e.trim()).map(e=>`lucide-${e}`)??[],l=[...e.name?[`lucide-${e.name}`]:[],...d],c=r.className?.split(" ").filter(Boolean)??[],m=!1===r.includeDefaultClasses?t(...c):t("lucide",...l,...c),h=r.absoluteStrokeWidth?Number(r.strokeWidth??a["stroke-width"])*Number(e.size??e.width??a.width)/Number(r.size??r.width??a.width):r.strokeWidth??a["stroke-width"];return["svg",{...Object.entries(a).reduce((e,[r,t])=>(e[s(r)]=t,e),{}),..."color"in r&&r.color&&{[s("stroke")]:r.color},..."size"in r&&null!=r.size&&{[s("width")]:r.size,[s("height")]:r.size},..."width"in r&&null!=r.width&&{[s("width")]:r.width},..."height"in r&&null!=r.height&&{[s("height")]:r.height},[s("stroke-width")]:h,...m&&{[s("class")]:m},[s("viewBox")]:`0 0 ${n} ${o}`,...!1===r.hasA11yProp?{[s("aria-hidden")]:"true"}:{},..."attributes"in r&&r.attributes},e.node.map(e=>{let[t,a,i]=e,n=r.nonScalingStroke?{[s("vector-effect")]:"non-scaling-stroke",...a}:a;return i?[t,n,i]:[t,n]})]}(e,{...r,attributeNames:{...r.attributeNames,class:"className","stroke-width":"strokeWidth","stroke-linecap":"strokeLinecap","stroke-linejoin":"strokeLinejoin","vector-effect":"vectorEffect"}})}(p,{color:e??k,width:n??s??g,height:o??s??g,strokeWidth:d??v,absoluteStrokeWidth:l??b,nonScalingStroke:c??w,className:t(y,m),hasA11yProp:j,attributes:f});return(0,r.createElement)(N,{ref:x,...z},[...S.map(([e,t])=>(0,r.createElement)(e,t)),...Array.isArray(h)?h:[h]])});e.s(["f",0,function(e,t=[],a=[]){let i,n="string"==typeof e?function(e,r,t=[]){if(null==r)throw Error("[lucide]: iconNode is required when icon name is used");return{name:e?.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),size:24,node:r,...t.length>0?{aliases:t}:{}}}(e,t,a):e,o=(0,r.forwardRef)(({className:e,...t},a)=>(0,r.createElement)(s,{ref:a,icon:n,className:e,...t}));return n.name&&(o.displayName=(i=(e=>{let r="",t=!1;for(let a of e){if("-"===a||"_"===a||a<=" "){t=r.length>0;continue}0===r.length?r+=a.toLowerCase():r+=t?a.toUpperCase():a,t=!1}return r})(n.name)).charAt(0).toUpperCase()+i.slice(1)),o}],56420)},15227,e=>{var r=e.i(56420);let t={name:"message-circle",size:24,node:[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]]};t.node;let a=(0,r.f)(t);e.s(["f",0,a],15227)},77071,e=>{var r=e.i(56420);let t={name:"plus",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]};t.node;let a=(0,r.f)(t);e.s(["f",0,a],77071)},66595,e=>{var r=e.i(56420);let t={name:"search",size:24,node:[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]]};t.node;let a=(0,r.f)(t);e.s(["f",0,a],66595)},63676,e=>{var r=e.i(56420);let t={name:"x",size:24,node:[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]};t.node;let a=(0,r.f)(t);e.s(["X",0,a],63676)},52367,e=>{var r=e.i(43476),t=e.i(71645),a=e.i(18566),i=e.i(66595),s=e.i(63676),n=e.i(15227),o=e.i(77071),d=e.i(94690),l=e.i(9165),c=e.i(27465),m=e.i(46696);let h=`
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
`;e.s(["default",0,function(){let{user:e}=(0,d.useAuth)(),u=(0,a.useRouter)(),[p,f]=(0,t.useState)([]),[x,g]=(0,t.useState)(!0),[v,b]=(0,t.useState)(""),[w,k]=(0,t.useState)(!1),[y,j]=(0,t.useState)(""),[N,z]=(0,t.useState)([]),[S,_]=(0,t.useState)(!1),[C,$]=(0,t.useState)(null),W=(0,t.useRef)(null),M=(0,t.useRef)(null),T=(0,t.useCallback)(async()=>{try{let e=await l.f.get("/dm");f(e.data||[])}catch(e){b(e.message||"Failed to load conversations")}finally{g(!1)}},[]);async function A(e){$(e);try{let r=await l.f.post("/dm/start",{other_user_id:e}),t=r.data?.id;if(!t)throw Error("No conversation ID returned");u.push(`/dm/${t}`)}catch(e){m.toast.error(e.message||"Failed to start conversation"),$(null)}}function E(e){return e.split(" ").map(e=>e[0]).join("").slice(0,2).toUpperCase()}return((0,t.useEffect)(()=>{T()},[T]),(0,t.useEffect)(()=>{if(w)return y.trim()?(M.current&&clearTimeout(M.current),M.current=setTimeout(async()=>{_(!0);try{let r=await l.f.get(`/profile/search?q=${encodeURIComponent(y.trim())}`);z((r.data||[]).filter(r=>r.id!==e?.id))}catch{}finally{_(!1)}},350),()=>{M.current&&clearTimeout(M.current)}):void z([])},[y,w,e?.id]),(0,t.useEffect)(()=>{w&&setTimeout(()=>W.current?.focus(),120)},[w]),x)?(0,r.jsxs)("div",{className:"dm-page",children:[[void 0,void 0,void 0,void 0,void 0].map((e,t)=>(0,r.jsxs)("div",{className:"dm-skeleton-row",children:[(0,r.jsx)("div",{className:"dm-skeleton-avatar skeleton-pulse"}),(0,r.jsxs)("div",{className:"dm-skeleton-lines",children:[(0,r.jsx)("div",{className:"dm-skeleton-line skeleton-pulse",style:{width:"60%"}}),(0,r.jsx)("div",{className:"dm-skeleton-line skeleton-pulse",style:{width:"40%",height:"12px"}})]})]},t)),(0,r.jsx)("style",{children:h})]}):(0,r.jsxs)("div",{className:"dm-page",children:[(0,r.jsxs)("div",{className:"dm-header",children:[(0,r.jsx)("h1",{className:"dm-title",children:"Messages"}),(0,r.jsx)("button",{className:"dm-new-btn",onClick:()=>k(!0),"aria-label":"New message",children:(0,r.jsx)(o.f,{size:20})})]}),v?(0,r.jsx)("div",{className:"dm-error",children:v}):0===p.length?(0,r.jsxs)("div",{className:"dm-empty",children:[(0,r.jsx)(n.f,{size:40,strokeWidth:1.2}),(0,r.jsx)("p",{children:"No conversations yet"}),(0,r.jsx)("button",{className:"dm-start-btn",onClick:()=>k(!0),children:"Start a conversation"})]}):(0,r.jsx)("div",{className:"dm-list",children:p.map(t=>{let a=t.other_user,i=t.last_message,s=t.unread_count>0;return(0,r.jsxs)("button",{className:`dm-row${s?" dm-row--unread":""}`,onClick:()=>u.push(`/dm/${t.id}`),children:[(0,r.jsxs)("div",{className:"dm-avatar",children:[a.avatar_url?(0,r.jsx)("img",{src:a.avatar_url,alt:a.full_name,className:"dm-avatar-img"}):(0,r.jsx)("span",{className:"dm-avatar-initials",children:E(a.full_name)}),s&&(0,r.jsx)("span",{className:"dm-unread-dot"})]}),(0,r.jsxs)("div",{className:"dm-row-content",children:[(0,r.jsxs)("div",{className:"dm-row-top",children:[(0,r.jsx)("span",{className:"dm-row-name",children:a.full_name}),i&&(0,r.jsx)("span",{className:"dm-row-time",children:(0,c.f)(i.created_at)})]}),(0,r.jsx)("div",{className:"dm-row-preview",children:i?(i.sender_id===e?.id?"You: ":"")+i.content:(0,r.jsx)("em",{children:"No messages yet"})}),a.department&&(0,r.jsx)("div",{className:"dm-row-dept",children:a.department})]}),s&&t.unread_count>0&&(0,r.jsx)("span",{className:"dm-unread-badge",children:t.unread_count>99?"99+":t.unread_count})]},t.id)})}),w&&(0,r.jsx)("div",{className:"dm-sheet-overlay",onClick:e=>{e.target===e.currentTarget&&k(!1)},children:(0,r.jsxs)("div",{className:"dm-sheet",children:[(0,r.jsx)("div",{className:"dm-sheet-handle"}),(0,r.jsxs)("div",{className:"dm-sheet-header",children:[(0,r.jsx)("h2",{className:"dm-sheet-title",children:"New Message"}),(0,r.jsx)("button",{className:"dm-sheet-close",onClick:()=>k(!1),children:(0,r.jsx)(s.X,{size:18})})]}),(0,r.jsxs)("div",{className:"dm-search-wrap",children:[(0,r.jsx)(i.f,{size:16,className:"dm-search-icon"}),(0,r.jsx)("input",{ref:W,type:"text",className:"dm-search-input",placeholder:"Search by name or roll number…",value:y,onChange:e=>j(e.target.value)}),y&&(0,r.jsx)("button",{className:"dm-search-clear",onClick:()=>j(""),children:(0,r.jsx)(s.X,{size:14})})]}),(0,r.jsxs)("div",{className:"dm-search-results",children:[S&&(0,r.jsx)("div",{className:"dm-search-loading",children:"Searching…"}),!S&&y&&0===N.length&&(0,r.jsx)("div",{className:"dm-search-empty",children:"No students found"}),!S&&N.map(e=>(0,r.jsxs)("button",{className:"dm-search-row",onClick:()=>A(e.id),disabled:C===e.id,children:[(0,r.jsx)("div",{className:"dm-search-avatar",children:e.avatar_url?(0,r.jsx)("img",{src:e.avatar_url,alt:e.full_name,className:"dm-avatar-img"}):(0,r.jsx)("span",{className:"dm-avatar-initials",children:E(e.full_name)})}),(0,r.jsxs)("div",{className:"dm-search-info",children:[(0,r.jsx)("div",{className:"dm-search-name",children:e.full_name}),(0,r.jsxs)("div",{className:"dm-search-meta",children:[e.roll_number&&(0,r.jsx)("span",{children:e.roll_number}),e.department&&(0,r.jsx)("span",{children:e.department})]})]}),C===e.id&&(0,r.jsx)("div",{className:"dm-spinner"})]},e.id)),!y&&(0,r.jsxs)("div",{className:"dm-search-hint",children:[(0,r.jsx)(i.f,{size:28,strokeWidth:1.2}),(0,r.jsx)("p",{children:"Search for a student to start chatting"})]})]})]})}),(0,r.jsx)("style",{children:h})]})}])},27465,e=>{e.s(["f",0,function(e){if(!e)return"";let r=new Date(e),t=(Date.now()-r.getTime())/1e3,a=t/60,i=a/60,s=i/24,n=s/7;return t<60?"just now":a<60?`${Math.floor(a)}m`:i<24?`${Math.floor(i)}h`:s<7?`${Math.floor(s)}d`:n<4?`${Math.floor(n)}w`:r.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"})}])}])})();