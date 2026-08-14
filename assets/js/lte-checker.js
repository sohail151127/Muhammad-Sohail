(() => {
  const chart = document.getElementById('lte-density-chart');
  if (!chart) return;
  const EV_TO_WAVENUMBER = 8065.543937;
  const coefficient = 1.6e12;
  const fields = {
    temperature:document.getElementById('lte-temperature'), temperatureUncertainty:document.getElementById('lte-temperature-uncertainty'), density:document.getElementById('lte-density'), densityUncertainty:document.getElementById('lte-density-uncertainty'), energy:document.getElementById('lte-energy-gap'), energyUncertainty:document.getElementById('lte-energy-uncertainty'), unit:document.getElementById('lte-energy-unit')
  };
  const output = {
    status:document.getElementById('lte-status'), heading:document.getElementById('lte-result-heading'), summary:document.getElementById('lte-result-summary'), measured:document.getElementById('measured-density-result'), required:document.getElementById('required-density-result'), margin:document.getElementById('lte-margin'), conservative:document.getElementById('lte-conservative-margin'), energy:document.getElementById('lte-energy-used'), requiredUncertainty:document.getElementById('required-uncertainty'), equation:document.getElementById('lte-equation-used')
  };
  const demo = { temperature:9491,temperatureUncertainty:117,density:2.324e16,densityUncertainty:2.55e15,energy:3,energyUncertainty:.05,unit:'ev' };
  const helpText = {
    temperature:'Temperature T enters through its square root, so its influence is weaker than the energy gap. Use a temperature estimate that represents the same plasma region and time as the density measurement.',
    density:'Electron density Nₑ is the value being tested. It should come from an independent diagnostic such as suitable Stark broadening, with the same spatial and temporal sampling as the temperature.',
    energy:'ΔE is the largest relevant separation between consecutive energy levels in the system being tested. Because the value is cubed, an incorrect energy gap can change the threshold dramatically.'
  };
  let latest = null;
  let previousUnit = fields.unit.value;

  const value = (field) => Number(field.value);
  const superscript = (number) => String(number).replace(/-/g,'⁻').replace(/0/g,'⁰').replace(/1/g,'¹').replace(/2/g,'²').replace(/3/g,'³').replace(/4/g,'⁴').replace(/5/g,'⁵').replace(/6/g,'⁶').replace(/7/g,'⁷').replace(/8/g,'⁸').replace(/9/g,'⁹');
  function scientific(number,digits=3,unit='') { if(!Number.isFinite(number)||number===0)return `0${unit?` ${unit}`:''}`; const exponent=Math.floor(Math.log10(Math.abs(number))),mantissa=number/(10**exponent); return `${mantissa.toFixed(digits)} × 10${superscript(exponent)}${unit?` ${unit}`:''}`; }
  const format = (number,digits=3) => Number(number).toLocaleString('en-US',{maximumFractionDigits:digits});

  function clear(message) {
    output.status.textContent='Invalid inputs'; output.status.className='status-badge is-fail'; output.heading.textContent='Calculation unavailable'; output.summary.textContent=message;
    [output.measured,output.required,output.margin,output.conservative,output.energy,output.requiredUncertainty,output.equation].forEach((node)=>{node.textContent='—';});
    chart.replaceChildren(makeSVG('text',{x:500,y:165,'text-anchor':'middle',class:'empty-chart-text'},message)); latest=null;
  }

  function calculate() {
    const data={temperature:value(fields.temperature),temperatureUncertainty:value(fields.temperatureUncertainty),density:value(fields.density),densityUncertainty:value(fields.densityUncertainty),energyInput:value(fields.energy),energyUncertaintyInput:value(fields.energyUncertainty),unit:fields.unit.value};
    if(!Number.isFinite(data.temperature)||data.temperature<=0||!Number.isFinite(data.density)||data.density<=0||!Number.isFinite(data.energyInput)||data.energyInput<=0)return clear('Temperature, electron density and energy gap must all be positive numbers.');
    if([data.temperatureUncertainty,data.densityUncertainty,data.energyUncertaintyInput].some((item)=>!Number.isFinite(item)||item<0))return clear('Uncertainties cannot be negative. Enter zero when an uncertainty is not available.');
    if(data.densityUncertainty>=data.density)return clear('Electron-density uncertainty must be smaller than the measured electron density so that the lower bound remains positive.');
    const energyEV=data.unit==='cm'?data.energyInput/EV_TO_WAVENUMBER:data.energyInput;
    const energyUncertaintyEV=data.unit==='cm'?data.energyUncertaintyInput/EV_TO_WAVENUMBER:data.energyUncertaintyInput;
    const required=coefficient*Math.sqrt(data.temperature)*(energyEV**3);
    const requiredRelative=Math.hypot(.5*data.temperatureUncertainty/data.temperature,3*energyUncertaintyEV/energyEV);
    const requiredUncertainty=required*requiredRelative;
    const nominalMargin=data.density/required;
    const lowerDensity=Math.max(Number.MIN_VALUE,data.density-data.densityUncertainty);
    const upperRequired=required+requiredUncertainty;
    const conservativeMargin=lowerDensity/upperRequired;
    const nominalPass=nominalMargin>=1,conservativePass=conservativeMargin>=1;

    output.measured.textContent=scientific(data.density,3,'cm⁻³'); output.required.textContent=scientific(required,3,'cm⁻³'); output.margin.textContent=`${format(nominalMargin,2)}× required`; output.conservative.textContent=`${format(conservativeMargin,2)}× required`; output.energy.textContent=`${format(energyEV,5)} eV`; output.requiredUncertainty.textContent=`± ${scientific(requiredUncertainty,2,'cm⁻³')} (${format(requiredRelative*100,1)}%)`;
    output.equation.textContent=`Nₑ,min = 1.6 × 10¹² × √${format(data.temperature,3)} × (${format(energyEV,5)})³ = ${scientific(required,3,'cm⁻³')}`;
    if(nominalPass&&conservativePass){output.status.textContent='Criterion met';output.status.className='status-badge is-pass';output.heading.textContent='The entered density exceeds the threshold.';output.summary.textContent=`The nominal density is ${format(nominalMargin,2)} times the McWhirter minimum. Even the entered lower density bound remains above the upper threshold bound. This supports only this necessary LTE condition.`;}
    else if(nominalPass){output.status.textContent='Close within uncertainty';output.status.className='status-badge is-close';output.heading.textContent='The central values pass, but the cautious comparison does not.';output.summary.textContent=`The nominal density is ${format(nominalMargin,2)} times the minimum, while the conservative margin is ${format(conservativeMargin,2)}. Report the result as uncertainty-sensitive and review the measurements.`;}
    else{output.status.textContent='Criterion not met';output.status.className='status-badge is-fail';output.heading.textContent='The entered density is below the threshold.';output.summary.textContent=`The density reaches only ${format(nominalMargin,2)} of the calculated minimum. The McWhirter necessary condition is not met for these inputs, so an LTE assumption is not supported by this test.`;}
    latest={...data,energyEV,energyUncertaintyEV,required,requiredUncertainty,nominalMargin,conservativeMargin,lowerDensity,upperRequired,nominalPass,conservativePass};drawChart(latest);
  }

  const ns='http://www.w3.org/2000/svg';
  function makeSVG(tag,attrs={},text=''){const node=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([key,val])=>node.setAttribute(key,val));if(text)node.textContent=text;return node;}
  function drawChart(data){chart.replaceChildren();const left=85,right=960,y=175,width=right-left;const values=[data.density,data.required,data.lowerDensity,data.upperRequired].filter((item)=>item>0);let minExp=Math.floor(Math.log10(Math.min(...values)))-1,maxExp=Math.ceil(Math.log10(Math.max(...values)))+1;if(maxExp-minExp<4){minExp--;maxExp++;}const scale=(number)=>left+((Math.log10(number)-minExp)/(maxExp-minExp))*width;const thresholdX=scale(data.required),measuredX=scale(data.density),lowerX=scale(data.lowerDensity),upperX=scale(data.upperRequired);
    chart.append(makeSVG('rect',{x:left,y:105,width:Math.max(0,thresholdX-left),height:110,class:'fail-zone'}));chart.append(makeSVG('rect',{x:thresholdX,y:105,width:Math.max(0,right-thresholdX),height:110,class:'pass-zone'}));chart.append(makeSVG('line',{x1:left,y1:y,x2:right,y2:y,class:'chart-axis'}));
    for(let exponent=minExp;exponent<=maxExp;exponent++){const x=left+((exponent-minExp)/(maxExp-minExp))*width;chart.append(makeSVG('line',{x1:x,y1:y-10,x2:x,y2:y+10,class:'chart-tick'}));chart.append(makeSVG('text',{x,y:y+31,'text-anchor':'middle',class:'chart-label'},`10${superscript(exponent)}`));}
    chart.append(makeSVG('line',{x1:thresholdX,y1:88,x2:thresholdX,y2:228,class:'threshold-line'}));chart.append(makeSVG('text',{x:thresholdX,y:72,'text-anchor':'middle',class:'chart-callout'},'Required minimum'));
    chart.append(makeSVG('line',{x1:measuredX,y1:112,x2:measuredX,y2:238,class:'measured-line'}));chart.append(makeSVG('text',{x:measuredX,y:257,'text-anchor':'middle',class:'chart-callout'},'Measured density'));
    chart.append(makeSVG('line',{x1:lowerX,y1:133,x2:lowerX,y2:217,class:'conservative-line'}));chart.append(makeSVG('line',{x1:upperX,y1:133,x2:upperX,y2:217,class:'conservative-line'}));chart.append(makeSVG('text',{x:(left+right)/2,y:310,'text-anchor':'middle',class:'chart-title'},'ELECTRON DENSITY (cm⁻³, LOGARITHMIC SCALE)'));
  }

  function convertUnit(){const next=fields.unit.value;if(next===previousUnit)return;const factor=next==='cm'?EV_TO_WAVENUMBER:1/EV_TO_WAVENUMBER;const energy=value(fields.energy),uncertainty=value(fields.energyUncertainty);if(Number.isFinite(energy))fields.energy.value=(energy*factor).toPrecision(9);if(Number.isFinite(uncertainty))fields.energyUncertainty.value=(uncertainty*factor).toPrecision(7);document.getElementById('energy-unit-label').textContent=next==='cm'?'cm⁻¹':'eV';document.getElementById('energy-uncertainty-unit').textContent=next==='cm'?'cm⁻¹':'eV';previousUnit=next;calculate();}
  function restore(){Object.entries(demo).forEach(([key,val])=>{fields[key].value=val;});previousUnit='ev';document.getElementById('energy-unit-label').textContent='eV';document.getElementById('energy-uncertainty-unit').textContent='eV';calculate();}
  function download(){if(!latest)return;const rows=[['Field','Value','Unit'],['Plasma temperature',latest.temperature,'K'],['Temperature uncertainty',latest.temperatureUncertainty,'K'],['Measured electron density',latest.density,'cm^-3'],['Density uncertainty',latest.densityUncertainty,'cm^-3'],['Energy gap entered',latest.energyInput,latest.unit==='cm'?'cm^-1':'eV'],['Energy gap used',latest.energyEV,'eV'],['Energy uncertainty used',latest.energyUncertaintyEV,'eV'],['McWhirter minimum density',latest.required,'cm^-3'],['Required-density uncertainty',latest.requiredUncertainty,'cm^-3'],['Nominal margin',latest.nominalMargin,'ratio'],['Conservative margin',latest.conservativeMargin,'ratio'],['Result',latest.nominalPass?(latest.conservativePass?'criterion met including entered uncertainty bounds':'central values meet criterion; uncertainty-sensitive'):'criterion not met',''],['Interpretation','McWhirter is generally a necessary but not sufficient LTE condition for transient LIBS plasma.','']];const csv=rows.map((row)=>row.map((cell)=>`"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='lte-mcwhirter-check.csv';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);}
  function applyQuery(){const query=new URLSearchParams(location.search);const map={temperature:'temperature',density:'density',gap:'energy'};Object.entries(map).forEach(([parameter,key])=>{const incoming=Number(query.get(parameter));if(Number.isFinite(incoming)&&incoming>0)fields[key].value=incoming;});}

  Object.entries(fields).forEach(([key,field])=>{if(key==='unit')field.addEventListener('change',convertUnit);else field.addEventListener('input',calculate);});
  document.querySelectorAll('[data-help]').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('[data-help]').forEach((item)=>item.classList.toggle('is-active',item===button));document.getElementById('lte-help').textContent=helpText[button.dataset.help];}));
  document.getElementById('restore-lte').addEventListener('click',restore);document.getElementById('download-lte').addEventListener('click',download);applyQuery();calculate();
})();
