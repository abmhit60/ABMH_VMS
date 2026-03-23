import{useState,useEffect,useRef,useCallback}from"react";
import{createPortal}from"react-dom";
import{
  Users,LogOut,RefreshCw,Search,Plus,CheckCircle,
  Clock,AlertTriangle,Download,Filter,ChevronDown,
  User,Building,Phone,FileText,Shield,BarChart2,
  ArrowLeft,Printer,X,Check,Eye,Calendar,Hash,
  MessageCircle,QrCode,ThumbsUp,ThumbsDown,Send
}from"lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_KEY;
const API=`${SUPABASE_URL}/rest/v1`;
const HEADERS={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"};

// ─── Theme ────────────────────────────────────────────────────────────────────
const RED="#c41e3a";const DARK="#8b0000";const LIGHT="#fff5f5";

// ─── Visitor Types ────────────────────────────────────────────────────────────
const VISITOR_TYPES={
  vendor:   {label:"Vendor / Supplier",  color:"#0369a1",bg:"#eff6ff",  icon:"🏭"},
  contractor:{label:"Contractor / Worker",color:"#d97706",bg:"#fffbeb", icon:"🔧"},
  government:{label:"Government / Auditor",color:"#7c3aed",bg:"#f5f3ff",icon:"🏛️"},
};

// ─── Departments (can be loaded from DB) ─────────────────────────────────────
const DEPARTMENTS=[
  "Administration","Cardiology","Emergency","Finance","HR",
  "ICU","IT & Networking","Laboratory","Neurology","Nursing",
  "OPD","Oncology","Operations","Orthopaedics","Pharmacy",
  "Radiology","Security","Surgery",
];

// ─── ID Types ─────────────────────────────────────────────────────────────────
const ID_TYPES=["Aadhaar Card","PAN Card","Passport","Driving Licence","Voter ID","Company ID"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function sbGet(table,q=""){
  const r=await fetch(`${API}/${table}${q?"?"+q:""}`,{headers:HEADERS});
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
async function sbPost(table,body){
  const r=await fetch(`${API}/${table}`,{method:"POST",headers:HEADERS,body:JSON.stringify(body)});
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
async function sbPatch(table,q,body){
  const r=await fetch(`${API}/${table}?${q}`,{method:"PATCH",headers:{...HEADERS,"Prefer":"return=representation"},body:JSON.stringify(body)});
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}

function fmt(iso){
  if(!iso)return"—";
  return new Date(iso).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function fmtDate(iso){
  if(!iso)return"—";
  return new Date(iso).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
function timeAgo(iso){
  if(!iso)return"—";
  const d=Date.now()-new Date(iso).getTime();
  if(d<60000)return"Just now";
  if(d<3600000)return`${Math.floor(d/60000)}m ago`;
  if(d<86400000)return`${Math.floor(d/3600000)}h ago`;
  return fmtDate(iso);
}
function genVisitorId(){
  const d=new Date();
  return`VIS-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(1000+Math.random()*9000)}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const INP={width:"100%",padding:"10px 12px",border:"1.5px solid #e5e7eb",borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",background:"#fafafa",boxSizing:"border-box"};
const BTN_PRIMARY={padding:"11px 20px",background:RED,border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"};
const BTN_GHOST={padding:"8px 14px",background:"#f3f4f6",border:"1.5px solid #e5e7eb",borderRadius:9,color:"#374151",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"};

// Inject font
(()=>{
  const l=document.createElement("link");
  l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
  document.head.appendChild(l);
  const s=document.createElement("style");
  s.textContent=`
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:#f5f6fa;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .fu{animation:fadeUp .4s ease both;}
    .fi{animation:fadeIn .3s ease both;}
    input:focus,select:focus,textarea:focus{border-color:${RED}!important;background:#fff!important;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:2px;}
    .page-shell{display:flex;min-height:100vh;}
    @media(max-width:600px){.hide-mobile{display:none!important;}.page-shell{flex-direction:column;}}
  `;
  document.head.appendChild(s);
})();

// ─── Shared Components ────────────────────────────────────────────────────────
function Spinner(){return<div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:40}}><div style={{width:32,height:32,border:`3px solid ${LIGHT}`,borderTop:`3px solid ${RED}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;}
function ErrBox({msg}){return<div style={{background:"#fff0f0",border:"1.5px solid #fca5a5",borderRadius:10,padding:"12px 16px",color:RED,fontSize:13,fontWeight:600}}>⚠️ {msg}</div>;}

function StatusBadge({status}){
  const cfg={
    inside:       {color:"#16a34a",bg:"#f0fdf4",label:"✅ Inside"},
    "checked-out":{color:"#6b7280",bg:"#f3f4f6",label:"Checked Out"},
    pending:      {color:"#d97706",bg:"#fffbeb",label:"⏳ Pending Approval"},
    rejected:     {color:RED,      bg:"#fff0f0",label:"❌ Rejected"},
  };
  const c=cfg[status]||{color:"#6b7280",bg:"#f3f4f6",label:status};
  return<span style={{background:c.bg,color:c.color,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6,border:`1px solid ${c.color}20`}}>{c.label}</span>;
}

function TypeBadge({type}){
  const cfg=VISITOR_TYPES[type];
  if(!cfg)return null;
  return<span style={{background:cfg.bg,color:cfg.color,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6}}>{cfg.icon} {cfg.label}</span>;
}

function VisitorBadge({visitor,onClose}){
  const type=VISITOR_TYPES[visitor.visitor_type]||{};
  return(
    <div style={{background:"#fff",borderRadius:20,overflow:"hidden",width:320,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",fontFamily:"inherit"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${RED},${DARK})`,padding:"20px 20px 28px",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{color:"rgba(255,255,255,0.7)",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Aditya Birla Memorial Hospital</p>
            <p style={{color:"#fff",fontSize:11,marginTop:2,opacity:0.8}}>Visitor Pass</p>
          </div>
          <img src="/abmh-logo-1.png" alt="ABMH" style={{height:32,objectFit:"contain",opacity:0.9}}/>
        </div>
        <div style={{marginTop:16,width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>
          {type.icon||"👤"}
        </div>
      </div>
      {/* Body */}
      <div style={{padding:"16px 20px 20px",marginTop:-12,background:"#fff",borderRadius:"12px 12px 0 0",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <p style={{color:"#1a1a2e",fontWeight:800,fontSize:18,lineHeight:1.2}}>{visitor.name}</p>
            <p style={{color:"#6b7280",fontSize:12,marginTop:3}}>{visitor.company||"—"}</p>
          </div>
          <StatusBadge status={visitor.status}/>
        </div>
        <div style={{background:"#f9fafb",borderRadius:10,padding:12,marginBottom:12}}>
          <p style={{color:"#9ca3af",fontSize:10,fontWeight:700,letterSpacing:0.5,marginBottom:8}}>VISIT DETAILS</p>
          {[
            ["Pass No.",visitor.visitor_id],
            ["Purpose",visitor.purpose],
            ["Host",visitor.host_name],
            ["Department",visitor.department],
            ["Check-in",fmt(visitor.check_in)],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:"#9ca3af",fontSize:11}}>{k}</span>
              <span style={{color:"#1a1a2e",fontSize:11,fontWeight:600,textAlign:"right",maxWidth:160}}>{v||"—"}</span>
            </div>
          ))}
        </div>
        <TypeBadge type={visitor.visitor_type}/>
        <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
          <button onClick={()=>window.print()} style={{...BTN_GHOST,flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Printer size={14}/>Print</button>
          <button onClick={onClose} style={{...BTN_PRIMARY,flex:1}}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── QR Code Generator (inline — no external API) ────────────────────────────
function QRCode({value,size=200}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!ref.current||!value)return;
    function render(){
      try{
        ref.current.innerHTML="";
        new window.QRCode(ref.current,{text:value,width:size,height:size,colorDark:"#1a1a2e",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel.M});
      }catch{
        ref.current.innerHTML=`<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#f9fafb;border-radius:8px;font-size:10px;color:#6b7280;padding:8px;text-align:center;word-break:break-all">${value}</div>`;
      }
    }
    if(window.QRCode){render();return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload=render;s.onerror=()=>{if(ref.current)ref.current.innerHTML=`<a href="${value}" style="font-size:10px;word-break:break-all;color:#0369a1">${value}</a>`;};
    document.head.appendChild(s);
  },[value,size]);
  return<div ref={ref} style={{borderRadius:12,overflow:"hidden",border:"1px solid #e5e7eb",display:"inline-block",minWidth:size,minHeight:size}}/>;
}

// ─── Registration Success + WhatsApp Share ────────────────────────────────────
function RegistrationSuccess({visitor,onDone}){
  const [hostMobile,setHostMobile]=useState("");
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);

  const BASE_URL=window.location.origin;
  const approvalUrl=`${BASE_URL}?approve=${visitor.visitor_id}&token=${visitor.approval_token}`;
  const visitorPassUrl=`${BASE_URL}?pass=${visitor.visitor_id}`;

  const type=VISITOR_TYPES[visitor.visitor_type]||{};

  // WhatsApp message to host
  const waMsg=`🏥 *ABMH Visitor Management*\n\nA visitor is waiting to meet you:\n\n👤 *${visitor.name}*\n🏭 ${visitor.company||"—"}\n📋 ${type.icon} ${type.label}\n💬 Purpose: ${visitor.purpose}\n🪪 ${visitor.id_type}: ${visitor.id_number}\n\n*Please approve or reject their entry:*\n✅ APPROVE: ${approvalUrl}&action=approve\n❌ REJECT: ${approvalUrl}&action=reject\n\n_Pass ID: ${visitor.visitor_id}_`;

  function openWhatsApp(mobile){
    const num=mobile?`91${mobile.replace(/\D/g,"").slice(-10)}`:"";
    const url=num
      ?`https://wa.me/${num}?text=${encodeURIComponent(waMsg)}`
      :`https://wa.me/?text=${encodeURIComponent(waMsg)}`;
    window.open(url,"_blank");
    setSent(true);
  }

  return(
    <div style={{padding:20,maxWidth:480,margin:"0 auto"}}>
      {/* Success banner */}
      <div className="fu" style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:14,padding:"14px 20px",marginBottom:16,textAlign:"center"}}>
        <p style={{color:"#92400e",fontWeight:800,fontSize:15}}>⏳ Awaiting Host Approval</p>
        <p style={{color:"#92400e",fontSize:12,marginTop:3}}>Pass: <strong>{visitor.visitor_id}</strong> · Visitor must wait at reception</p>
      </div>

      {/* QR Code for visitor */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:20,marginBottom:16,textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14,marginBottom:4}}>📱 Visitor Pass QR</p>
        <p style={{color:"#9ca3af",fontSize:12,marginBottom:14}}>Ask visitor to scan — opens their pass on phone</p>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
          <QRCode value={visitorPassUrl} size={180}/>
        </div>
        <p style={{color:"#6b7280",fontSize:11}}>{visitorPassUrl}</p>
      </div>

      {/* Send WhatsApp to host */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:20,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14,marginBottom:4}}>📲 Notify Host for Approval</p>
        <p style={{color:"#9ca3af",fontSize:12,marginBottom:14}}>Send WhatsApp to <strong>{visitor.host_name}</strong> ({visitor.department}) with approve/reject link</p>

        <div style={{marginBottom:12}}>
          <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>HOST MOBILE (optional — for direct message)</p>
          <div style={{display:"flex",gap:8}}>
            <input style={{...INP,flex:1}} placeholder="Host's mobile number" value={hostMobile} onChange={e=>setHostMobile(e.target.value.replace(/\D/g,"").slice(0,10))} type="tel"/>
            <button onClick={()=>openWhatsApp(hostMobile)} style={{...BTN_PRIMARY,background:"#25D366",padding:"10px 14px",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
              <MessageCircle size={16}/>{hostMobile?"Send":"Share"}
            </button>
          </div>
        </div>

        {sent&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",color:"#16a34a",fontSize:12,fontWeight:600}}>✅ WhatsApp opened! Waiting for host response...</div>}
      </div>

      {/* Approval status — auto polls */}
      <ApprovalPoller visitorId={visitor.visitor_id} onApproved={onDone} onRejected={onDone}/>

      <button onClick={onDone} style={{...BTN_GHOST,width:"100%",marginTop:8}}>← Back to Active Visitors</button>
    </div>
  );
}

// ─── Approval Poller — watches DB for host response ──────────────────────────
function ApprovalPoller({visitorId,onApproved,onRejected}){
  const [status,setStatus]=useState("pending");
  const [checking,setChecking]=useState(false);

  useEffect(()=>{
    const iv=setInterval(async()=>{
      try{
        const rows=await sbGet("vms_visitors",`visitor_id=eq.${visitorId}&select=status`);
        if(rows.length>0&&rows[0].status!=="pending"){
          setStatus(rows[0].status);
          clearInterval(iv);
          if(rows[0].status==="inside")setTimeout(onApproved,2000);
          if(rows[0].status==="rejected")setTimeout(onRejected,2000);
        }
      }catch{}
    },4000);
    return()=>clearInterval(iv);
  },[visitorId]);

  if(status==="inside") return(
    <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:12,padding:16,textAlign:"center"}}>
      <p style={{fontSize:28,marginBottom:6}}>✅</p>
      <p style={{color:"#16a34a",fontWeight:800,fontSize:16}}>Approved! Visitor may enter.</p>
    </div>
  );

  if(status==="rejected") return(
    <div style={{background:"#fff0f0",border:"1.5px solid #fca5a5",borderRadius:12,padding:16,textAlign:"center"}}>
      <p style={{fontSize:28,marginBottom:6}}>❌</p>
      <p style={{color:RED,fontWeight:800,fontSize:16}}>Entry Rejected by Host</p>
      <p style={{color:"#6b7280",fontSize:12,marginTop:4}}>Please inform the visitor and ask them to leave.</p>
    </div>
  );

  return(
    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:14,display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:20,height:20,border:"2px solid #d97706",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
      <div>
        <p style={{color:"#92400e",fontWeight:700,fontSize:13}}>Waiting for host approval...</p>
        <p style={{color:"#b45309",fontSize:11,marginTop:2}}>Checking every 4 seconds</p>
      </div>
    </div>
  );
}

// ─── Approval Page — opens when host clicks WhatsApp link ─────────────────────
function ApprovalPage({visitorId,token,action}){
  const [visitor,setVisitor]=useState(null);
  const [loading,setLoading]=useState(true);
  const [done,setDone]=useState(false);
  const [err,setErr]=useState("");

  useEffect(()=>{
    loadVisitor();
    // Auto-action if action param present
  },[]);

  async function loadVisitor(){
    try{
      const rows=await sbGet("vms_visitors",`visitor_id=eq.${visitorId}`);
      if(rows.length>0){
        setVisitor(rows[0]);
        // If action in URL, auto-process
        if(action==="approve"&&rows[0].status==="pending") await processAction("inside",rows[0]);
        if(action==="reject"&&rows[0].status==="pending") await processAction("rejected",rows[0]);
      } else setErr("Visitor not found.");
    }catch(e){setErr("Failed to load.");}
    setLoading(false);
  }

  async function processAction(newStatus,v){
    const vis=v||visitor;
    if(!vis||vis.approval_token!==token){setErr("Invalid or expired link.");return;}
    if(vis.status!=="pending"){setDone(true);return;}
    try{
      await sbPatch("vms_visitors",`visitor_id=eq.${visitorId}&approval_token=eq.${token}`,{
        status:newStatus,
        ...(newStatus==="inside"?{check_in:new Date().toISOString()}:{})
      });
      setVisitor(v=>({...v,status:newStatus}));
      setDone(newStatus);
    }catch(e){setErr("Action failed.");}
  }

  if(loading)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner/></div>;

  const type=visitor?VISITOR_TYPES[visitor.visitor_type]||{}:{};

  return(
    <div style={{minHeight:"100vh",background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <img src="/abmh-logo-1.png" alt="ABMH" style={{height:40,objectFit:"contain",marginBottom:8}}/>
          <p style={{color:"#1a1a2e",fontWeight:800,fontSize:16}}>Visitor Entry Approval</p>
        </div>

        {err&&<ErrBox msg={err}/>}

        {done==="inside"&&(
          <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:16,padding:24,textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:8}}>✅</p>
            <p style={{color:"#16a34a",fontWeight:800,fontSize:18}}>Entry Approved!</p>
            <p style={{color:"#166534",fontSize:13,marginTop:6}}>Visitor has been allowed inside. Reception has been notified.</p>
          </div>
        )}

        {done==="rejected"&&(
          <div style={{background:"#fff0f0",border:"1.5px solid #fca5a5",borderRadius:16,padding:24,textAlign:"center"}}>
            <p style={{fontSize:40,marginBottom:8}}>❌</p>
            <p style={{color:RED,fontWeight:800,fontSize:18}}>Entry Rejected</p>
            <p style={{color:"#6b7280",fontSize:13,marginTop:6}}>The visitor has been turned away. Reception has been notified.</p>
          </div>
        )}

        {!done&&visitor&&(
          <div style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
            {visitor.status!=="pending"?(
              <div style={{textAlign:"center",padding:12}}>
                <p style={{color:"#6b7280",fontSize:14}}>This request has already been {visitor.status==="inside"?"approved":"rejected"}.</p>
              </div>
            ):(
              <>
                <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <span style={{fontSize:28}}>{type.icon}</span>
                    <div>
                      <p style={{color:"#1a1a2e",fontWeight:800,fontSize:16}}>{visitor.name}</p>
                      <p style={{color:"#6b7280",fontSize:12}}>{visitor.company||"—"}</p>
                    </div>
                  </div>
                  {[["Purpose",visitor.purpose],["Department",visitor.department],["ID",`${visitor.id_type}: ${visitor.id_number}`],["Registered",fmt(visitor.check_in)]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <span style={{color:"#9ca3af",fontSize:12}}>{k}</span>
                      <span style={{color:"#374151",fontSize:12,fontWeight:600,textAlign:"right",maxWidth:200}}>{v}</span>
                    </div>
                  ))}
                </div>
                <p style={{color:"#374151",fontSize:13,fontWeight:600,marginBottom:12,textAlign:"center"}}>Do you approve this visitor's entry?</p>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>processAction("rejected")} style={{flex:1,padding:"14px",borderRadius:12,border:"2px solid #fca5a5",background:"#fff0f0",color:RED,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <ThumbsDown size={18}/>Reject
                  </button>
                  <button onClick={()=>processAction("inside")} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:"#16a34a",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <ThumbsUp size={18}/>Approve
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Visitor Pass Page — opens when visitor scans QR ─────────────────────────
function VisitorPassPage({visitorId}){
  const [visitor,setVisitor]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    sbGet("vms_visitors",`visitor_id=eq.${visitorId}`)
      .then(rows=>setVisitor(rows[0]||null))
      .catch(()=>{})
      .finally(()=>setLoading(false));
    // Poll for status updates
    const iv=setInterval(()=>{
      sbGet("vms_visitors",`visitor_id=eq.${visitorId}&select=status`).then(rows=>{
        if(rows[0])setVisitor(v=>({...v,status:rows[0].status}));
      }).catch(()=>{});
    },5000);
    return()=>clearInterval(iv);
  },[visitorId]);

  if(loading)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner/></div>;
  if(!visitor)return<div style={{padding:32,textAlign:"center",color:"#9ca3af"}}>Pass not found.</div>;

  const type=VISITOR_TYPES[visitor.visitor_type]||{};
  const statusMsg={
    pending:{icon:"⏳",color:"#d97706",bg:"#fffbeb",text:"Waiting for host approval..."},
    inside:{icon:"✅",color:"#16a34a",bg:"#f0fdf4",text:"Entry Approved — You may proceed!"},
    rejected:{icon:"❌",color:RED,bg:"#fff0f0",text:"Entry has been rejected."},
    "checked-out":{icon:"👋",color:"#6b7280",bg:"#f3f4f6",text:"Visit completed. Thank you!"},
  };
  const s=statusMsg[visitor.status]||statusMsg.pending;

  return(
    <div style={{minHeight:"100vh",background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{background:s.bg,border:`1.5px solid ${s.color}30`,borderRadius:14,padding:"14px 20px",textAlign:"center",marginBottom:16}}>
          <p style={{fontSize:28}}>{s.icon}</p>
          <p style={{color:s.color,fontWeight:800,fontSize:15,marginTop:4}}>{s.text}</p>
          {visitor.status==="pending"&&<p style={{color:s.color,fontSize:11,marginTop:4}}>This page updates automatically</p>}
        </div>
        <VisitorBadge visitor={visitor} onClose={()=>{}}/>
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [role,setRole]=useState("reception");
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const CREDS={
    reception:{id:"reception",password:"reception123",name:"Reception",role:"reception"},
    admin:{id:"admin",password:"admin123",name:"Admin",role:"admin"},
  };

  async function handleLogin(){
    setErr("");setLoading(true);
    try{
      if(role==="reception"||role==="admin"){
        const c=CREDS[role];
        const pwd=localStorage.getItem(`abmh_vms_pwd_${role}`)||c.password;
        if(user.trim()===c.id&&pass===pwd){
          onLogin({role,name:c.name});
        } else setErr("Invalid credentials");
      } else {
        // Dept head login — check hosts table
        const rows=await sbGet("vms_hosts",`employee_id=eq.${user.trim()}&order=name.asc`);
        if(rows.length>0){
          const h=rows[0];
          const pwd=localStorage.getItem(`abmh_vms_host_${h.employee_id}`)||h.password;
          if(pass===pwd) onLogin({role:"host",name:h.name,dept:h.department,empId:h.employee_id});
          else setErr("Invalid password");
        } else setErr("Employee ID not found");
      }
    }catch(e){setErr("Login failed. Please try again.");}
    setLoading(false);
  }

  return(
    <div style={{minHeight:"100vh",background:"#f5f6fa",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div className="fu" style={{width:"100%",maxWidth:400}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <img src="/abmh-logo-1.png" alt="ABMH" style={{height:48,objectFit:"contain",marginBottom:12}}/>
          <h1 style={{color:"#1a1a2e",fontSize:20,fontWeight:800}}>Visitor Management</h1>
          <p style={{color:"#6b7280",fontSize:13,marginTop:4}}>Aditya Birla Memorial Hospital</p>
        </div>

        <div style={{background:"#fff",borderRadius:20,padding:24,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
          {/* Role tabs */}
          <div style={{display:"flex",gap:6,background:"#f3f4f6",borderRadius:10,padding:4,marginBottom:20}}>
            {[["reception","🛡️ Reception"],["host","🏥 Dept Head"],["admin","⚙️ Admin"]].map(([r,l])=>(
              <button key={r} onClick={()=>{setRole(r);setErr("");setUser("");setPass("");}}
                style={{flex:1,padding:"8px 4px",borderRadius:7,border:"none",background:role===r?"#fff":"transparent",color:role===r?"#1a1a2e":"#6b7280",fontWeight:role===r?700:500,fontSize:11,cursor:"pointer",boxShadow:role===r?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all .2s",fontFamily:"inherit"}}>
                {l}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>{role==="host"?"EMPLOYEE ID":"USERNAME"}</p>
              <input style={INP} placeholder={role==="host"?"Enter Employee ID":"Enter username"} value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            </div>
            <div>
              <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>PASSWORD</p>
              <input style={INP} type="password" placeholder="Enter password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            </div>
            {err&&<ErrBox msg={err}/>}
            <button onClick={handleLogin} disabled={loading} style={{...BTN_PRIMARY,width:"100%",marginTop:4,opacity:loading?0.7:1}}>
              {loading?"Logging in...":"Login →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Register Visitor Form ─────────────────────────────────────────────────────
function RegisterVisitor({onDone}){
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({
    name:"",company:"",mobile:"",id_type:"Aadhaar Card",id_number:"",
    visitor_type:"vendor",department:"",host_name:"",purpose:"",items_carried:"",
  });
  const [err,setErr]=useState("");
  const [saving,setSaving]=useState(false);
  const [registered,setRegistered]=useState(null);

  function set(k,v){setForm(f=>({...f,[k]:v}));}

  function validateStep1(){
    if(!form.name.trim())return"Visitor name is required";
    if(!form.mobile.trim()||form.mobile.length<10)return"Valid mobile number required";
    if(!form.id_number.trim())return"ID number is required";
    return"";
  }
  function validateStep2(){
    if(!form.department)return"Department is required";
    if(!form.host_name.trim())return"Host name is required";
    if(!form.purpose.trim())return"Purpose is required";
    return"";
  }

  async function submit(){
    const e=validateStep2();
    if(e){setErr(e);return;}
    setSaving(true);setErr("");
    try{
      const visitor_id=genVisitorId();
      const payload={
        visitor_id,
        name:form.name.trim(),
        company:form.company.trim(),
        mobile:form.mobile.trim(),
        id_type:form.id_type,
        id_number:form.id_number.trim(),
        visitor_type:form.visitor_type,
        department:form.department,
        host_name:form.host_name.trim(),
        purpose:form.purpose.trim(),
        items_carried:form.items_carried.trim(),
        status:"pending",
        approval_token:Math.random().toString(36).slice(2,10).toUpperCase(),
        check_in:new Date().toISOString(),
        check_out:null,
      };
      const rows=await sbPost("vms_visitors",payload);
      setRegistered(Array.isArray(rows)?rows[0]:rows);
    }catch(e){setErr("Registration failed: "+e.message);}
    setSaving(false);
  }

  if(registered){
    return <RegistrationSuccess visitor={registered} onDone={onDone}/>;
  }

  return(
    <div style={{padding:20,maxWidth:520,margin:"0 auto"}}>
      {/* Progress */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
        {[1,2].map(s=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:step>=s?RED:"#e5e7eb",color:step>=s?"#fff":"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{step>s?<Check size={14}/>:s}</div>
            <span style={{color:step>=s?"#1a1a2e":"#9ca3af",fontSize:12,fontWeight:step>=s?600:400}}>{s===1?"Visitor Info":"Visit Details"}</span>
            {s<2&&<div style={{flex:1,height:2,background:step>s?RED:"#e5e7eb",width:40,borderRadius:1}}/>}
          </div>
        ))}
      </div>

      {step===1&&(
        <div className="fu" style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>VISITOR TYPE</p>
            <div style={{display:"flex",gap:8}}>
              {Object.entries(VISITOR_TYPES).map(([k,v])=>(
                <button key={k} onClick={()=>set("visitor_type",k)} style={{flex:1,padding:"10px 4px",borderRadius:10,border:`2px solid ${form.visitor_type===k?v.color:"#e5e7eb"}`,background:form.visitor_type===k?v.bg:"#fff",color:form.visitor_type===k?v.color:"#6b7280",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>
                  <p style={{fontSize:18,marginBottom:3}}>{v.icon}</p>
                  <p>{v.label.split("/")[0].trim()}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>FULL NAME *</p>
            <input style={INP} placeholder="Visitor's full name" value={form.name} onChange={e=>set("name",e.target.value)}/>
          </div>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>COMPANY / ORGANIZATION</p>
            <input style={INP} placeholder="Company name (optional)" value={form.company} onChange={e=>set("company",e.target.value)}/>
          </div>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>MOBILE NUMBER *</p>
            <input style={INP} placeholder="10-digit mobile number" value={form.mobile} onChange={e=>set("mobile",e.target.value.replace(/\D/g,"").slice(0,10))} type="tel"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>ID TYPE *</p>
              <select style={INP} value={form.id_type} onChange={e=>set("id_type",e.target.value)}>
                {ID_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>ID NUMBER *</p>
              <input style={INP} placeholder="ID number" value={form.id_number} onChange={e=>set("id_number",e.target.value)}/>
            </div>
          </div>
          {err&&<ErrBox msg={err}/>}
          <button onClick={()=>{const e=validateStep1();if(e){setErr(e);return;}setErr("");setStep(2);}} style={{...BTN_PRIMARY,width:"100%"}}>Next →</button>
        </div>
      )}

      {step===2&&(
        <div className="fu" style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>DEPARTMENT TO VISIT *</p>
            <select style={INP} value={form.department} onChange={e=>set("department",e.target.value)}>
              <option value="">Select department</option>
              {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>HOST / PERSON TO MEET *</p>
            <input style={INP} placeholder="Name of person to meet" value={form.host_name} onChange={e=>set("host_name",e.target.value)}/>
          </div>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>PURPOSE OF VISIT *</p>
            <textarea style={{...INP,height:80,resize:"none"}} placeholder="Brief purpose of visit" value={form.purpose} onChange={e=>set("purpose",e.target.value)}/>
          </div>
          <div>
            <p style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:5}}>ITEMS / EQUIPMENT CARRIED</p>
            <input style={INP} placeholder="e.g. Laptop, Tools (optional)" value={form.items_carried} onChange={e=>set("items_carried",e.target.value)}/>
          </div>
          {err&&<ErrBox msg={err}/>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setStep(1);setErr("");}} style={{...BTN_GHOST,flex:1}}>← Back</button>
            <button onClick={submit} disabled={saving} style={{...BTN_PRIMARY,flex:2,opacity:saving?0.7:1}}>{saving?"Registering...":"Register & Generate Pass"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Self Check-out Kiosk ──────────────────────────────────────────────────────
function CheckoutKiosk(){
  const [search,setSearch]=useState("");
  const [visitor,setVisitor]=useState(null);
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const [err,setErr]=useState("");

  async function findVisitor(){
    if(!search.trim())return;
    setLoading(true);setErr("");setVisitor(null);
    try{
      const rows=await sbGet("vms_visitors",`status=eq.inside&or=(visitor_id.ilike.*${search}*,mobile.ilike.*${search}*)&order=check_in.desc&limit=eq.5`);
      if(rows.length===0)setErr("No active visitor found with this Pass ID or Mobile.");
      else if(rows.length===1)setVisitor(rows[0]);
      else setVisitor(rows); // multiple results
    }catch(e){setErr("Search failed.");}
    setLoading(false);
  }

  async function checkout(v){
    setLoading(true);
    try{
      await sbPatch("vms_visitors",`visitor_id=eq.${v.visitor_id}`,{status:"checked-out",check_out:new Date().toISOString()});
      setDone(true);setVisitor(null);
    }catch(e){setErr("Checkout failed.");}
    setLoading(false);
  }

  if(done){
    return(
      <div style={{padding:24,textAlign:"center"}} className="fu">
        <div style={{fontSize:48,marginBottom:12}}>✅</div>
        <p style={{color:"#16a34a",fontWeight:800,fontSize:20,marginBottom:8}}>Checked Out Successfully!</p>
        <p style={{color:"#6b7280",fontSize:14,marginBottom:20}}>Thank you for visiting ABMH</p>
        <button onClick={()=>{setDone(false);setSearch("");setErr("");}} style={BTN_PRIMARY}>New Search</button>
      </div>
    );
  }

  return(
    <div style={{padding:20,maxWidth:480,margin:"0 auto"}}>
      <div style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",marginBottom:16}}>
        <p style={{color:"#1a1a2e",fontWeight:800,fontSize:16,marginBottom:4}}>🚪 Self Check-out</p>
        <p style={{color:"#6b7280",fontSize:13,marginBottom:16}}>Enter your Pass ID or Mobile number</p>
        <div style={{display:"flex",gap:8}}>
          <input style={{...INP,flex:1}} placeholder="Pass ID or Mobile number" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&findVisitor()}/>
          <button onClick={findVisitor} disabled={loading} style={{...BTN_PRIMARY,padding:"10px 16px"}}>{loading?<RefreshCw size={16}/>:<Search size={16}/>}</button>
        </div>
        {err&&<div style={{marginTop:10}}><ErrBox msg={err}/></div>}
      </div>

      {Array.isArray(visitor)&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <p style={{color:"#374151",fontSize:13,fontWeight:600}}>Multiple visitors found — select yours:</p>
          {visitor.map(v=>(
            <div key={v.visitor_id} onClick={()=>setVisitor(v)} style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,padding:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14}}>{v.name}</p>
                <p style={{color:"#6b7280",fontSize:12}}>{v.visitor_id} · {v.department}</p>
              </div>
              <ChevronDown size={16} color="#9ca3af" style={{transform:"rotate(-90deg)"}}/>
            </div>
          ))}
        </div>
      )}

      {visitor&&!Array.isArray(visitor)&&(
        <div className="fu" style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <p style={{color:"#1a1a2e",fontWeight:800,fontSize:16}}>{visitor.name}</p>
              <p style={{color:"#6b7280",fontSize:12}}>{visitor.company||"—"}</p>
            </div>
            <TypeBadge type={visitor.visitor_type}/>
          </div>
          {[["Pass ID",visitor.visitor_id],["Department",visitor.department],["Host",visitor.host_name],["Check-in",fmt(visitor.check_in)]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f9fafb"}}>
              <span style={{color:"#9ca3af",fontSize:12}}>{k}</span>
              <span style={{color:"#1a1a2e",fontSize:12,fontWeight:600}}>{v}</span>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button onClick={()=>{setVisitor(null);setSearch("");}} style={{...BTN_GHOST,flex:1}}>Cancel</button>
            <button onClick={()=>checkout(visitor)} disabled={loading} style={{...BTN_PRIMARY,flex:2,background:"#16a34a",opacity:loading?0.7:1}}>{loading?"Processing...":"✓ Confirm Check-out"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reception App ────────────────────────────────────────────────────────────
function ReceptionApp({onLogout}){
  const [tab,setTab]=useState("active"); // active | register | checkout
  const [visitors,setVisitors]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);

  async function load(){
    setLoading(true);
    try{const rows=await sbGet("vms_visitors","order=check_in.desc&limit=eq.100");setVisitors(rows);}
    catch(e){}
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  const active=visitors.filter(v=>v.status==="inside");
  const filtered=visitors.filter(v=>{
    const q=search.toLowerCase();
    return!q||v.name?.toLowerCase().includes(q)||v.visitor_id?.toLowerCase().includes(q)||v.department?.toLowerCase().includes(q)||v.mobile?.includes(q);
  });

  const NAV=[["active","👥","Active"],["register","➕","Register"],["checkout","🚪","Check-out"]];

  return(
    <div style={{minHeight:"100vh",background:"#f5f6fa",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto",position:"relative"}}>
      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:10,background:"#fff",borderBottom:"1px solid #e5e7eb",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <div style={{height:4,background:`linear-gradient(90deg,${RED},${DARK})`}}/>
        <div style={{padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/abmh-logo-1.png" alt="ABMH" style={{height:30,objectFit:"contain"}}/>
            <div>
              <p style={{color:"#1a1a2e",fontWeight:800,fontSize:13}}>Visitor Management</p>
              <p style={{color:"#9ca3af",fontSize:11}}>Reception</p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{background:LIGHT,border:`1px solid ${RED}20`,borderRadius:8,padding:"4px 10px",textAlign:"center"}}>
              <p style={{color:RED,fontWeight:800,fontSize:16,lineHeight:1}}>{active.length}</p>
              <p style={{color:RED,fontSize:9,fontWeight:600}}>INSIDE</p>
            </div>
            <button onClick={onLogout} style={{...BTN_GHOST,padding:"6px 10px",display:"flex",alignItems:"center",gap:4}}><LogOut size={14}/>Out</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:70}}>
        {tab==="register"&&<RegisterVisitor onDone={()=>{setTab("active");load();}}/>}
        {tab==="checkout"&&<CheckoutKiosk/>}
        {tab==="active"&&(
          <div style={{padding:16}}>
            {/* Search */}
            <div style={{position:"relative",marginBottom:14}}>
              <Search size={14} color="#9ca3af" style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
              <input style={{...INP,paddingLeft:34}} placeholder="Search by name, pass ID, mobile..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[["Inside",active.length,RED],["Today",visitors.filter(v=>new Date(v.check_in).toDateString()===new Date().toDateString()).length,"#0369a1"],["Total",visitors.length,"#374151"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",borderRadius:12,padding:"10px",textAlign:"center",border:"1.5px solid #e5e7eb"}}>
                  <p style={{color:c,fontWeight:800,fontSize:20,lineHeight:1}}>{v}</p>
                  <p style={{color:"#9ca3af",fontSize:11,marginTop:2}}>{l}</p>
                </div>
              ))}
            </div>
            {loading?<Spinner/>:(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filtered.length===0?<div style={{textAlign:"center",padding:32,color:"#9ca3af",fontSize:13}}>No visitors found</div>:
                filtered.map(v=>(
                  <div key={v.id} onClick={()=>setSelected(v)} style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:14,padding:14,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{flex:1}}>
                        <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14}}>{v.name}</p>
                        <p style={{color:"#6b7280",fontSize:12}}>{v.company||v.visitor_id}</p>
                      </div>
                      <StatusBadge status={v.status}/>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <TypeBadge type={v.visitor_type}/>
                      <span style={{background:"#f3f4f6",color:"#374151",fontSize:11,padding:"2px 8px",borderRadius:5,fontWeight:600}}>{v.department}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                      <span style={{color:"#9ca3af",fontSize:11}}>Host: {v.host_name}</span>
                      <span style={{color:"#9ca3af",fontSize:11}}>{timeAgo(v.check_in)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #e5e7eb",display:"flex",boxShadow:"0 -2px 8px rgba(0,0,0,0.06)"}}>
        {NAV.map(([id,icon,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"12px 0 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"inherit"}}>
            <span style={{fontSize:18}}>{icon}</span>
            <span style={{fontSize:10,color:tab===id?RED:"#9ca3af",fontWeight:tab===id?700:500}}>{label}</span>
          </button>
        ))}
      </div>

      {/* Visitor detail modal */}
      {selected&&createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setSelected(null)}>
          <div className="fu" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <p style={{color:"#1a1a2e",fontWeight:800,fontSize:16}}>Visitor Details</p>
              <button onClick={()=>setSelected(null)} style={{background:"#f3f4f6",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={14}/></button>
            </div>
            <VisitorBadge visitor={selected} onClose={()=>setSelected(null)}/>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Dept Head (Host) App ──────────────────────────────────────────────────────
function HostApp({user,onLogout}){
  const [visitors,setVisitors]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("all");

  async function load(){
    setLoading(true);
    try{
      const rows=await sbGet("vms_visitors",`department=eq.${encodeURIComponent(user.dept)}&order=check_in.desc&limit=eq.50`);
      setVisitors(rows);
    }catch(e){}
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  const filtered=filter==="all"?visitors:visitors.filter(v=>v.status===filter);
  const inside=visitors.filter(v=>v.status==="inside").length;

  return(
    <div style={{minHeight:"100vh",background:"#f5f6fa",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#fff",borderBottom:"1px solid #e5e7eb",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        <div style={{height:4,background:`linear-gradient(90deg,${RED},${DARK})`}}/>
        <div style={{padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{color:"#1a1a2e",fontWeight:800,fontSize:14}}>{user.name}</p>
            <p style={{color:"#9ca3af",fontSize:11}}>🏥 {user.dept}</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={load} style={{...BTN_GHOST,padding:"6px 10px"}}>↻</button>
            <button onClick={onLogout} style={{...BTN_GHOST,padding:"6px 10px",display:"flex",alignItems:"center",gap:4}}><LogOut size={14}/>Out</button>
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[["Currently Inside",inside,RED,LIGHT],["Total Today",visitors.filter(v=>new Date(v.check_in).toDateString()===new Date().toDateString()).length,"#0369a1","#eff6ff"]].map(([l,v,c,bg])=>(
            <div key={l} style={{background:bg,borderRadius:14,padding:"14px 16px",border:`1.5px solid ${c}20`}}>
              <p style={{color:c,fontWeight:800,fontSize:24,lineHeight:1}}>{v}</p>
              <p style={{color:c,fontSize:12,marginTop:4,fontWeight:600}}>{l}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["all","All"],["inside","Inside"],["checked-out","Checked Out"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${filter===v?RED:"#e5e7eb"}`,background:filter===v?LIGHT:"#fff",color:filter===v?RED:"#6b7280",fontSize:12,fontWeight:filter===v?700:500,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>

        {loading?<Spinner/>:filtered.length===0?<div style={{textAlign:"center",padding:32,color:"#9ca3af",fontSize:13}}>No visitors</div>:(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(v=>(
              <div key={v.id} style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:14,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14}}>{v.name}</p>
                    <p style={{color:"#6b7280",fontSize:12}}>{v.company||"—"}</p>
                  </div>
                  <StatusBadge status={v.status}/>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                  <TypeBadge type={v.visitor_type}/>
                </div>
                {[["Purpose",v.purpose],["Host",v.host_name],["Check-in",fmt(v.check_in)],v.check_out&&["Check-out",fmt(v.check_out)]].filter(Boolean).map(([k,val])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f9fafb"}}>
                    <span style={{color:"#9ca3af",fontSize:11}}>{k}</span>
                    <span style={{color:"#374151",fontSize:11,fontWeight:600,textAlign:"right",maxWidth:200}}>{val}</span>
                  </div>
                ))}
                {v.items_carried&&<p style={{color:"#6b7280",fontSize:11,marginTop:6}}>🎒 {v.items_carried}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin App ────────────────────────────────────────────────────────────────
function AdminApp({onLogout}){
  const [tab,setTab]=useState("dashboard");
  const [visitors,setVisitors]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [filterType,setFilterType]=useState("all");
  const [filterStatus,setFilterStatus]=useState("all");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");

  async function load(){
    setLoading(true);
    try{const rows=await sbGet("vms_visitors","order=check_in.desc&limit=eq.500");setVisitors(rows);}
    catch(e){}
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  const today=visitors.filter(v=>new Date(v.check_in).toDateString()===new Date().toDateString());
  const inside=visitors.filter(v=>v.status==="inside");

  const filtered=visitors.filter(v=>{
    if(filterType!=="all"&&v.visitor_type!==filterType)return false;
    if(filterStatus!=="all"&&v.status!==filterStatus)return false;
    if(dateFrom&&new Date(v.check_in)<new Date(dateFrom))return false;
    if(dateTo&&new Date(v.check_in)>new Date(dateTo+" 23:59:59"))return false;
    const q=search.toLowerCase();
    if(q&&!v.name?.toLowerCase().includes(q)&&!v.visitor_id?.toLowerCase().includes(q)&&!v.department?.toLowerCase().includes(q)&&!v.mobile?.includes(q))return false;
    return true;
  });

  function downloadCSV(){
    const h=["Pass ID","Name","Company","Mobile","ID Type","ID No","Type","Department","Host","Purpose","Items","Status","Check-in","Check-out"];
    const rows=filtered.map(v=>[v.visitor_id,v.name,v.company,v.mobile,v.id_type,v.id_number,VISITOR_TYPES[v.visitor_type]?.label||v.visitor_type,v.department,v.host_name,v.purpose,v.items_carried,v.status,fmt(v.check_in),fmt(v.check_out)]);
    const csv=[h,...rows].map(r=>r.map(c=>`"${(c||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=`ABMH_Visitors_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  }

  // By dept stats
  const byDept=DEPARTMENTS.map(d=>({dept:d,count:visitors.filter(v=>v.department===d).length})).filter(d=>d.count>0).sort((a,b)=>b.count-a.count).slice(0,8);
  const byType=Object.entries(VISITOR_TYPES).map(([k,v])=>({...v,key:k,count:visitors.filter(vis=>vis.visitor_type===k).length}));

  const SIDEBAR=[["dashboard","📊","Dashboard"],["visitors","👥","Visitors"],["reports","📈","Reports"]];

  return(
    <div className="page-shell" style={{minHeight:"100vh",background:"#f5f6fa"}}>
      {/* Sidebar */}
      <div style={{width:200,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
        <div style={{padding:16,borderBottom:"1px solid #e5e7eb"}}>
          <img src="/abmh-logo-1.png" alt="ABMH" style={{height:32,objectFit:"contain",marginBottom:8}}/>
          <p style={{color:"#1a1a2e",fontWeight:800,fontSize:12}}>Visitor Management</p>
          <p style={{color:"#9ca3af",fontSize:11}}>Admin Dashboard</p>
        </div>
        <nav style={{flex:1,padding:10}}>
          {SIDEBAR.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"none",background:tab===id?LIGHT:"transparent",color:tab===id?RED:"#6b7280",fontWeight:tab===id?700:500,fontSize:13,cursor:"pointer",marginBottom:2,fontFamily:"inherit",textAlign:"left"}}>
              <span style={{fontSize:16}}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{padding:12,borderTop:"1px solid #e5e7eb"}}>
          <button onClick={onLogout} style={{...BTN_GHOST,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><LogOut size={14}/>Logout</button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        {tab==="dashboard"&&(
          <div className="fu">
            <h2 style={{color:"#1a1a2e",fontSize:20,fontWeight:800,marginBottom:4}}>Dashboard</h2>
            <p style={{color:"#6b7280",fontSize:13,marginBottom:20}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
              {[["Total Visitors",visitors.length,RED,"👥"],["Currently Inside",inside.length,"#16a34a","🏥"],["Today's Visits",today.length,"#0369a1","📅"],["Checked Out",visitors.filter(v=>v.status==="checked-out").length,"#6b7280","🚪"]].map(([l,v,c,ic])=>(
                <div key={l} style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <p style={{color:c,fontWeight:800,fontSize:28,lineHeight:1}}>{v}</p>
                      <p style={{color:"#6b7280",fontSize:12,marginTop:4}}>{l}</p>
                    </div>
                    <span style={{fontSize:24}}>{ic}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
              {/* By Type */}
              <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14,marginBottom:14}}>By Visitor Type</p>
                {byType.map(t=>(
                  <div key={t.key} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:13,color:"#374151",fontWeight:600}}>{t.icon} {t.label}</span>
                      <span style={{fontSize:13,color:t.color,fontWeight:700}}>{t.count}</span>
                    </div>
                    <div style={{height:8,background:"#f3f4f6",borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:`${visitors.length?t.count/visitors.length*100:0}%`,height:"100%",background:t.color,borderRadius:4,transition:"width .8s"}}/>
                    </div>
                  </div>
                ))}
              </div>
              {/* By Dept */}
              <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14,marginBottom:14}}>Top Departments</p>
                {byDept.length===0?<p style={{color:"#9ca3af",fontSize:13}}>No data yet</p>:byDept.map((d,i)=>(
                  <div key={d.dept} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{color:"#9ca3af",fontSize:11,minWidth:14}}>{i+1}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontSize:12,color:"#374151",fontWeight:600}}>{d.dept}</span>
                        <span style={{fontSize:12,color:RED,fontWeight:700}}>{d.count}</span>
                      </div>
                      <div style={{height:6,background:"#f3f4f6",borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${byDept[0].count?d.count/byDept[0].count*100:0}%`,height:"100%",background:RED,borderRadius:3}}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent */}
            <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:18,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14,marginBottom:14}}>Recent Visitors</p>
              {loading?<Spinner/>:(
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Name","Type","Department","Host","Status","Check-in"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",color:"#9ca3af",fontSize:11,fontWeight:700,borderBottom:"1px solid #f3f4f6"}}>{h}</th>)}</tr></thead>
                  <tbody>{visitors.slice(0,10).map(v=>(
                    <tr key={v.id} style={{borderBottom:"1px solid #f9fafb"}}>
                      <td style={{padding:"10px",fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{v.name}<br/><span style={{color:"#9ca3af",fontSize:11,fontWeight:400}}>{v.company||""}</span></td>
                      <td style={{padding:"10px"}}><TypeBadge type={v.visitor_type}/></td>
                      <td style={{padding:"10px",fontSize:12,color:"#374151"}}>{v.department}</td>
                      <td style={{padding:"10px",fontSize:12,color:"#374151"}}>{v.host_name}</td>
                      <td style={{padding:"10px"}}><StatusBadge status={v.status}/></td>
                      <td style={{padding:"10px",fontSize:12,color:"#6b7280"}}>{timeAgo(v.check_in)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab==="visitors"&&(
          <div className="fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{color:"#1a1a2e",fontSize:20,fontWeight:800}}>All Visitors</h2>
              <button onClick={load} style={{...BTN_GHOST,display:"flex",alignItems:"center",gap:6}}><RefreshCw size={14}/>Refresh</button>
            </div>

            {/* Filters */}
            <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:14,padding:16,marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div style={{flex:1,minWidth:160}}>
                <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>SEARCH</p>
                <div style={{position:"relative"}}>
                  <Search size={13} color="#9ca3af" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
                  <input style={{...INP,paddingLeft:30}} placeholder="Name, Pass ID, Mobile..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
              </div>
              <div>
                <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>TYPE</p>
                <select style={{...INP,width:150}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  {Object.entries(VISITOR_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>STATUS</p>
                <select style={{...INP,width:140}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="inside">Inside</option>
                  <option value="checked-out">Checked Out</option>
                </select>
              </div>
              <div>
                <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>FROM</p>
                <input type="date" style={{...INP,width:140}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              </div>
              <div>
                <p style={{color:"#6b7280",fontSize:11,fontWeight:600,marginBottom:4}}>TO</p>
                <input type="date" style={{...INP,width:140}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
              </div>
              <button onClick={downloadCSV} style={{...BTN_PRIMARY,display:"flex",alignItems:"center",gap:6,padding:"10px 16px"}}><Download size={14}/>CSV</button>
            </div>

            <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <p style={{padding:"12px 16px",color:"#6b7280",fontSize:12,borderBottom:"1px solid #f3f4f6"}}>{filtered.length} records</p>
              {loading?<Spinner/>:(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
                    <thead><tr style={{background:"#f9fafb"}}>{["Pass ID","Name","Company","Type","Department","Host","Purpose","Status","Check-in","Check-out"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",color:"#6b7280",fontSize:11,fontWeight:700,borderBottom:"1px solid #e5e7eb",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                    <tbody>{filtered.map(v=>(
                      <tr key={v.id} style={{borderBottom:"1px solid #f9fafb"}}>
                        <td style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:RED,whiteSpace:"nowrap"}}>{v.visitor_id}</td>
                        <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:"#1a1a2e",whiteSpace:"nowrap"}}>{v.name}</td>
                        <td style={{padding:"10px 14px",fontSize:12,color:"#6b7280"}}>{v.company||"—"}</td>
                        <td style={{padding:"10px 14px"}}><TypeBadge type={v.visitor_type}/></td>
                        <td style={{padding:"10px 14px",fontSize:12,color:"#374151"}}>{v.department}</td>
                        <td style={{padding:"10px 14px",fontSize:12,color:"#374151"}}>{v.host_name}</td>
                        <td style={{padding:"10px 14px",fontSize:12,color:"#6b7280",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.purpose}</td>
                        <td style={{padding:"10px 14px"}}><StatusBadge status={v.status}/></td>
                        <td style={{padding:"10px 14px",fontSize:11,color:"#6b7280",whiteSpace:"nowrap"}}>{fmt(v.check_in)}</td>
                        <td style={{padding:"10px 14px",fontSize:11,color:"#6b7280",whiteSpace:"nowrap"}}>{fmt(v.check_out)||"—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="reports"&&(
          <div className="fu">
            <h2 style={{color:"#1a1a2e",fontSize:20,fontWeight:800,marginBottom:20}}>Reports</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[
                ["Total Visits",visitors.length,"All time","#0369a1"],
                ["Today",today.length,"Visits today",RED],
                ["Avg Duration",visitors.filter(v=>v.check_out).length>0?
                  Math.round(visitors.filter(v=>v.check_out).reduce((a,v)=>(new Date(v.check_out)-new Date(v.check_in))/3600000+a,0)/visitors.filter(v=>v.check_out).length*10)/10:0,
                  "Hours avg","#16a34a"],
                ["Pending Checkout",inside.length,"Still inside","#d97706"],
              ].map(([l,v,sub,c])=>(
                <div key={l} style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                  <p style={{color:c,fontWeight:800,fontSize:32,lineHeight:1}}>{v}</p>
                  <p style={{color:"#1a1a2e",fontSize:14,fontWeight:700,marginTop:6}}>{l}</p>
                  <p style={{color:"#9ca3af",fontSize:12,marginTop:2}}>{sub}</p>
                </div>
              ))}
            </div>

            <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:16,padding:20,marginTop:16,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
              <p style={{color:"#1a1a2e",fontWeight:700,fontSize:14,marginBottom:16}}>Visitor Type Breakdown</p>
              {byType.map(t=>(
                <div key={t.key} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{t.icon} {t.label}</span>
                    <span style={{fontSize:13,fontWeight:800,color:t.color}}>{t.count} <span style={{color:"#9ca3af",fontWeight:400,fontSize:11}}>({visitors.length?Math.round(t.count/visitors.length*100):0}%)</span></span>
                  </div>
                  <div style={{height:12,background:"#f3f4f6",borderRadius:6,overflow:"hidden"}}>
                    <div style={{width:`${visitors.length?t.count/visitors.length*100:0}%`,height:"100%",background:t.color,borderRadius:6,transition:"width .8s",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:6}}>
                      {t.count>0&&<span style={{color:"#fff",fontSize:9,fontWeight:700}}>{Math.round(t.count/visitors.length*100)}%</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{marginTop:16,display:"flex",gap:10}}>
              <button onClick={()=>{setTab("visitors");}} style={{...BTN_GHOST,flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Eye size={14}/>View All Records</button>
              <button onClick={downloadCSV} style={{...BTN_PRIMARY,flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Download size={14}/>Export CSV</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(()=>{
    try{const s=sessionStorage.getItem("abmh_vms_user");return s?JSON.parse(s):null;}catch{return null;}
  });
  function login(u){try{sessionStorage.setItem("abmh_vms_user",JSON.stringify(u));}catch{}setUser(u);}
  function logout(){try{sessionStorage.removeItem("abmh_vms_user");}catch{}setUser(null);}

  // Check URL params for approval or pass page
  const params=new URLSearchParams(window.location.search);
  const approveId=params.get("approve");
  const approveToken=params.get("token");
  const approveAction=params.get("action");
  const passId=params.get("pass");

  // Approval page — no login needed
  if(approveId&&approveToken) return<ApprovalPage visitorId={approveId} token={approveToken} action={approveAction}/>;
  // Visitor pass page — no login needed
  if(passId) return<VisitorPassPage visitorId={passId}/>;

  if(!user)return<LoginScreen onLogin={login}/>;
  if(user.role==="reception")return<ReceptionApp onLogout={logout}/>;
  if(user.role==="host")return<HostApp user={user} onLogout={logout}/>;
  if(user.role==="admin")return<AdminApp onLogout={logout}/>;
  return<LoginScreen onLogin={login}/>;
}
