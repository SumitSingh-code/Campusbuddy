module.exports=[39878,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(39353),f=a.i(55681),g=a.i(77064),h=a.i(64831);let i={name:"shield-check",size:24,node:[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]};i.node;let j=(0,h.f)(i);var k=a.i(60721),l=a.i(19032),m=a.i(23292);let n=`
.cp-page {
  min-height: 100dvh; background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.cp-card {
  width: 100%; max-width: 400px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 2rem 1.75rem;
  text-align: center;
}
.cp-icon-wrap {
  width: 60px; height: 60px; border-radius: 16px;
  background: rgba(212,175,55,.12); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.25rem;
}
.cp-title { font-size: 1.25rem; font-weight: 800; color: var(--ink); margin: 0 0 .5rem; }
.cp-desc { font-size: .8375rem; color: var(--ink-muted); margin-bottom: 1.5rem; line-height: 1.55; }

.cp-form { display: flex; flex-direction: column; gap: .85rem; text-align: left; }
.cp-field {
  display: flex; align-items: center; gap: .65rem;
  background: var(--bg); border: 1.5px solid var(--border); border-radius: 12px;
  padding: 0 .85rem; transition: border-color .15s;
}
.cp-field:focus-within { border-color: var(--accent); }
.cp-field-icon { color: var(--ink-muted); flex-shrink: 0; }
.cp-input { flex: 1; background: transparent; border: none; outline: none; padding: .75rem 0; font-size: .9rem; color: var(--ink); font-family: inherit; }
.cp-input::placeholder { color: var(--ink-muted); }
.cp-eye { background: none; border: none; color: var(--ink-muted); cursor: pointer; padding: 0; display: flex; }

.cp-rules { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .3rem; }
.cp-rules li { font-size: .78rem; color: var(--ink-muted); padding-left: 1.25rem; position: relative; }
.cp-rules li::before { content: '○'; position: absolute; left: 0; }
.cp-rules li.valid { color: #50C878; }
.cp-rules li.valid::before { content: '✓'; }

.cp-error { background: rgba(232,93,78,.1); border: 1px solid rgba(232,93,78,.3); color: #E85D4E; border-radius: 10px; padding: .65rem .85rem; font-size: .8125rem; }
.cp-btn { width: 100%; padding: .85rem; background: var(--accent); color: var(--bg); border: none; border-radius: 12px; font-size: .9375rem; font-weight: 700; cursor: pointer; transition: opacity .15s; }
.cp-btn:disabled { opacity: .6; cursor: not-allowed; }
`;a.s(["default",0,function(){let{signOut:a}=(0,k.useAuth)(),h=(0,d.useRouter)(),[i,o]=(0,c.useState)(""),[p,q]=(0,c.useState)(""),[r,s]=(0,c.useState)(!1),[t,u]=(0,c.useState)(!1),[v,w]=(0,c.useState)(!1),[x,y]=(0,c.useState)("");async function z(b){if(b.preventDefault(),y(""),i.length<8)return void y("Password must be at least 8 characters");if(!/[a-zA-Z]/.test(i)||!/[0-9]/.test(i))return void y("Password must contain at least one letter and one number");if(i!==p)return void y("Passwords do not match");w(!0);try{await l.f.post("/auth/change-password",{new_password:i}),m.toast.success("Password updated! Please log in again."),await a(),h.push("/login")}catch(a){y(a.message||"Failed to update password")}finally{w(!1)}}return(0,b.jsxs)("div",{className:"cp-page",children:[(0,b.jsxs)("div",{className:"cp-card",children:[(0,b.jsx)("div",{className:"cp-icon-wrap",children:(0,b.jsx)(j,{size:28})}),(0,b.jsx)("h1",{className:"cp-title",children:"Set New Password"}),(0,b.jsx)("p",{className:"cp-desc",children:"Your account requires a password update before you can continue."}),(0,b.jsxs)("form",{onSubmit:z,className:"cp-form",children:[(0,b.jsxs)("div",{className:"cp-field",children:[(0,b.jsx)(e.f,{size:16,className:"cp-field-icon"}),(0,b.jsx)("input",{type:r?"text":"password",className:"cp-input",placeholder:"New password",value:i,onChange:a=>o(a.target.value),required:!0,minLength:8}),(0,b.jsx)("button",{type:"button",className:"cp-eye",onClick:()=>s(a=>!a),children:r?(0,b.jsx)(g.f,{size:16}):(0,b.jsx)(f.f,{size:16})})]}),(0,b.jsxs)("div",{className:"cp-field",children:[(0,b.jsx)(e.f,{size:16,className:"cp-field-icon"}),(0,b.jsx)("input",{type:t?"text":"password",className:"cp-input",placeholder:"Confirm new password",value:p,onChange:a=>q(a.target.value),required:!0}),(0,b.jsx)("button",{type:"button",className:"cp-eye",onClick:()=>u(a=>!a),children:t?(0,b.jsx)(g.f,{size:16}):(0,b.jsx)(f.f,{size:16})})]}),(0,b.jsxs)("ul",{className:"cp-rules",children:[(0,b.jsx)("li",{className:i.length>=8?"valid":"",children:"At least 8 characters"}),(0,b.jsx)("li",{className:/[a-zA-Z]/.test(i)&&/[0-9]/.test(i)?"valid":"",children:"Contains a letter and a number"}),(0,b.jsx)("li",{className:i&&i===p?"valid":"",children:"Passwords match"})]}),x&&(0,b.jsx)("div",{className:"cp-error",children:x}),(0,b.jsx)("button",{type:"submit",className:"cp-btn",disabled:v,children:v?"Updating…":"Update Password"})]})]}),(0,b.jsx)("style",{children:n})]})}],39878)}];

//# sourceMappingURL=src_app_%28auth%29_change-password_page_tsx_04du-5980e9n-._.js.map