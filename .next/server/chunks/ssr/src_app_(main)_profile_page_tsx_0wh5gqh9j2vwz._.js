module.exports=[72074,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(64831);let f={name:"camera",size:24,node:[["path",{d:"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",key:"18u6gg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]};f.node;let g=(0,e.f)(f),h={name:"settings",size:24,node:[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]};h.node;let i=(0,e.f)(h);var j=a.i(69369);let k={name:"phone",size:24,node:[["path",{d:"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",key:"9njp5v"}]]};k.node;let l=(0,e.f)(k);var m=a.i(18688),n=a.i(74215),o=a.i(52562),p=a.i(60721),q=a.i(19032),r=a.i(6307),s=a.i(76808),t=a.i(50413),u=a.i(95356),v=a.i(61909),w=a.i(76977),x=a.i(26711),y=a.i(23292);let z=`
.prof-wrap { max-width: 600px; margin: 0 auto; }

/* Cover */
.prof-cover {
  height: 160px; background: var(--surface); background-size: cover; background-position: center;
  position: relative;
}
.prof-cover-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.1), rgba(0,0,0,.35));
}
.prof-cover-skeleton { height: 160px; }
.prof-topbar-actions { position: absolute; top: .75rem; right: .75rem; display: flex; gap: .5rem; }
.prof-icon-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(0,0,0,.4); backdrop-filter: blur(8px);
  border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.prof-content { padding: 0 1rem 1rem; position: relative; }
.prof-avatar-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: -40px; }
.prof-avatar-wrap { position: relative; }
.prof-avatar {
  width: 80px; height: 80px; border-radius: 50%;
  border: 3px solid var(--bg);
  background: var(--surface2);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; position: relative;
}
.prof-avatar-img { width: 80px; height: 80px; object-fit: cover; }
.prof-avatar-initials { font-size: 1.5rem; font-weight: 800; color: var(--accent); }
.prof-avatar-uploading {
  position: absolute; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; border-radius: 50%;
}
.prof-avatar-cam {
  position: absolute; bottom: 0; right: 0;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--accent); color: var(--bg);
  border: 2px solid var(--bg);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: .65rem;
}
.prof-avatar-skeleton { width: 80px; height: 80px; border-radius: 50%; }

.prof-edit-btn {
  display: flex; align-items: center; gap: .4rem;
  padding: .5rem 1rem; border-radius: 8px;
  border: 1.5px solid var(--border);
  background: transparent; color: var(--ink);
  font-size: .8125rem; font-weight: 600; cursor: pointer;
  transition: background .12s;
}
.prof-edit-btn:hover { background: var(--surface); }

.prof-name-row { display: flex; align-items: center; gap: .5rem; margin-top: .75rem; flex-wrap: wrap; }
.prof-name { font-size: 1.25rem; font-weight: 800; color: var(--ink); margin: 0; }
.prof-role-badge { font-size: .7rem; font-weight: 600; background: rgba(212,175,55,.15); color: var(--accent); border-radius: 6px; padding: .2rem .5rem; }
.prof-roll { font-size: .78rem; color: var(--ink-muted); margin-top: .2rem; }
.prof-bio { font-size: .875rem; color: var(--ink-muted); margin: .5rem 0 .25rem; line-height: 1.55; }
.prof-phone { display: flex; align-items: center; gap: .3rem; font-size: .78rem; color: var(--ink-muted); margin-top: .2rem; }

.prof-stats {
  display: flex; align-items: center;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: .85rem 0;
  margin-top: 1rem;
}
.prof-stat { flex: 1; text-align: center; }
.prof-stat-value { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.prof-stat-label { font-size: .7rem; color: var(--ink-muted); margin-top: .1rem; }
.prof-stat-divider { width: 1px; height: 32px; background: var(--border); }

.prof-skeleton-line { height: 14px; border-radius: 6px; margin: .4rem 0; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.prof-posts-header {
  display: flex; align-items: center; gap: .45rem;
  padding: .75rem 1rem .5rem;
  font-size: .8125rem; font-weight: 700; color: var(--ink-muted);
  border-top: 1px solid var(--border);
}
.prof-posts-loading { display: flex; justify-content: center; padding: 2rem; }
.prof-empty { text-align: center; padding: 2.5rem 1rem; color: var(--ink-muted); font-size: .875rem; }

.prof-spinner {
  width: 22px; height: 22px; border: 2px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin .7s linear infinite;
}
.prof-spinner--sm { width: 16px; height: 16px; border-width: 2px; }
@keyframes spin { to{transform:rotate(360deg)} }

/* Edit sheet */
.prof-sheet-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
  animation: psOverIn .2s ease;
}
@keyframes psOverIn { from{opacity:0}to{opacity:1} }
.prof-sheet {
  background: var(--surface); border-radius: 18px 18px 0 0;
  width: 100%; max-width: 600px;
  animation: psIn .25s ease;
}
@keyframes psIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.prof-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.prof-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.prof-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.prof-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.prof-sheet-body { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); }
.prof-field-label { display: block; font-size: .78rem; font-weight: 600; color: var(--ink-muted); margin-bottom: .35rem; }
.prof-input {
  width: 100%; background: var(--bg); border: 1.5px solid var(--border);
  border-radius: 10px; padding: .65rem .85rem; font-size: .875rem;
  color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box;
  transition: border-color .15s;
}
.prof-input:focus { border-color: var(--accent); }
.prof-textarea { resize: none; }
.prof-char-count { font-size: .72rem; color: var(--ink-muted); text-align: right; margin-top: .2rem; }
.prof-save-btn {
  width: 100%; margin-top: 1.25rem; padding: .8rem;
  background: var(--accent); color: var(--bg);
  border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: .4rem;
  transition: opacity .15s;
}
.prof-save-btn:disabled { opacity: .6; cursor: not-allowed; }
`;a.s(["default",0,function(){let{user:a,profile:e,isAdmin:f}=(0,p.useAuth)(),h=(0,d.useRouter)(),[k,A]=(0,c.useState)(null),[B,C]=(0,c.useState)(null),[D,E]=(0,c.useState)([]),[F,G]=(0,c.useState)(!0),[H,I]=(0,c.useState)(!1),[J,K]=(0,c.useState)(!1),[L,M]=(0,c.useState)(""),[N,O]=(0,c.useState)(""),[P,Q]=(0,c.useState)(!1),[R,S]=(0,c.useState)(!1),T=(0,c.useRef)(null),[U,V]=(0,c.useState)(null),[W,X]=(0,c.useState)(null),[Y,Z]=(0,c.useState)(null),[$,_]=(0,c.useState)(null);async function aa(b){let c=b.target.files?.[0];if(c&&a){S(!0);try{let b=await (0,r.f)(c,400,80),d=await (0,s.h)(b,`avatars/${a.id}/${Date.now()}.jpg`);await q.f.patch("/profile/me",{avatar_url:d}),A(a=>a?{...a,avatar_url:d}:a),y.toast.success("Profile photo updated")}catch(a){y.toast.error(a.message||"Upload failed")}finally{S(!1),b.target.value=""}}}async function ab(){if(!N.trim())return void y.toast.error("Name cannot be empty");Q(!0);try{await q.f.patch("/profile/me",{full_name:N.trim(),bio:L.trim()||null}),A(a=>a?{...a,full_name:N.trim(),bio:L.trim()||void 0}:a),K(!1),y.toast.success("Profile updated")}catch(a){y.toast.error(a.message||"Save failed")}finally{Q(!1)}}(0,c.useEffect)(()=>{let a=!1;return async function(){try{let[b,c]=await Promise.all([q.f.get("/profile/me"),q.f.get("/config").catch(()=>({data:null}))]);if(a)return;A(b.data),M(b.data?.bio||""),O(b.data?.full_name||""),c.data?.cover_url&&C(c.data.cover_url)}catch(b){a||y.toast.error(b.message||"Failed to load profile")}finally{a||G(!1)}}(),()=>{a=!0}},[]),(0,c.useEffect)(()=>{a&&(I(!0),q.f.get(`/feed?author_id=${a.id}`).then(a=>E(a.data||[])).catch(()=>{}).finally(()=>I(!1)))},[a]);let ac=(0,c.useCallback)(async(a,b)=>{try{let c=await q.f.post(`/feed/${a}/vote`,{direction:b});E(b=>b.map(b=>b.id===a?{...b,...c.data}:b))}catch(a){y.toast.error(a.message)}},[]),ad=(0,c.useCallback)(async(a,b)=>{try{b?await q.f.delete(`/bookmarks/${a}`):await q.f.post("/bookmarks",{post_id:a}),E(c=>c.map(c=>c.id===a?{...c,is_bookmarked:!b}:c))}catch(a){y.toast.error(a.message)}},[]),ae=(0,c.useCallback)(async a=>{_(a)},[]),af=(0,c.useCallback)(async()=>{if($){try{await q.f.delete(`/feed/${$}`),E(a=>a.filter(a=>a.id!==$)),y.toast.success("Post deleted")}catch(a){y.toast.error(a.message)}_(null)}},[$]),ag=(0,c.useCallback)(a=>{E(b=>b.map(b=>b.id===a.id?a:b))},[]);function ah(a){return"super_admin"===a?"👑 Super Admin":"moderator"===a?"🛡️ Moderator":null}return F?(0,b.jsxs)("div",{className:"prof-wrap",children:[(0,b.jsx)("div",{className:"prof-cover-skeleton skeleton-pulse"}),(0,b.jsxs)("div",{className:"prof-content",children:[(0,b.jsx)("div",{className:"prof-avatar-skeleton skeleton-pulse"}),(0,b.jsx)("div",{className:"prof-skeleton-line skeleton-pulse",style:{width:"50%",marginTop:".5rem"}}),(0,b.jsx)("div",{className:"prof-skeleton-line skeleton-pulse",style:{width:"30%"}})]}),(0,b.jsx)("style",{children:z})]}):(0,b.jsxs)("div",{className:"prof-wrap",children:[(0,b.jsxs)("div",{className:"prof-cover",style:B?{backgroundImage:`url(${B})`}:{},children:[(0,b.jsx)("div",{className:"prof-cover-overlay"}),(0,b.jsx)("div",{className:"prof-topbar-actions",children:(0,b.jsx)("button",{className:"prof-icon-btn",onClick:()=>h.push("/settings"),"aria-label":"Settings",children:(0,b.jsx)(i,{size:18})})})]}),(0,b.jsxs)("div",{className:"prof-content",children:[(0,b.jsxs)("div",{className:"prof-avatar-row",children:[(0,b.jsxs)("div",{className:"prof-avatar-wrap",children:[(0,b.jsxs)("div",{className:"prof-avatar",children:[k?.avatar_url?(0,b.jsx)("img",{src:k.avatar_url,alt:k.full_name,className:"prof-avatar-img"}):(0,b.jsx)("span",{className:"prof-avatar-initials",children:k?k.full_name.split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase():"?"}),R&&(0,b.jsx)("div",{className:"prof-avatar-uploading",children:(0,b.jsx)("div",{className:"prof-spinner"})})]}),(0,b.jsx)("button",{className:"prof-avatar-cam",onClick:()=>T.current?.click(),"aria-label":"Change photo",disabled:R,children:(0,b.jsx)(g,{size:14})}),(0,b.jsx)("input",{ref:T,type:"file",accept:"image/*",hidden:!0,onChange:aa})]}),(0,b.jsxs)("button",{className:"prof-edit-btn",onClick:()=>{K(!0)},children:[(0,b.jsx)(j.f,{size:14})," Edit Profile"]})]}),(0,b.jsxs)("div",{className:"prof-name-row",children:[(0,b.jsx)("h1",{className:"prof-name",children:k?.full_name}),k?.role&&ah(k.role)&&(0,b.jsx)("span",{className:"prof-role-badge",children:ah(k.role)})]}),(0,b.jsxs)("div",{className:"prof-roll",children:[k?.roll_number," · ",k?.department]}),k?.bio&&(0,b.jsx)("p",{className:"prof-bio",children:k.bio}),k?.phone_number&&(0,b.jsxs)("div",{className:"prof-phone",children:[(0,b.jsx)(l,{size:12})," ",k.phone_number]}),(0,b.jsxs)("div",{className:"prof-stats",children:[(0,b.jsxs)("div",{className:"prof-stat",children:[(0,b.jsx)("div",{className:"prof-stat-value",children:k?.posts_count??0}),(0,b.jsx)("div",{className:"prof-stat-label",children:"Posts"})]}),(0,b.jsx)("div",{className:"prof-stat-divider"}),(0,b.jsxs)("div",{className:"prof-stat",children:[(0,b.jsx)("div",{className:"prof-stat-value",children:k?.karma??0}),(0,b.jsx)("div",{className:"prof-stat-label",children:"Karma"})]}),(0,b.jsx)("div",{className:"prof-stat-divider"}),(0,b.jsxs)("div",{className:"prof-stat",children:[(0,b.jsx)("div",{className:"prof-stat-value",children:k?.notes_uploaded??0}),(0,b.jsx)("div",{className:"prof-stat-label",children:"Notes"})]})]})]}),(0,b.jsxs)("div",{className:"prof-posts-header",children:[(0,b.jsx)(m.f,{size:14})," ",(0,b.jsx)("span",{children:"Posts"})]}),H?(0,b.jsx)("div",{className:"prof-posts-loading",children:(0,b.jsx)("div",{className:"prof-spinner"})}):0===D.length?(0,b.jsx)("div",{className:"prof-empty",children:"No posts yet"}):(0,b.jsx)("div",{children:D.map(c=>(0,b.jsx)(t.f,{post:c,currentUserId:a?.id||"",isAdmin:f,onVote:ac,onBookmark:ad,onComment:()=>V(c.id),onReport:()=>X(c.id),onEdit:()=>Z(c),onDelete:()=>ae(c.id)},c.id))}),J&&(0,b.jsx)("div",{className:"prof-sheet-overlay",onClick:a=>{a.target===a.currentTarget&&K(!1)},children:(0,b.jsxs)("div",{className:"prof-sheet",children:[(0,b.jsx)("div",{className:"prof-sheet-handle"}),(0,b.jsxs)("div",{className:"prof-sheet-header",children:[(0,b.jsx)("h2",{className:"prof-sheet-title",children:"Edit Profile"}),(0,b.jsx)("button",{className:"prof-sheet-close",onClick:()=>K(!1),children:(0,b.jsx)(n.X,{size:18})})]}),(0,b.jsxs)("div",{className:"prof-sheet-body",children:[(0,b.jsx)("label",{className:"prof-field-label",children:"Display Name"}),(0,b.jsx)("input",{className:"prof-input",value:N,onChange:a=>O(a.target.value),placeholder:"Your full name",maxLength:100}),(0,b.jsx)("label",{className:"prof-field-label",style:{marginTop:".75rem"},children:"Bio"}),(0,b.jsx)("textarea",{className:"prof-input prof-textarea",value:L,onChange:a=>M(a.target.value),placeholder:"Write something about yourself…",maxLength:200,rows:3}),(0,b.jsxs)("div",{className:"prof-char-count",children:[L.length,"/200"]}),(0,b.jsx)("button",{className:"prof-save-btn",onClick:ab,disabled:P,children:P?(0,b.jsx)("div",{className:"prof-spinner prof-spinner--sm"}):(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(o.f,{size:15})," Save Changes"]})})]})]})}),U&&(0,b.jsx)(u.f,{postId:U,onClose:()=>V(null)}),W&&(0,b.jsx)(v.f,{postId:W,onClose:()=>X(null)}),Y&&(0,b.jsx)(w.f,{post:Y,onClose:()=>Z(null),onSaved:ag}),$&&(0,b.jsx)(x.f,{message:"Delete this post? This cannot be undone.",confirmLabel:"Delete",onConfirm:af,onCancel:()=>_(null)}),(0,b.jsx)("style",{children:z})]})}],72074)}];

//# sourceMappingURL=src_app_%28main%29_profile_page_tsx_0wh5gqh9j2vwz._.js.map