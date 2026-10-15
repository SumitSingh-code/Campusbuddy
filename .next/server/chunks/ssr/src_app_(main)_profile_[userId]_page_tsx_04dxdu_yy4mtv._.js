module.exports=[20866,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(19107),f=a.i(18688),g=a.i(60721),h=a.i(19032),i=a.i(50413),j=a.i(95356),k=a.i(61909),l=a.i(23292);let m=`
.up-wrap { max-width: 600px; margin: 0 auto; }
.up-topbar {
  display: flex; align-items: center; gap: .75rem;
  padding: .65rem 1rem;
  background: var(--bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 52px; z-index: 10;
}
.up-back { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--surface); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.up-topbar-title { font-size: .9375rem; font-weight: 700; color: var(--ink); }
.up-topbar-skeleton { height: 16px; border-radius: 6px; }

.up-cover { height: 140px; background: linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%); }
.up-cover-skeleton { height: 140px; }

.up-content { padding: 0 1rem 1rem; }
.up-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  border: 3px solid var(--bg); background: var(--surface2);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; margin-top: -36px;
}
.up-avatar-img { width: 72px; height: 72px; object-fit: cover; }
.up-avatar-initials { font-size: 1.35rem; font-weight: 800; color: var(--accent); }
.up-avatar-skeleton { width: 72px; height: 72px; border-radius: 50%; margin-top: -36px; }

.up-name-row { display: flex; align-items: center; gap: .5rem; margin-top: .65rem; flex-wrap: wrap; }
.up-name { font-size: 1.15rem; font-weight: 800; color: var(--ink); margin: 0; }
.up-role-badge { font-size: .7rem; font-weight: 600; background: rgba(212,175,55,.15); color: var(--accent); border-radius: 6px; padding: .2rem .5rem; }
.up-roll { font-size: .78rem; color: var(--ink-muted); margin-top: .2rem; }
.up-bio { font-size: .875rem; color: var(--ink-muted); margin: .5rem 0 0; line-height: 1.55; }

.up-stats { display: flex; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: .85rem 0; margin-top: 1rem; }
.up-stat { flex: 1; text-align: center; }
.up-stat-value { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.up-stat-label { font-size: .7rem; color: var(--ink-muted); margin-top: .1rem; }
.up-stat-divider { width: 1px; height: 32px; background: var(--border); }

.up-skeleton-line { height: 14px; border-radius: 6px; margin: .4rem 0; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.up-posts-header { display: flex; align-items: center; gap: .45rem; padding: .75rem 1rem .5rem; font-size: .8125rem; font-weight: 700; color: var(--ink-muted); border-top: 1px solid var(--border); }
.up-loading { display: flex; justify-content: center; padding: 2rem; }
.up-empty { text-align: center; padding: 2.5rem 1rem; color: var(--ink-muted); font-size: .875rem; }
.up-error { padding: 3rem 1rem; text-align: center; color: var(--danger); }
.up-spinner { width: 22px; height: 22px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }
`;a.s(["default",0,function(){let{userId:a}=(0,d.useParams)(),{user:n,isAdmin:o}=(0,g.useAuth)(),p=(0,d.useRouter)(),[q,r]=(0,c.useState)(null),[s,t]=(0,c.useState)([]),[u,v]=(0,c.useState)(!0),[w,x]=(0,c.useState)(!1),[y,z]=(0,c.useState)(""),[A,B]=(0,c.useState)(null),[C,D]=(0,c.useState)(null);(0,c.useEffect)(()=>{if(!a)return;let b=!1;return async function(){try{let c=await h.f.get(`/profile/${a}`);if(b)return;r(c.data)}catch(a){b||z(a.message||"User not found")}finally{b||v(!1)}}(),()=>{b=!0}},[a]),(0,c.useEffect)(()=>{a&&q&&(x(!0),h.f.get(`/feed?author_id=${a}`).then(a=>t(a.data||[])).catch(()=>{}).finally(()=>x(!1)))},[a,q]);let E=(0,c.useCallback)(async(a,b)=>{try{let c=await h.f.post(`/feed/${a}/vote`,{direction:b});t(b=>b.map(b=>b.id===a?{...b,...c.data}:b))}catch(a){l.toast.error(a.message)}},[]),F=(0,c.useCallback)(async(a,b)=>{try{b?await h.f.delete(`/bookmarks/${a}`):await h.f.post("/bookmarks",{post_id:a}),t(c=>c.map(c=>c.id===a?{...c,is_bookmarked:!b}:c))}catch(a){l.toast.error(a.message)}},[]);function G(a){return"super_admin"===a?"👑 Super Admin":"moderator"===a?"🛡️ Moderator":null}return u?(0,b.jsxs)("div",{className:"up-wrap",children:[(0,b.jsxs)("div",{className:"up-topbar",children:[(0,b.jsx)("button",{className:"up-back",onClick:()=>p.back(),children:(0,b.jsx)(e.f,{size:20})}),(0,b.jsx)("div",{className:"up-topbar-skeleton skeleton-pulse",style:{width:120}})]}),(0,b.jsx)("div",{className:"up-cover-skeleton skeleton-pulse"}),(0,b.jsxs)("div",{className:"up-content",children:[(0,b.jsx)("div",{className:"up-avatar-skeleton skeleton-pulse"}),(0,b.jsx)("div",{className:"up-skeleton-line skeleton-pulse",style:{width:"50%",marginTop:".5rem"}}),(0,b.jsx)("div",{className:"up-skeleton-line skeleton-pulse",style:{width:"30%"}})]}),(0,b.jsx)("style",{children:m})]}):y?(0,b.jsxs)("div",{className:"up-wrap",children:[(0,b.jsxs)("div",{className:"up-topbar",children:[(0,b.jsx)("button",{className:"up-back",onClick:()=>p.back(),children:(0,b.jsx)(e.f,{size:20})}),(0,b.jsx)("span",{className:"up-topbar-title",children:"Profile"})]}),(0,b.jsx)("div",{className:"up-error",children:y}),(0,b.jsx)("style",{children:m})]}):(0,b.jsxs)("div",{className:"up-wrap",children:[(0,b.jsxs)("div",{className:"up-topbar",children:[(0,b.jsx)("button",{className:"up-back",onClick:()=>p.back(),children:(0,b.jsx)(e.f,{size:20})}),(0,b.jsx)("span",{className:"up-topbar-title",children:q?.full_name||"Profile"})]}),(0,b.jsx)("div",{className:"up-cover"}),(0,b.jsxs)("div",{className:"up-content",children:[(0,b.jsx)("div",{className:"up-avatar",children:q?.avatar_url?(0,b.jsx)("img",{src:q.avatar_url,alt:q.full_name,className:"up-avatar-img"}):(0,b.jsx)("span",{className:"up-avatar-initials",children:q?q.full_name.split(" ").map(a=>a[0]).join("").slice(0,2).toUpperCase():"?"})}),(0,b.jsxs)("div",{className:"up-name-row",children:[(0,b.jsx)("h1",{className:"up-name",children:q?.full_name}),q?.role&&G(q.role)&&(0,b.jsx)("span",{className:"up-role-badge",children:G(q.role)})]}),(0,b.jsxs)("div",{className:"up-roll",children:[q?.roll_number," · ",q?.department]}),q?.bio&&(0,b.jsx)("p",{className:"up-bio",children:q.bio}),(0,b.jsxs)("div",{className:"up-stats",children:[(0,b.jsxs)("div",{className:"up-stat",children:[(0,b.jsx)("div",{className:"up-stat-value",children:q?.posts_count??0}),(0,b.jsx)("div",{className:"up-stat-label",children:"Posts"})]}),(0,b.jsx)("div",{className:"up-stat-divider"}),(0,b.jsxs)("div",{className:"up-stat",children:[(0,b.jsx)("div",{className:"up-stat-value",children:q?.karma??0}),(0,b.jsx)("div",{className:"up-stat-label",children:"Karma"})]}),(0,b.jsx)("div",{className:"up-stat-divider"}),(0,b.jsxs)("div",{className:"up-stat",children:[(0,b.jsx)("div",{className:"up-stat-value",children:q?.notes_uploaded??0}),(0,b.jsx)("div",{className:"up-stat-label",children:"Notes"})]})]})]}),(0,b.jsxs)("div",{className:"up-posts-header",children:[(0,b.jsx)(f.f,{size:14})," ",(0,b.jsx)("span",{children:"Posts"})]}),w?(0,b.jsx)("div",{className:"up-loading",children:(0,b.jsx)("div",{className:"up-spinner"})}):0===s.length?(0,b.jsx)("div",{className:"up-empty",children:"No posts yet"}):(0,b.jsx)("div",{children:s.map(a=>(0,b.jsx)(i.f,{post:a,currentUserId:n?.id||"",isAdmin:o,onVote:E,onBookmark:F,onComment:()=>B(a.id),onReport:()=>D(a.id),onEdit:()=>{},onDelete:()=>{}},a.id))}),A&&(0,b.jsx)(j.f,{postId:A,onClose:()=>B(null)}),C&&(0,b.jsx)(k.f,{postId:C,onClose:()=>D(null)}),(0,b.jsx)("style",{children:m})]})}])}];

//# sourceMappingURL=src_app_%28main%29_profile_%5BuserId%5D_page_tsx_04dxdu_yy4mtv._.js.map