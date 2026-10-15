module.exports=[92963,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(1661),e=a.i(36670),f=a.i(51675),g=a.i(74215),h=a.i(83138),i=a.i(60721),j=a.i(19032),k=a.i(76808),l=a.i(90075),m=a.i(66812),n=a.i(26711),o=a.i(23292);let p=["All","Computer Science","Physics","Chemistry","Mathematics","Commerce","Arts","Other"],q=`
.pyq-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.pyq-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border); }
.pyq-title { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.pyq-upload-btn { display: flex; align-items: center; gap: .4rem; padding: .55rem 1rem; background: var(--accent); color: var(--bg); border: none; border-radius: 9px; font-size: .8125rem; font-weight: 700; cursor: pointer; }

.pyq-filters { display: flex; gap: .45rem; padding: .75rem 1rem; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.pyq-filters::-webkit-scrollbar { display: none; }
.pyq-filter-chip { flex-shrink: 0; padding: .4rem .85rem; border-radius: 99px; border: 1.5px solid var(--border); background: transparent; color: var(--ink-muted); font-size: .78rem; font-weight: 600; cursor: pointer; }
.pyq-filter-chip.active { border-color: var(--accent); background: rgba(212,175,55,.1); color: var(--accent); }

.pyq-list { display: flex; flex-direction: column; gap: .65rem; padding: .75rem 1rem; }
.pyq-card { display: flex; align-items: center; gap: .85rem; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: .9rem; }
.pyq-card-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(212,175,55,.1); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pyq-card-info { flex: 1; min-width: 0; }
.pyq-card-subject { font-weight: 700; font-size: .875rem; color: var(--ink); margin-bottom: .25rem; }
.pyq-card-meta { display: flex; flex-wrap: wrap; gap: .4rem; font-size: .72rem; color: var(--ink-muted); margin-bottom: .2rem; }
.pyq-dept-badge { background: var(--surface2); border-radius: 4px; padding: .1rem .4rem; color: var(--ink-muted); }
.pyq-card-uploader { font-size: .7rem; color: var(--ink-muted); }
.pyq-card-actions { display: flex; gap: .4rem; }
.pyq-download-btn { width: 34px; height: 34px; border-radius: 8px; background: var(--accent); color: var(--bg); display: flex; align-items: center; justify-content: center; text-decoration: none; }
.pyq-delete-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; }

.pyq-loading { display: flex; flex-direction: column; gap: .65rem; padding: .75rem 1rem; }
.pyq-skeleton { height: 72px; border-radius: 14px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.pyq-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center; }
.pyq-empty p { font-size: .875rem; }

/* Upload sheet */
.pyq-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.pyq-sheet { background: var(--surface); border-radius: 18px 18px 0 0; width: 100%; max-width: 600px; animation: pyqIn .25s ease; }
@keyframes pyqIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.pyq-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.pyq-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.pyq-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.pyq-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pyq-form { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: .65rem; }
.pyq-label { font-size: .78rem; font-weight: 600; color: var(--ink-muted); }
.pyq-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: .65rem .85rem; font-size: .875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.pyq-input:focus { border-color: var(--accent); }
.pyq-row { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
.pyq-col { display: flex; flex-direction: column; gap: .35rem; }

.pyq-file-area { border: 2px dashed var(--border); border-radius: 12px; padding: 1.5rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: .5rem; color: var(--ink-muted); font-size: .875rem; transition: border-color .15s; }
.pyq-file-area:hover { border-color: var(--accent); }
.pyq-file-selected { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; justify-content: center; color: var(--ink); }
.pyq-file-size { font-size: .72rem; color: var(--ink-muted); }

.pyq-submit-btn { width: 100%; padding: .8rem; background: var(--accent); color: var(--bg); border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700; cursor: pointer; margin-top: .25rem; }
.pyq-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
`;a.s(["default",0,function(){let{user:a,isAdmin:r}=(0,i.useAuth)(),[s,t]=(0,c.useState)([]),[u,v]=(0,c.useState)(!0),[w,x]=(0,c.useState)("All"),[y,z]=(0,c.useState)(!1),[A,B]=(0,c.useState)(""),[C,D]=(0,c.useState)(new Date().getFullYear().toString()),[E,F]=(0,c.useState)(""),[G,H]=(0,c.useState)(null),[I,J]=(0,c.useState)(!1),[K,L]=(0,c.useState)(null),M=(0,c.useRef)(null);async function N(){v(!0);try{let a="All"!==w?`?department=${encodeURIComponent(w)}`:"",b=await j.f.get(`/pyq${a}`);t(b.data||[])}catch(a){o.toast.error(a.message||"Failed to load PYQs")}finally{v(!1)}}async function O(){if(!A.trim()||!C||!E.trim()||!G)return void o.toast.error("Fill all fields and select a file");J(!0);try{let b=await (0,k.h)(G,`pyq/${a.id}/${Date.now()}_${G.name}`);await j.f.post("/pyq",{subject:A.trim(),year:parseInt(C),department:E.trim(),file_url:b,file_name:G.name,file_size:G.size}),o.toast.success("PYQ uploaded successfully"),z(!1),B(""),D(new Date().getFullYear().toString()),F(""),H(null),N()}catch(a){o.toast.error(a.message||"Upload failed")}finally{J(!1)}}async function P(){if(K){try{await j.f.delete(`/pyq/${K}`),t(a=>a.filter(a=>a.id!==K)),o.toast.success("File deleted")}catch(a){o.toast.error(a.message)}L(null)}}return(0,c.useEffect)(()=>{N()},[w]),(0,b.jsxs)("div",{className:"pyq-page",children:[(0,b.jsxs)("div",{className:"pyq-header",children:[(0,b.jsx)("h1",{className:"pyq-title",children:"📄 PYQ Library"}),(0,b.jsxs)("button",{className:"pyq-upload-btn",onClick:()=>z(!0),children:[(0,b.jsx)(d.f,{size:15})," Upload"]})]}),(0,b.jsx)("div",{className:"pyq-filters",children:p.map(a=>(0,b.jsx)("button",{className:`pyq-filter-chip${w===a?" active":""}`,onClick:()=>x(a),children:a},a))}),u?(0,b.jsx)("div",{className:"pyq-loading",children:[void 0,void 0,void 0,void 0].map((a,c)=>(0,b.jsx)("div",{className:"pyq-skeleton skeleton-pulse"},c))}):0===s.length?(0,b.jsxs)("div",{className:"pyq-empty",children:[(0,b.jsx)(h.f,{size:36,strokeWidth:1.2}),(0,b.jsx)("p",{children:"No PYQs found"}),(0,b.jsx)("button",{className:"pyq-upload-btn",onClick:()=>z(!0),children:"Upload first one"})]}):(0,b.jsx)("div",{className:"pyq-list",children:s.map(c=>(0,b.jsxs)("div",{className:"pyq-card",children:[(0,b.jsx)("div",{className:"pyq-card-icon",children:(0,b.jsx)(h.f,{size:22})}),(0,b.jsxs)("div",{className:"pyq-card-info",children:[(0,b.jsx)("div",{className:"pyq-card-subject",children:c.subject}),(0,b.jsxs)("div",{className:"pyq-card-meta",children:[(0,b.jsx)("span",{className:"pyq-dept-badge",children:c.department}),(0,b.jsxs)("span",{children:["Year ",c.year]}),(0,b.jsx)("span",{children:(0,l.f)(c.file_size)})]}),(0,b.jsxs)("div",{className:"pyq-card-uploader",children:[c.uploader_name||"Anonymous"," · ",(0,m.f)(c.created_at)]})]}),(0,b.jsxs)("div",{className:"pyq-card-actions",children:[(0,b.jsx)("a",{href:c.file_url,target:"_blank",rel:"noopener noreferrer",className:"pyq-download-btn","aria-label":"Download",children:(0,b.jsx)(e.f,{size:16})}),(c.uploaded_by===a?.id||r)&&(0,b.jsx)("button",{className:"pyq-delete-btn",onClick:()=>L(c.id),"aria-label":"Delete",children:(0,b.jsx)(f.f,{size:15})})]})]},c.id))}),y&&(0,b.jsx)("div",{className:"pyq-overlay",onClick:a=>{a.target===a.currentTarget&&z(!1)},children:(0,b.jsxs)("div",{className:"pyq-sheet",children:[(0,b.jsx)("div",{className:"pyq-sheet-handle"}),(0,b.jsxs)("div",{className:"pyq-sheet-header",children:[(0,b.jsx)("h2",{className:"pyq-sheet-title",children:"Upload PYQ"}),(0,b.jsx)("button",{className:"pyq-sheet-close",onClick:()=>z(!1),children:(0,b.jsx)(g.X,{size:18})})]}),(0,b.jsxs)("div",{className:"pyq-form",children:[(0,b.jsx)("label",{className:"pyq-label",children:"Subject *"}),(0,b.jsx)("input",{className:"pyq-input",placeholder:"e.g. Operating Systems",value:A,onChange:a=>B(a.target.value)}),(0,b.jsxs)("div",{className:"pyq-row",children:[(0,b.jsxs)("div",{className:"pyq-col",children:[(0,b.jsx)("label",{className:"pyq-label",children:"Year *"}),(0,b.jsx)("input",{className:"pyq-input",type:"number",min:"2000",max:"2030",value:C,onChange:a=>D(a.target.value)})]}),(0,b.jsxs)("div",{className:"pyq-col",children:[(0,b.jsx)("label",{className:"pyq-label",children:"Department *"}),(0,b.jsxs)("select",{className:"pyq-input",value:E,onChange:a=>F(a.target.value),children:[(0,b.jsx)("option",{value:"",children:"Select…"}),p.filter(a=>"All"!==a).map(a=>(0,b.jsx)("option",{children:a},a))]})]})]}),(0,b.jsx)("label",{className:"pyq-label",children:"File (PDF) *"}),(0,b.jsx)("div",{className:"pyq-file-area",onClick:()=>M.current?.click(),children:G?(0,b.jsxs)("div",{className:"pyq-file-selected",children:[(0,b.jsx)(h.f,{size:18}),(0,b.jsx)("span",{children:G.name}),(0,b.jsx)("span",{className:"pyq-file-size",children:(0,l.f)(G.size)})]}):(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(d.f,{size:22}),(0,b.jsx)("span",{children:"Tap to select PDF"})]})}),(0,b.jsx)("input",{ref:M,type:"file",accept:".pdf",hidden:!0,onChange:a=>H(a.target.files?.[0]||null)}),(0,b.jsx)("button",{className:"pyq-submit-btn",onClick:O,disabled:I,children:I?"Uploading…":"Upload PYQ"})]})]})}),K&&(0,b.jsx)(n.f,{message:"Delete this PYQ file? This cannot be undone.",confirmLabel:"Delete",onConfirm:P,onCancel:()=>L(null)}),(0,b.jsx)("style",{children:q})]})}])}];

//# sourceMappingURL=src_app_%28main%29_pyq_page_tsx_0j58iyjh8gx_v._.js.map