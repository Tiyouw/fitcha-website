(function(){
const $=id=>document.getElementById(id); let analyzed=[];
const norm=s=>String(s??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)); const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0; const fmt=(n,d=0)=>Number.isFinite(n)?Number(n).toFixed(d):'0';
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function parseCSV(text){const rows=[];let row=[],val='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){val+='"';i++}else q=!q}else if(c===','&&!q){row.push(val);val=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(val);if(row.some(x=>String(x).trim()))rows.push(row);row=[];val=''}else val+=c}row.push(val);if(row.some(x=>String(x).trim()))rows.push(row);if(!rows.length)return[];const h=rows[0].map(x=>String(x).trim());return rows.slice(1).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]??'');return o})}
function rowText(r){return Object.values(r).join(' | ')}
function splitVals(v){return String(v??'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean)}
function get(row,aliases){const keys=Object.keys(row);for(const a of aliases){const na=norm(a);let k=keys.find(x=>norm(x)===na);if(k)return row[k];k=keys.find(x=>norm(x).includes(na)||na.includes(norm(x)));if(k)return row[k];}return''}
function num(row,aliases,def=0){const v=get(row,aliases);const m=String(v).replace(',','.').match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):def}
function txt(row,aliases){return String(get(row,aliases)||'')}
function all(row,aliases){return splitVals(get(row,aliases)).join(' | ')}
function includesText(s,terms){const t=norm(s);return terms.some(x=>t.includes(norm(x)))}
function has(row,aliases,terms){return includesText(all(row,aliases)+' | '+txt(row,aliases),terms)}
function anyRow(row,terms){return includesText(rowText(row),terms)}
function pct(n,total){return total?Math.round(n/total*100):0}
function addScore(cur,cond,pts){return cur+(cond?pts:0)}

const F={
 name:['Nama','respondent_name'], age:['Umur','age_group'],
 teaFreq:['Seberapa sering Anda mengonsumsi produk teh siap minum','milk_tea_frequency'],
 lowSugarFreq:['Seberapa sering Anda memilih minuman rendah gula','low_sugar_drink_frequency'],
 proteinInterest:['Seberapa tertarik Anda terhadap minuman yang mengandung protein tinggi','protein_drink_interest'],
 milkTeaInterest:['Seberapa tertarik Anda terhadap produk teh susu tapi high-protein','protein_milk_tea_interest','protein_milk_tea_interest'],
 bestLowSugar:['Dari produk yang Anda ketahui, produk mana yang menurut Anda paling dapat diterima','best_current_low_sugar_tea'],
 missingLowSugar:['Menurut Anda, apa yang biasanya kurang dari produk teh rendah gula','missing_from_low_sugar_tea'],
 creamyFreq:['Seberapa sering Anda mengonsumsi minuman yang tekstur "creamy"','creamy_drink_frequency'],
 need20:['Jika ada minuman milk tea dengan 20 g protein, kebutuhan utama','protein_20g_need'],
 likedProteinFlavor:['Rasa minuman protein apa yang pernah Anda coba dan sukai','protein_drink_flavor_tried'],
 dislikedProteinFlavor:['Rasa minuman protein apa yang anda tidak suka','protein_drink_flavor_disliked'],
 creamyLiked:['Apa yang biasanya membuat minuman creamy terasa enak','creamy_drink_liked_attributes'],
 creamyDisliked:['Apa yang biasanya membuat minuman creamy/milky terasa kurang enak','creamy_drink_disliked_attributes'],
 plantConcern:['Jika minuman creamy mengandung protein nabati, masalah apa yang paling Anda khawatirkan','plant_protein_creamy_drink_concern'],
 desiredWords:['Kata-kata mana yang paling menggambarkan minuman yang ingin Anda konsumsi','desired_drink_words'],
 tooSweet:['Jenis minuman mana di antara ini menurut kalian sering terasa terlalu manis','too_sweet_product_category'],
 teaStrength:['Seberapa kuat aroma dan rasa teh yang Anda inginkan','preferred_tea_strength'],
 healthySignal:['Apa yang membuat Anda merasa bahwa milk tea terasa lebih sehat tetapi tetap enak','healthy_but_enjoyable_signal'],
 texture:['Tekstur seperti apa yang Anda inginkan untuk milk tea yang tinggi protein','preferred_texture'],
 aromaDirection:['Arah aroma seperti apa yang terdengar paling menarik','preferred_aroma_direction'],
 sellingPoint:['Selling point','paling menarik dari yang di bawah ini','preferred_product_promise'],
 rejection:['Apa yang akan membuat Anda langsung menolak','main_rejection_factor'],
 body:['Body (kekentalan)','preferred_body_thickness'],
 sugarTradeoff:['Jika produk dibuat lebih rendah gula','low_sugar_tradeoff_acceptance'],
 bottleSize:['Jika produk ini mengandung 20 g protein, ukuran botol','acceptable_bottle_size_for_20g_protein'],
 price:['Kisaran harga berapa','acceptable_price_range'],
 improve:['Dalam satu kalimat','improvement_sentence']
};

const candidates={
 oolong:{label:'Oolong',sub:'balanced roasted · nutty-caramel · creamy but not heavy',p:{roasted:.90,nutty:.82,caramel:.88,floral:.22,creamy:.82,smooth:.88,strong:.75,spiced:.12,light:.48,premium:.88,clean:.62,mask:.88,body:.78,lowSweet:.76}},
 jasmine:{label:'Jasmine',sub:'floral · fragrant · light and clean',p:{roasted:.12,nutty:.18,caramel:.20,floral:1,creamy:.52,smooth:.70,strong:.42,spiced:.04,light:.92,premium:.76,clean:.88,mask:.52,body:.42,lowSweet:.86}},
 hojicha:{label:'Hojicha',sub:'toasted roasted · premium · low-sweet',p:{roasted:1,nutty:.86,caramel:.55,floral:.10,creamy:.66,smooth:.74,strong:.60,spiced:.08,light:.50,premium:.93,clean:.70,mask:.82,body:.62,lowSweet:.84}},
 thai:{label:'Thai Tea',sub:'bold strong tea · creamy · spiced masking',p:{roasted:.42,nutty:.30,caramel:.58,floral:.15,creamy:.94,smooth:.78,strong:.90,spiced:1,light:.12,premium:.58,clean:.18,mask:.92,body:.94,lowSweet:.20}}
};
function signal(row){
 const text=norm(rowText(row)); const s={roasted:0,nutty:0,caramel:0,floral:0,creamy:0,smooth:0,strong:0,spiced:0,light:0,premium:0,clean:0,lowSweet:0,bodyNeed:0,marketGap:0,health:0};
 const desired=all(row,F.desiredWords)+' | '+txt(row,F.aromaDirection)+' | '+txt(row,F.creamyLiked)+' | '+txt(row,F.texture)+' | '+txt(row,F.body)+' | '+txt(row,F.sugarTradeoff)+' | '+txt(row,F.healthySignal)+' | '+txt(row,F.sellingPoint)+' | '+txt(row,F.need20);
 s.roasted+=includesText(desired,['roasted','panggang','toasted'])?1:0; s.nutty+=includesText(desired,['nutty','kacang','kedelai','soy','nabati','plant based'])?1:0; s.caramel+=includesText(desired,['caramel','cokelat','vanilla','cookies','latte','kopi'])?1:0; s.floral+=includesText(desired,['floral','fragrant','harum'])?1:0; s.creamy+=includesText(desired,['creamy','milky','milk tea','susu','protein shake','kental'])?1:0; s.smooth+=includesText(desired,['smooth','halus','seimbang','tidak berat'])?1:0; s.strong+=includesText(desired,['strong tea','classic tea','teh kuat','aroma teh yang kuat','rasa teh kuat','kuat','sangat kuat'])?1:0; s.spiced+=includesText(desired,['spiced','berempah','bold'])?1:0; s.light+=includesText(desired,['light','ringan','refreshing','menyegarkan','clean','mudah diminum'])?1:0; s.premium+=includesText(desired,['premium','rasa premium','gizi fungsional'])?1:0; s.clean+=includesText(desired,['clean','lebih sedikit manis','gula lebih rendah','rendah gula'])?1:0; s.lowSweet+=includesText(desired,['tidak terlalu manis','sedikit manis','lebih sedikit manis','rendah gula','gula lebih rendah'])?1:0;
 const missing=all(row,F.missingLowSugar)+' | '+txt(row,F.bestLowSugar)+' | '+txt(row,F.tooSweet)+' | '+txt(row,F.creamyDisliked);
 s.marketGap+=includesText(missing,['body','mouthfeel','kurang creamy','watery','encer','plain','hambar','kurang terasa indulgent','aroma kurang','kurang kuat','terlalu artificial','tidak ada kekurangan'])?1:0;
 s.bodyNeed+=includesText(missing+' | '+desired,['watery','encer','body','mouthfeel','creamy','kental','mengenyangkan'])?1:0;
 const interest=(num(row,F.milkTeaInterest,0)+num(row,F.proteinInterest,0)+num(row,F.lowSugarFreq,0))/21; s.health=clamp(interest,0,1);
 // use protein flavor tried/disliked as indirect signal
 const liked=all(row,F.likedProteinFlavor), disliked=all(row,F.dislikedProteinFlavor);
 if(includesText(liked,['kopi','latte','caramel','vanilla','cookies','cokelat'])){s.caramel+=.5;s.creamy+=.3}
 if(includesText(liked,['milk tea','matcha','green tea'])){s.strong+=.4;s.clean+=.2}
 if(includesText(disliked,['kopi','latte','caramel','cookies','cokelat'])){s.caramel-=.35}
 if(includesText(disliked,['buah tropis','stroberi'])){s.strong+=.15}
 return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,clamp(v,0,1)]));
}
function risks(row){
 const t=all(row,F.creamyDisliked)+' | '+txt(row,F.plantConcern)+' | '+all(row,F.rejection)+' | '+all(row,F.missingLowSugar)+' | '+txt(row,F.sugarTradeoff)+' | '+txt(row,F.improve);
 return {
  beany:includesText(t,['beany','grassy','kacang','langu'])?1:0,
  chalky:includesText(t,['chalky','powdery','partikel','berbubuk','tenggorokan'])?1:0,
  bitter:includesText(t,['pahit','astringent','kesat'])?1:0,
  artificial:includesText(t,['artificial','pemanis','asing di lidah'])?1:0,
  thick:includesText(t,['terlalu kental','berat','sensasi berat'])?1:0,
  watery:includesText(t,['watery','encer'])?1:0,
  sweet:includesText(t,['terlalu manis','produk teh','produk susu','produk kopi','produk minuman jus'])?1:0
 }
}
function rowScore(row){
 const sig=signal(row), r=risks(row); const scores={};
 for(const [id,c] of Object.entries(candidates)){
  const p=c.p;
  let sensory=(sig.roasted*p.roasted + sig.nutty*p.nutty + sig.caramel*p.caramel + sig.floral*p.floral + sig.creamy*p.creamy + sig.smooth*p.smooth + sig.strong*p.strong + sig.spiced*p.spiced + sig.light*p.light + sig.premium*p.premium + sig.clean*p.clean + sig.lowSweet*p.lowSweet)/Math.max(1,Object.values(sig).slice(0,12).reduce((a,b)=>a+(b>0?1:0),0));
  sensory=clamp(sensory*100,25,98);
  const gap=clamp((sig.marketGap*.4 + sig.bodyNeed*p.body*.3 + sig.health*.3)*100,20,96);
  const riskNeed=r.beany*.30+r.chalky*.28+r.bitter*.20+r.artificial*.12+r.watery*.05+r.thick*.05;
  const mask=clamp((p.mask*.72 + p.roasted*r.beany*.11 + p.creamy*r.chalky*.08 + p.smooth*r.chalky*.06 + p.lowSweet*r.sweet*.03)*100,25,96);
  let formula=65;
  const body=txt(row,F.body), texture=txt(row,F.texture), tea=txt(row,F.teaStrength), sugar=txt(row,F.sugarTradeoff), bottle=txt(row,F.bottleSize);
  if(includesText(body+' '+texture,['ringan','mudah diminum'])&&p.light>.7) formula+=12;
  if(includesText(body+' '+texture,['seimbang','creamy tetapi tidak berat'])&&id==='oolong') formula+=16;
  if(includesText(body+' '+texture,['kental','mengenyangkan'])&&id==='thai') formula+=12;
  if(includesText(tea,['kuat','sangat kuat'])&&(id==='oolong'||id==='thai')) formula+=8;
  if(includesText(tea,['ringan','sangat ringan'])&&id==='jasmine') formula+=10;
  if(includesText(sugar,['lebih sedikit manis','clean'])&&(id==='hojicha'||id==='jasmine'||id==='oolong')) formula+=8;
  if(includesText(sugar,['lebih memilih rasa enak'])&&id==='thai') formula+=8;
  if(includesText(bottle,['330','350'])) formula+=5;
  if(r.bitter&&id==='thai') formula-=8; if(r.sweet&&id==='thai') formula-=12; if(r.thick&&id==='thai') formula-=8; if(r.beany&&(id==='jasmine')) formula-=10; if(r.chalky&&id==='jasmine') formula-=7;
  formula=clamp(formula,25,98);
  const total=clamp(.36*sensory+.28*mask+.22*gap+.14*formula,0,100);
  scores[id]={total,sensory,mask,gap,formula};
 }
 const purchaseProxy=clamp((num(row,F.milkTeaInterest,0)/7*.45 + num(row,F.proteinInterest,0)/7*.35 + num(row,F.teaFreq,0)/7*.20),0,1);
 return {row,sig,risk:r,scores,purchaseProxy};
}
function analyze(rows){const per=rows.map(rowScore); const agg={}; for(const id of Object.keys(candidates)){agg[id]={total:mean(per.map(x=>x.scores[id].total)),sensory:mean(per.map(x=>x.scores[id].sensory)),mask:mean(per.map(x=>x.scores[id].mask)),gap:mean(per.map(x=>x.scores[id].gap)),formula:mean(per.map(x=>x.scores[id].formula))}}; const ranked=Object.entries(agg).map(([id,v])=>({id,...candidates[id],...v})).sort((a,b)=>b.total-a.total); return {rows,per,agg,ranked,best:ranked[0],readiness:mean(per.map(p=>p.purchaseProxy))*100,interest:mean(rows.map(r=>num(r,F.milkTeaInterest,0)))} }
function topTerms(rows,aliases,n=5){const map={}; rows.forEach(r=>splitVals(get(r,aliases)).forEach(v=>{if(v)map[v]=(map[v]||0)+1})); return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,n)}
function rangeFor(an){const b=an.best.id, per=an.per; const avgRisk=k=>mean(per.map(p=>p.risk[k])); const avgSig=k=>mean(per.map(p=>p.sig[k])); const strongTea=mean(an.rows.map(r=>includesText(txt(r,F.teaStrength),['kuat','sangat kuat'])?1:0)); const creamy=avgSig('creamy'), body=avgSig('bodyNeed'), beany=avgRisk('beany'), chalky=avgRisk('chalky'), bitter=avgRisk('bitter'), sweet=avgRisk('sweet');
 let tea=[.10,.22], aroma=[.06,.14], mask=[.03,.09], creamer=[2.2,4.2], sugar=[2.0,3.5], lec=[.10,.22], stab=[.05,.13], vol=[330,350];
 if(b==='oolong'){tea=[.12,.24]; aroma=[.08,.15]; mask=[.04,.10]; creamer=[2.6,4.3];}
 if(b==='jasmine'){tea=[.08,.18]; aroma=[.06,.12]; mask=[.02,.07]; creamer=[1.8,3.2]; sugar=[1.8,3.0];}
 if(b==='hojicha'){tea=[.10,.22]; aroma=[.08,.16]; mask=[.03,.09]; creamer=[2.0,3.8]; sugar=[1.8,3.2];}
 if(b==='thai'){tea=[.12,.26]; aroma=[.10,.18]; mask=[.05,.12]; creamer=[3.2,5.0]; sugar=[2.8,4.2];}
 if(beany>.35){aroma=[aroma[0]+.02, aroma[1]+.03]; mask=[mask[0]+.02,mask[1]+.03]}
 if(chalky>.35){creamer=[creamer[0]+.5,creamer[1]+.8];lec=[.15,.25];stab=[.08,.15];vol=[350,350]}
 if(bitter>.35){tea=[Math.max(.08,tea[0]-.03),Math.max(.14,tea[1]-.05)]; aroma=[aroma[0]+.02,aroma[1]+.03]}
 if(sweet>.35){sugar=[Math.max(1.6,sugar[0]-.3),Math.max(2.6,sugar[1]-.5)]}
 if(strongTea>.45 && bitter<.35){tea=[tea[0]+.02,tea[1]+.03]}
 if(creamy>.5||body>.5) creamer=[creamer[0]+.3,creamer[1]+.5];
 return {vol,ppi:[25,25],tea,aroma,mask,creamer,sugar,lec,stab,salt:[.03,.06],pH:[6.6,7.0]}; }
function reason(c,best,an){const out=[]; if(c.id===best.id) out.push('Highest combined compatibility score.'); if(c.sensory>75) out.push('Strong sensory-word fit.'); if(c.mask>78) out.push('Good estimated masking fit for plant-protein off-notes.'); if(c.gap>70) out.push('Fits the low-sugar/creamy drink market gap.'); if(c.id==='oolong') out.push('Balanced roasted, caramel-like, creamy-but-not-heavy profile.'); if(c.id==='jasmine') out.push('Best when respondents want floral, light, fragrant, clean drinks.'); if(c.id==='hojicha') out.push('Best when respondents want toasted, premium, low-sweet tea notes.'); if(c.id==='thai') out.push('Best when respondents want bold, spiced, creamy, high-masking profile.'); return out.slice(0,4)}
function clearDashboard(){
 analyzed=[];
 $('dash').style.display='none';
 $('empty').style.display='block';
 $('export-analysis').style.display='none';
 $('clear-data').style.display='none';
 $('status').className='status';
 $('status').textContent='Waiting for CSV. Dashboard will show compatibility score cards after loading.';
 $('csv-file').value='';
}
function render(rows){rows=rows.filter(r=>Object.values(r).some(v=>String(v).trim())); if(!rows.length){$('status').className='status bad';$('status').textContent='CSV loaded, but no response rows were found.';return} const an=analyze(rows); analyzed=an.per; const best=an.best, form=rangeFor(an); $('empty').style.display='none'; $('dash').style.display='block'; $('export-analysis').style.display='inline-block'; $('clear-data').style.display='inline-block';
 $('overview').innerHTML=[['Responses',rows.length,'','Rows loaded from CSV'],['Protein milk tea interest',fmt(an.interest,1),'/7','Average interest score'],['Consumer readiness',fmt(an.readiness,0),'%','Tea habit + protein interest proxy'],['Top direction',best.label,'','Highest compatibility score']].map(m=>`<div class="metric"><div class="lab">${m[0]}</div><div class="val">${m[1]}<span class="unit">${m[2]}</span></div><div class="bar"><div class="fill" style="width:${m[2]==='/7'?clamp(Number(m[1])/7*100,0,100):m[2]==='%'?clamp(Number(m[1]),0,100):100}%"></div></div><div class="cap">${m[3]}</div></div>`).join('');
 $('tea-grid').innerHTML=an.ranked.map(c=>{const label=c.total>=80?'High fit':c.total>=65?'Medium fit':'Low fit', cls=c.total>=80?'good':c.total>=65?'warn':'bad'; return `<div class="tea-card ${c.id===best.id?'best':''}"><div class="tea-head"><div><div class="tea-name">${esc(c.label)}</div><div class="tea-sub">${esc(c.sub)} · <span class="tag ${cls}">${label}</span></div></div><div class="score">${fmt(c.total,0)}<small>%</small></div></div><div class="tea-body">${[['Overall fit',c.total],['Sensory-word fit',c.sensory],['Estimated masking',c.mask],['Market-gap fit',c.gap],['Formulation fit',c.formula]].map(r=>`<div class="fit-row"><span>${r[0]}</span><div class="fit-bar"><i style="width:${clamp(r[1],0,100)}%"></i></div><b class="fit-val">${fmt(r[1],0)}%</b></div>`).join('')}<ul class="reasons">${reason(c,best,an).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`}).join('');
 const gaps=topTerms(rows,F.missingLowSugar,5), dislikes=topTerms(rows,F.creamyDisliked,5), concerns=topTerms(rows,F.plantConcern,5);
 $('market').innerHTML=[['Low-sugar tea gaps',gaps],['Creamy drink dislikes',dislikes],['Plant-protein concern',concerns]].map(x=>`<div class="insight"><strong>${x[0]}</strong>${x[1].length?x[1].map(([k,v])=>`${esc(k)} (${pct(v,rows.length)}%)`).join(' · '):'No clear signal'}</div>`).join('');
 const chipData=[['Roasted/toasted',mean(an.per.map(p=>p.sig.roasted))*100],['Creamy',mean(an.per.map(p=>p.sig.creamy))*100],['Smooth',mean(an.per.map(p=>p.sig.smooth))*100],['Nutty/caramel',Math.max(mean(an.per.map(p=>p.sig.nutty))*100,mean(an.per.map(p=>p.sig.caramel))*100)],['Floral',mean(an.per.map(p=>p.sig.floral))*100],['Strong tea',mean(an.per.map(p=>p.sig.strong))*100],['Spiced',mean(an.per.map(p=>p.sig.spiced))*100],['Light/clean',Math.max(mean(an.per.map(p=>p.sig.light))*100,mean(an.per.map(p=>p.sig.clean))*100)],['Beany risk',mean(an.per.map(p=>p.risk.beany))*100],['Chalky risk',mean(an.per.map(p=>p.risk.chalky))*100],['Bitter risk',mean(an.per.map(p=>p.risk.bitter))*100]];
 $('chips').innerHTML=chipData.sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span class="chip"><strong>${esc(k)}</strong> ${fmt(v,0)}%</span>`).join('');
 const offNeed=mean(an.per.map(p=>p.risk.beany*.32+p.risk.chalky*.30+p.risk.bitter*.20+p.risk.artificial*.10+p.risk.watery*.08))*100; const confidence=best.total*.7+an.readiness*.3;
 $('mask-metrics').innerHTML=[['Estimated masking fit',best.mask,'%','Concept-level estimate before prototype'],['Off-note need',offNeed,'%','Need for masking + mouthfeel correction'],['Decision confidence',confidence,'%','Compatibility + readiness proxy']].map(m=>`<div class="metric"><div class="lab">${m[0]}</div><div class="val">${fmt(m[1],0)}<span class="unit">${m[2]}</span></div><div class="bar"><div class="fill" style="width:${clamp(Number(m[1]),0,100)}%"></div></div><div class="cap">${m[3]}</div></div>`).join('');
 $('mask-note').innerHTML=`<strong>Interpretation:</strong> ${esc(best.label)} has ${fmt(best.mask,0)}% estimated masking fit. This means respondents' indirect signals match a profile expected to manage beany/chalky/bitter plant-protein risks; it is not yet a sensory-tested masking percentage.`;
 $('reasoning').innerHTML=[['Why this is AI-assisted',`The dashboard does not count direct flavor votes. It maps Indonesian Google Form answers into descriptor signals, then scores four tea directions using weighted compatibility logic.`],['Selected direction',`${best.label} is recommended because it leads across overall compatibility, estimated masking, and market-gap fit.`],['Next action',`Make one ${best.label} prototype at 20 g protein / ${form.vol[0]===form.vol[1]?form.vol[0]:form.vol[0]+'–'+form.vol[1]} mL and validate with sensory tasting.`]].map(r=>`<div class="rec"><strong>${r[0]}</strong>${r[1]}</div>`).join('');
 const fRows=[['Serving volume',`${form.vol[0]===form.vol[1]?form.vol[0]:form.vol[0]+'–'+form.vol[1]} mL`,'Use larger volume if chalky/protein-aftertaste risk is high.'],['Pea protein isolate',`${form.ppi[0]} g/bottle`,'Assuming 80% protein isolate, 25 g gives about 20 g protein.'],['Protein target','20 g/bottle','Keep the high-protein promise explicit.'],['Real tea powder / tea infusion',`${form.tea[0].toFixed(2)}–${form.tea[1].toFixed(2)}%`,'Controls authentic tea character; do not over-extract if bitterness risk is high.'],['Tea aroma/flavor',`${form.aroma[0].toFixed(2)}–${form.aroma[1].toFixed(2)}%`,'Builds tea identity without excessive tea solids.'],['Vanilla/caramel/nutty masker',`${form.mask[0].toFixed(2)}–${form.mask[1].toFixed(2)}%`,'Rounds beany/grassy plant-protein notes.'],['Plant creamer/oat solids',`${form.creamer[0].toFixed(1)}–${form.creamer[1].toFixed(1)}%`,'Improves body and reduces chalky/powdery perception.'],['Sugar/sucrose equivalent',`${form.sugar[0].toFixed(1)}–${form.sugar[1].toFixed(1)}%`,'Balances low sugar with milk tea palatability.'],['Lecithin',`${form.lec[0].toFixed(2)}–${form.lec[1].toFixed(2)}%`,'Improves dispersion and smoothness.'],['Stabilizer system',`${form.stab[0].toFixed(2)}–${form.stab[1].toFixed(2)}%`,'Reduces sedimentation and powdery texture.'],['Salt',`${form.salt[0].toFixed(2)}–${form.salt[1].toFixed(2)}%`,'Rounds bitterness and sweetness.'],['pH target',`${form.pH[0].toFixed(1)}–${form.pH[1].toFixed(1)}`,'Neutral milk-tea matrix is safer for plant-protein stability.']];
 $('formula').innerHTML='<thead><tr><th>Lever</th><th>Recommended range</th><th>Reason</th></tr></thead><tbody>'+fRows.map(r=>`<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')+'</tbody>';
 const riskAvg=k=>mean(an.per.map(p=>p.risk[k])); const sigAvg=k=>mean(an.per.map(p=>p.sig[k])); const levers=[]; if(riskAvg('beany')>.25) levers.push(['Increase roasted aroma + vanilla/caramel/nutty masker','Beany/grassy concern is present; masking should rely on aroma and rounded notes before increasing real tea powder.']); if(riskAvg('chalky')>.25) levers.push(['Increase lecithin, stabilizer, and creamy base','Chalky/powdery concern needs mouthfeel correction, not only stronger flavor.']); if(riskAvg('bitter')>.25) levers.push(['Control real tea powder and avoid overbrewing','Bitter aftertaste is a rejection factor; use tea aroma for intensity instead.']); if(sigAvg('creamy')>.35) levers.push(['Increase creamy matrix carefully','Respondents value creaminess, but keep it drinkable at 20 g protein.']); if(sigAvg('lowSweet')>.35 || riskAvg('sweet')>.30) levers.push(['Use lower sweetness range','Low-sugar and too-sweet concerns suggest staying closer to the lower sucrose-equivalent range.']); if(!levers.length) levers.push(['Hold baseline range','Signals are balanced; make the first prototype and validate with tasting.']); $('levers').innerHTML=levers.map(l=>`<div class="rec"><strong>${l[0]}</strong>${l[1]}</div>`).join('');
 const process=[['Hydrate protein separately','Hydrate 25 g pea protein isolate in water/plant milk base before adding tea phase.'],['Prepare controlled tea phase',`Use ${form.tea[0].toFixed(2)}–${form.tea[1].toFixed(2)}% tea powder or mild infusion; avoid excessive extraction.`],['Cool before blending','Cool tea phase below 40°C before combining with protein base.'],['Build masking system',`Add ${form.aroma[0].toFixed(2)}–${form.aroma[1].toFixed(2)}% tea aroma and ${form.mask[0].toFixed(2)}–${form.mask[1].toFixed(2)}% vanilla/caramel/nutty masker.`],['Correct mouthfeel',`Use creamer/oat solids, lecithin, and stabilizer according to the recommended range.`],['Prototype validation','After the concept survey, run a small sensory test to confirm real liking and masking performance.']]; $('process').innerHTML=process.map(p=>`<div class="step"><div><strong>${p[0]}</strong><span>${p[1]}</span></div></div>`).join('');
 $('rows').innerHTML='<thead><tr><th>#</th><th>Name</th><th>Age</th><th>Oolong</th><th>Jasmine</th><th>Hojicha</th><th>Thai Tea</th><th>Top fit</th></tr></thead><tbody>'+an.per.map((p,i)=>{const top=Object.entries(p.scores).sort((a,b)=>b[1].total-a[1].total)[0][0]; return `<tr><td>${i+1}</td><td>${esc(get(p.row,F.name)||'—')}</td><td>${esc(get(p.row,F.age)||'')}</td><td>${fmt(p.scores.oolong.total,0)}%</td><td>${fmt(p.scores.jasmine.total,0)}%</td><td>${fmt(p.scores.hojicha.total,0)}%</td><td>${fmt(p.scores.thai.total,0)}%</td><td>${esc(candidates[top].label)}</td></tr>`}).join('')+'</tbody>';
 $('status').className='status good'; $('status').textContent=`Loaded ${rows.length} responses. Recommended direction: ${best.label} (${fmt(best.total,0)}% compatibility).`;
}
const EXAMPLE=[
 {'Nama:':'Ayu','Umur':'21–25','Seberapa sering Anda mengonsumsi produk teh siap minum?':'6','Seberapa sering Anda memilih minuman rendah gula, less sugar, atau tanpa gula?':'5','Seberapa tertarik Anda terhadap minuman yang mengandung protein tinggi?':'6','Seberapa tertarik Anda terhadap produk teh susu tapi high-protein?':'7','Menurut Anda, apa yang biasanya kurang dari produk teh rendah gula/tanpa gula?':'Body/mouthfeel kurang terasa, Kurang creamy, Kurang terasa indulgent/menyenangkan','Jika ada minuman milk tea dengan 20 g protein, kebutuhan utama Anda untuk mengonsumsinya apa?':'Untuk pengganti camilan','Rasa minuman protein apa yang pernah Anda coba dan sukai atau tertarik untuk coba?':'Kopi/latte, Caramel','Apa yang biasanya membuat minuman creamy terasa enak bagi Anda?':'Creamy dan berbasis teh, seperti milk tea','Apa yang biasanya membuat minuman creamy/milky terasa kurang enak bagi Anda?':'Tekstur partikel halus di mulut saat diminum, Aftertaste kacang/beany','Jika minuman creamy mengandung protein nabati, masalah apa yang paling Anda khawatirkan?':'Aftertaste beany atau grassy','Kata-kata mana yang paling menggambarkan minuman yang ingin Anda konsumsi?':'Roasted/panggang, Creamy, Smooth/halus, Nutty, Caramel-like, Premium','Seberapa kuat aroma dan rasa teh yang Anda inginkan?':'Kuat','Apa yang membuat Anda merasa bahwa milk tea terasa lebih sehat tetapi tetap enak?':'Gula lebih rendah, Mengandung 20 g protein, Creamy tetapi tidak terlalu berat, Tetap terasa seperti milk tea asli','Tekstur seperti apa yang Anda inginkan untuk milk tea yang tinggi protein':'Creamy tetapi tidak berat','Arah aroma seperti apa yang terdengar paling menarik tanpa menyebutkan rasa spesifik?':'Roasted, toasted, dan nutty','"Selling point" apa yang  paling menarik dari yang di bawah ini untuk minuman siap saji bagi Anda?':'Tinggi protein tetapi tetap terasa seperti milk tea','Apa yang akan membuat Anda langsung menolak pada produk teh susu tinggi protein?':'Aftertaste beany','Body (kekentalan) seperti apa yang Anda inginkan?':'Seimbang','Jika produk dibuat lebih rendah gula, mana yang paling bisa Anda terima?':'Lebih creamy untuk menutup rasa rendah gula','Jika produk ini mengandung 20 g protein, ukuran botol berapa yang menurut Anda masih sesuai?':'350 ml','Kisaran harga berapa yang menurut Anda sesuai untuk botol 330–400 mL dengan 20 g protein?':'Rp15.000–Rp24.000'},
 {'Nama:':'Bima','Umur':'15-20','Seberapa sering Anda mengonsumsi produk teh siap minum?':'5','Seberapa sering Anda memilih minuman rendah gula, less sugar, atau tanpa gula?':'6','Seberapa tertarik Anda terhadap minuman yang mengandung protein tinggi?':'5','Seberapa tertarik Anda terhadap produk teh susu tapi high-protein?':'5','Menurut Anda, apa yang biasanya kurang dari produk teh rendah gula/tanpa gula?':'Aromanya kurang kuat, Terlalu watery/encer','Apa yang biasanya membuat minuman creamy terasa enak bagi Anda?':'Ringan, tidak terlalu creamy','Apa yang biasanya membuat minuman creamy/milky terasa kurang enak bagi Anda?':'Terlalu kental, Terlalu manis','Jika minuman creamy mengandung protein nabati, masalah apa yang paling Anda khawatirkan?':'Terlalu pahit','Kata-kata mana yang paling menggambarkan minuman yang ingin Anda konsumsi?':'Light/ringan, Refreshing/menyegarkan, Clean, Fragrant/harum','Seberapa kuat aroma dan rasa teh yang Anda inginkan?':'Ringan','Tekstur seperti apa yang Anda inginkan untuk milk tea yang tinggi protein':'Ringan dan mudah diminum','Arah aroma seperti apa yang terdengar paling menarik tanpa menyebutkan rasa spesifik?':'Floral, harum, dan ringan','Apa yang akan membuat Anda langsung menolak pada produk teh susu tinggi protein?':'Terlalu manis','Body (kekentalan) seperti apa yang Anda inginkan?':'Ringan dan mudah diminum','Jika produk ini mengandung 20 g protein, ukuran botol berapa yang menurut Anda masih sesuai?':'400 ml'},
 {'Nama:':'Citra','Umur':'25-30','Seberapa sering Anda mengonsumsi produk teh siap minum?':'7','Seberapa sering Anda memilih minuman rendah gula, less sugar, atau tanpa gula?':'4','Seberapa tertarik Anda terhadap minuman yang mengandung protein tinggi?':'7','Seberapa tertarik Anda terhadap produk teh susu tapi high-protein?':'7','Menurut Anda, apa yang biasanya kurang dari produk teh rendah gula/tanpa gula?':'Kurang terasa indulgent/menyenangkan, Terlalu plain/hambar','Apa yang biasanya membuat minuman creamy terasa enak bagi Anda?':'Kental dan mengenyangkan, seperti protein shake','Apa yang biasanya membuat minuman creamy/milky terasa kurang enak bagi Anda?':'Aftertaste kacang/beany, Aroma lemah','Jika minuman creamy mengandung protein nabati, masalah apa yang paling Anda khawatirkan?':'Aftertaste beany atau grassy','Kata-kata mana yang paling menggambarkan minuman yang ingin Anda konsumsi?':'Spiced/berempah, Creamy, Indulgent/menyenangkan, Strong tea','Seberapa kuat aroma dan rasa teh yang Anda inginkan?':'Sangat kuat','Tekstur seperti apa yang Anda inginkan untuk milk tea yang tinggi protein':'Kental dan mengenyangkan','Arah aroma seperti apa yang terdengar paling menarik tanpa menyebutkan rasa spesifik?':'Spiced, creamy, dan bold','"Selling point" apa yang  paling menarik dari yang di bawah ini untuk minuman siap saji bagi Anda?':'Protein non-hewani tanpa rasa langu','Apa yang akan membuat Anda langsung menolak pada produk teh susu tinggi protein?':'Rasa pemanis yang terasa asing di lidah','Body (kekentalan) seperti apa yang Anda inginkan?':'Agak kental','Jika produk dibuat lebih rendah gula, mana yang paling bisa Anda terima?':'Saya lebih memilih rasa enak meskipun gula sedikit lebih tinggi','Jika produk ini mengandung 20 g protein, ukuran botol berapa yang menurut Anda masih sesuai?':'350 ml'}
];
$('csv-file').addEventListener('change',async e=>{const f=e.target.files[0]; if(!f)return; render(parseCSV(await f.text()))});
const dz=$('dropzone');
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
dz.addEventListener('drop',async e=>{
 const f=e.dataTransfer.files && e.dataTransfer.files[0];
 if(!f)return;
 if(!/\.csv$/i.test(f.name)){
  $('status').className='status warn';
  $('status').textContent='Only CSV files are supported. Please drop a .csv file.';
  return;
 }
 $('csv-file').value='';
 render(parseCSV(await f.text()));
});
$('load-example').addEventListener('click',()=>render(EXAMPLE));
$('clear-data').addEventListener('click',clearDashboard);
$('export-analysis').addEventListener('click',()=>{if(!analyzed.length)return;const cols=['respondent','age','oolong','jasmine','hojicha','thai_tea','top_fit'];const csv=[cols.join(','),...analyzed.map(a=>{const top=Object.entries(a.scores).sort((x,y)=>y[1].total-x[1].total)[0][0];return [get(a.row,F.name),get(a.row,F.age),a.scores.oolong.total.toFixed(2),a.scores.jasmine.total.toFixed(2),a.scores.hojicha.total.toFixed(2),a.scores.thai.total.toFixed(2),candidates[top].label].map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')})].join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rd-nexus-tea-compatibility-analysis.csv';document.body.appendChild(a);a.click();a.remove()});
})();
