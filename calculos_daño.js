
// NAVEGACIÓN ENTRE APARTADOS

function mostrarSeccion(id){
  document.querySelectorAll(".seccion").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
  if(id==="standing" && window.lastStanding) drawStandingChart(window.lastStanding);
  if(id==="jbg" && window.lastJBG) drawJBGChart(window.lastJBG);
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>mostrarSeccion(b.dataset.section)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>mostrarSeccion(b.dataset.go)));


// FUNCIONES GENERALES

const fmt=(n,d=3)=>Number(n).toLocaleString("es-MX",{maximumFractionDigits:d,minimumFractionDigits:0});
const val=id=>Number(document.getElementById(id).value);

function showError(id,msg){
  document.getElementById(id).textContent=msg;
}

function clearError(id){
  showError(id,"");
}

function setText(id,value){
  document.getElementById(id).textContent=value;
}

function addStep(list,text){
  const li=document.createElement("li");
  li.innerHTML=text;
  list.appendChild(li);
}

function renderMath(element){
  if(window.MathJax && window.MathJax.typesetPromise){
    window.MathJax.typesetPromise([element]).catch(err=>console.error("Error al representar ecuaciones:",err));
  }
}


// CONFIGURACIÓN DE GRÁFICAS

function canvasSetup(canvasId){
  const canvas=document.getElementById(canvasId), rect=canvas.getBoundingClientRect();
  const ratio=window.devicePixelRatio||1, width=Math.max(300,rect.width), height=330;
  canvas.width=width*ratio;
  canvas.height=height*ratio;
  const ctx=canvas.getContext("2d");
  ctx.setTransform(ratio,0,0,ratio,0,0);
  return {ctx,width,height};
}

function plotAxes(ctx,w,h,xLabel,yLabel,xMax,yMax){
  const m={l:65,r:20,t:20,b:52},pw=w-m.l-m.r,ph=h-m.t-m.b;

  ctx.clearRect(0,0,w,h);
  ctx.font="11px Arial";
  ctx.strokeStyle="#dce3ea";
  ctx.fillStyle="#526273";
  ctx.lineWidth=1;

  for(let i=0;i<=5;i++){
    const x=m.l+pw*i/5,y=m.t+ph*i/5;

    ctx.beginPath();
    ctx.moveTo(x,m.t);
    ctx.lineTo(x,m.t+ph);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(m.l,y);
    ctx.lineTo(m.l+pw,y);
    ctx.stroke();

    ctx.textAlign="center";
    ctx.fillText(fmt(xMax*i/5,1),x,h-31);

    ctx.textAlign="right";
    ctx.fillText(fmt(yMax*(1-i/5),1),m.l-8,y+4);
  }

  ctx.fillStyle="#263445";
  ctx.textAlign="center";
  ctx.font="12px Arial";
  ctx.fillText(xLabel,m.l+pw/2,h-8);

  ctx.save();
  ctx.translate(15,m.t+ph/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText(yLabel,0,0);
  ctx.restore();

  return {
    m,pw,ph,
    x:v=>m.l+(v/xMax)*pw,
    y:v=>m.t+ph-(v/yMax)*ph
  };
}


// ==========================================
// MÉTODO DE STANDING
// ==========================================

function standingCalculate(){

  clearError("st_error");

  const qo=val("st_q");
  const pwf=val("st_pwf");
  const pr=val("st_pr");
  const ef=val("st_ef");

  if(![qo,pwf,pr,ef].every(Number.isFinite)||qo<=0||pr<=0||pwf<0||pwf>pr||ef<=0){
    showError("st_error","Revisa los datos: q y pR deben ser positivos; pwf debe estar entre 0 y pR; EF debe ser mayor que cero.");
    return;
  }

  const y=1-pwf/pr;

  const denominator=1.8*ef*y-0.8*ef*ef*y*y;

  if(denominator<=0){
    showError("st_error","Con estos datos el denominador de Standing no es positivo; no se puede calcular un potencial físico con esta expresión.");
    return;
  }

  const qmax1=qo/denominator;

  let factor;

  if(ef<1)
    factor=1.8*ef-0.8*ef*ef;
  else if(Math.abs(ef-1)<1e-10)
    factor=1;
  else
    factor=0.624+0.376*ef;

  const qmaxEF=qmax1*factor;

  const pprime=pr-(pr-pwf)*ef;

  const result={qo,pwf,pr,ef,qmax1,qmaxEF,pprime};

  window.lastStanding=result;

  document.getElementById("st_empty").hidden=true;
  document.getElementById("st_results").hidden=false;

  setText("st_pprime",fmt(pprime));
  setText("st_qmax1",fmt(qmax1));
  setText("st_qmaxef",fmt(qmaxEF));

  const state=ef<1
    ?"EF < 1: pozo dañado."
    :Math.abs(ef-1)<1e-10
    ?"EF = 1: condición sin daño."
    :"EF > 1: pozo estimulado.";

  let note=state;

  if(ef>1){
    note+=" Para la curva se respeta el intervalo de validez indicado en el material: pwf ≥ pR(1 − 1/EF). El gasto máximo se calcula con la correlación específica de Standing para EF > 1.";
  }

  document.getElementById("st_diagnosis").textContent=note;

  const list=document.getElementById("st_steps");
  list.innerHTML="";

  addStep(list,`Datos: gasto de aceite = ${fmt(qo)} bpd; presión de fondo fluyendo = ${fmt(pwf)} psi; presión del yacimiento = ${fmt(pr)} psi; eficiencia de flujo = ${fmt(ef)}.`);

  addStep(list,`Presión de fondo fluyendo equivalente:\\[p\'_{wf}=p_R-(p_R-p_{wf})EF=${fmt(pr)}-(${fmt(pr)}-${fmt(pwf)})(${fmt(ef)})=${fmt(pprime)}\\;\\text{psi}\\].`);

  addStep(list,`Sustitución en la expresión de Standing:\\[1.8EF\\left(1-\\frac{p_{wf}}{p_R}\\right)-0.8EF^2\\left(1-\\frac{p_{wf}}{p_R}\\right)^2=${fmt(denominator,6)}\\].`);

  addStep(list,`Potencial máximo sin daño:\\[q_{o(\\max,EF=1)}=\\frac{q_o}{\\text{denominador}}=${fmt(qmax1)}\\;\\text{bpd}\\].`);

  const factorText=ef<1
    ?"1.8 EF − 0.8 EF²"
    :Math.abs(ef-1)<1e-10
    ?"1"
    :"0.624 + 0.376 EF";

  addStep(list,`Factor de corrección para EF = ${fmt(ef)}:\\[${factorText.replaceAll("EF", "EF").replaceAll("−", "-")}=${fmt(factor,6)}\\].`);

  addStep(list,`Gasto máximo con la eficiencia indicada:\\[q_{o(\\max,EF)}=${fmt(qmax1)}\\times${fmt(factor,6)}=${fmt(qmaxEF)}\\;\\text{bpd}\\].`);
  renderMath(list);

  drawStandingChart(result);
}


document.getElementById("standingForm").addEventListener("submit",e=>{
  e.preventDefault();
  standingCalculate();
});


document.getElementById("st_reset").addEventListener("click",()=>{
  document.getElementById("standingForm").reset();
  clearError("st_error");
  document.getElementById("st_empty").hidden=false;
  document.getElementById("st_results").hidden=true;
  window.lastStanding=null;
  drawPlaceholder("st_chart","La gráfica aparecerá después de realizar el cálculo.");
});


// GRÁFICA DE STANDING
// Eje X: gasto de aceite (bpd)
// Eje Y: presión de fondo fluyendo (psi)

function drawStandingChart(r){

  const {ctx,width:w,height:h}=canvasSetup("st_chart");

  const maxQ=Math.max(r.qmaxEF,r.qmax1,r.qo)*1.08||1;

  const g=plotAxes(
    ctx,w,h,
    "Gasto de aceite, qo (bpd)",
    "Presión de fondo fluyendo, pwf (psi)",
    maxQ,r.pr
  );

  const minP=r.ef>1
    ?Math.max(0,r.pr*(1-1/r.ef))
    :0;

  ctx.strokeStyle="#b18c42";
  ctx.lineWidth=3;
  ctx.beginPath();

  let started=false;

  for(let i=0;i<=100;i++){

    const p=r.pr-(r.pr-minP)*i/100;
    const x=1-p/r.pr;

    let q;

    if(Math.abs(r.ef-1)<1e-10){
      q=r.qmax1*(1-0.2*(p/r.pr)-0.8*(p/r.pr)**2);
    }else{
      q=r.qmax1*(1.8*r.ef*x-0.8*r.ef*r.ef*x*x);
    }

    if(!Number.isFinite(q)||q<0)continue;

    if(!started){
      ctx.moveTo(g.x(q),g.y(p));
      started=true;
    }else{
      ctx.lineTo(g.x(q),g.y(p));
    }
  }

  ctx.stroke();

  // Punto correspondiente a los datos introducidos

  ctx.fillStyle="#183d60";
  ctx.beginPath();
  ctx.arc(g.x(r.qo),g.y(r.pwf),5,0,Math.PI*2);
  ctx.fill();

  document.getElementById("st_chart_note").textContent=
    r.ef>1
    ?`Curva dibujada en el intervalo de validez señalado en el material (pwf ≥ ${fmt(minP)} psi). El punto representa los datos de prueba.`
    :"Curva IPR de Standing. El gasto se representa en el eje horizontal y la presión en el eje vertical. El punto representa los datos de prueba.";
}


// ==========================================
// MÉTODO DE JONES, BLOUNT Y GLAZE
// ==========================================

function parseJBG(){

  const pws=val("jbg_pws");
  const raw=document.getElementById("jbg_data").value.trim();

  if(!Number.isFinite(pws)||pws<=0)
    throw Error("La presión estática debe ser un número positivo.");

  const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);

  const data=[];

  for(let i=0;i<lines.length;i++){

    const parts=lines[i].split(/[;, \t]+/).filter(Boolean);

    if(parts.length!==2)
      throw Error(`Renglón ${i+1}: escribe exactamente dos valores: gasto, presión fluyendo.`);

    const q=Number(parts[0]);
    const pwf=Number(parts[1]);

    if(!Number.isFinite(q)||!Number.isFinite(pwf)||q<=0||pwf<0)
      throw Error(`Renglón ${i+1}: el gasto debe ser positivo y la presión no puede ser negativa.`);

    if(pwf>=pws)
      throw Error(`Renglón ${i+1}: pwf debe ser menor que pws para obtener una caída de presión positiva.`);

    data.push({
      q,
      pwf,
      dp:pws-pwf,
      y:(pws-pwf)/q
    });
  }

  if(data.length<2)
    throw Error("Se requieren al menos dos pruebas.");

  if(new Set(data.map(d=>d.q)).size<2)
    throw Error("Los gastos deben ser distintos para calcular la pendiente.");

  return {pws,data};
}


function jbgCalculate(){

  clearError("jbg_error");

  let parsed;

  try{
    parsed=parseJBG();
  }catch(err){
    showError("jbg_error",err.message);
    return;
  }

  const {pws,data}=parsed;
  const n=data.length;

  const meanX=data.reduce((s,d)=>s+d.q,0)/n;
  const meanY=data.reduce((s,d)=>s+d.y,0)/n;

  const sxx=data.reduce((s,d)=>s+(d.q-meanX)**2,0);
  const sxy=data.reduce((s,d)=>s+(d.q-meanX)*(d.y-meanY),0);

  const a=sxy/sxx;
  const b=meanY-a*meanX;

  if(!Number.isFinite(a)||!Number.isFinite(b)){
    showError("jbg_error","No fue posible ajustar la recta con los datos introducidos.");
    return;
  }

  // Resolver a*q^2 + b*q - pws = 0
  // y seleccionar la raíz positiva.

  let qmax;

  if(Math.abs(a)<1e-14){

    if(b<=0){
      showError("jbg_error","La ecuación no produce un gasto máximo positivo. Revisa los datos.");
      return;
    }

    qmax=pws/b;

  }else{

    const disc=b*b+4*a*pws;

    if(disc<0){
      showError("jbg_error","El discriminante es negativo; no existe una raíz real para el gasto máximo.");
      return;
    }

    const root1=(-b+Math.sqrt(disc))/(2*a);
    const root2=(-b-Math.sqrt(disc))/(2*a);

    const positive=[root1,root2].filter(x=>Number.isFinite(x)&&x>0);

    if(!positive.length){
      showError("jbg_error","No se encontró una raíz positiva para el gasto máximo.");
      return;
    }

    qmax=Math.max(...positive);
  }

  const bp=b+a*qmax;
  const ratio=Math.abs(b)>1e-14?bp/b:null;

  const result={pws,data,a,b,qmax,bp,ratio};

  window.lastJBG=result;

  document.getElementById("jbg_empty").hidden=true;
  document.getElementById("jbg_results").hidden=false;

  setText("jbg_a",fmt(a,8));
  setText("jbg_b",fmt(b,8));
  setText("jbg_qmax",fmt(qmax));
  setText("jbg_bp",fmt(bp,8));
  setText("jbg_ratio",ratio===null?"No definido (b = 0)":fmt(ratio,5));


  // DIAGNÓSTICO

  let diagnosis="";

  if(b<=0.05&&ratio!==null&&ratio<=2)
    diagnosis="b ≤ 0.05 y b′/b ≤ 2: de acuerdo con el material, la terminación del pozo es buena; no presenta daño significativo y la turbulencia es inexistente o pequeña.";

  else if(b<=0.05&&ratio!==null&&ratio>2)
    diagnosis="b ≤ 0.05 y b′/b > 2: no se recomienda estimular el pozo. El material indica revisar e incrementar el área del intervalo disparado.";

  else if(b>0.05&&ratio!==null&&ratio<=2)
    diagnosis="b > 0.05 y b′/b ≤ 2: el criterio del material recomienda un trabajo de estimulación.";

  else if(b>0.05&&ratio!==null&&ratio>2)
    diagnosis="b > 0.05 y b′/b > 2: combinación no desarrollada explícitamente en los criterios del PDF. Se requiere evaluación adicional; no se asigna una recomendación automática.";

  else
    diagnosis="No se puede evaluar b′/b porque b es cero o demasiado cercano a cero. Interpreta b y el ajuste con precaución.";

  if(b>0.05)
    diagnosis+=" El valor de b supera 0.05, indicador de daño según el criterio presentado.";

  if(a>0)
    diagnosis+=" El parámetro a positivo representa contribución de flujo no darciano en el modelo.";

  document.getElementById("jbg_diagnosis").textContent=diagnosis;


  // PROCEDIMIENTO PASO A PASO

  const list=document.getElementById("jbg_steps");
  list.innerHTML="";

  addStep(list,`Para cada prueba se calcula la caída de presión y la variable transformada:\\[\\Delta p=p_{ws}-p_{wf},\\qquad y=\\frac{\\Delta p}{q}\\].`);

  addStep(list,`Se ajusta una recta por mínimos cuadrados:\\[y=aq+b,\\qquad a=${fmt(a,8)},\\quad b=${fmt(b,8)}\\].`);

  addStep(list,`Ecuación para presión de fondo fluyendo igual a cero:\\[${fmt(a,8)}q^2+(${fmt(b,8)})q-${fmt(pws)}=0\\].`);

  addStep(list,`La raíz positiva corresponde al gasto máximo:\\[q_{o(\\max)}=${fmt(qmax)}\\;\\text{bpd}\\].`);

  addStep(list,`Cálculo del parámetro adicional:\\[b\'=b+aq_{o(\\max)}=${fmt(b,8)}+(${fmt(a,8)})(${fmt(qmax)})=${fmt(bp,8)}\\].`);

  addStep(list,`Relación entre parámetros:\\[\\frac{b\'}{b}=${ratio===null?"\\text{no definida}":fmt(ratio,5)}\\].`);
  renderMath(list);


  // TABLA DE DATOS

  const tbody=document.getElementById("jbg_table");
  tbody.innerHTML="";

  data.forEach((d,i)=>{

    const tr=document.createElement("tr");

    [i+1,fmt(d.q),fmt(d.dp),fmt(d.y,6)].forEach(v=>{

      const td=document.createElement("td");
      td.textContent=v;
      tr.appendChild(td);

    });

    tbody.appendChild(tr);

  });

  drawJBGChart(result);
}


// ACTIVAR FORMULARIO JBG

document.getElementById("jbgForm").addEventListener("submit",e=>{
  e.preventDefault();
  jbgCalculate();
});


document.getElementById("jbg_reset").addEventListener("click",()=>{

  document.getElementById("jbgForm").reset();

  clearError("jbg_error");

  document.getElementById("jbg_empty").hidden=false;
  document.getElementById("jbg_results").hidden=true;

  window.lastJBG=null;

  drawPlaceholder("jbg_chart","La gráfica aparecerá después de realizar el cálculo.");

});


// GRÁFICA JBG

function drawJBGChart(r){

  const {ctx,width:w,height:h}=canvasSetup("jbg_chart");

  const maxX=Math.max(...r.data.map(d=>d.q))*1.15;
  const maxY=Math.max(...r.data.map(d=>d.y),r.a*maxX+r.b)*1.15;

  const g=plotAxes(
    ctx,w,h,
    "Gasto, q (bpd)",
    "(pws − pwf)/q",
    maxX,maxY
  );

  ctx.strokeStyle="#b18c42";
  ctx.lineWidth=3;
  ctx.beginPath();

  ctx.moveTo(g.x(0),g.y(r.b));
  ctx.lineTo(g.x(maxX),g.y(r.a*maxX+r.b));

  ctx.stroke();

  ctx.fillStyle="#183d60";

  r.data.forEach(d=>{
    ctx.beginPath();
    ctx.arc(g.x(d.q),g.y(d.y),5,0,Math.PI*2);
    ctx.fill();
  });

  document.getElementById("jbg_chart_note").textContent=
    "Puntos: datos experimentales. Recta: ajuste lineal y = aq + b por mínimos cuadrados.";
}


// GRÁFICAS INICIALES

function drawPlaceholder(id,message){

  const {ctx,width,height}=canvasSetup(id);

  ctx.fillStyle="#657487";
  ctx.font="14px Arial";
  ctx.textAlign="center";

  ctx.fillText(message,width/2,height/2);
}


// ACTUALIZAR GRÁFICAS AL CAMBIAR TAMAÑO

window.addEventListener("resize",()=>{

  if(window.lastStanding&&document.getElementById("standing").classList.contains("active"))
    drawStandingChart(window.lastStanding);

  if(window.lastJBG&&document.getElementById("jbg").classList.contains("active"))
    drawJBGChart(window.lastJBG);

});


// CARGAR EJEMPLOS DEL PDF

document.getElementById("load_st_example").addEventListener("click",()=>{

  document.getElementById("st_q").value=800;
  document.getElementById("st_pwf").value=2000;
  document.getElementById("st_pr").value=3000;
  document.getElementById("st_ef").value=0.6;

  mostrarSeccion("standing");
  standingCalculate();

});


document.getElementById("load_jbg_example").addEventListener("click",()=>{

  document.getElementById("jbg_pws").value=4500;

  document.getElementById("jbg_data").value=
    "550,4474\n670,4465\n750,4459\n820,4452";

  mostrarSeccion("jbg");
  jbgCalculate();

});


// DIBUJAR GRÁFICAS AL INICIAR

drawPlaceholder("st_chart","La gráfica aparecerá después de realizar el cálculo.");

drawPlaceholder("jbg_chart","La gráfica aparecerá después de realizar el cálculo.");