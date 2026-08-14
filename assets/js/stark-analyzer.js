(() => {
  const chart = document.getElementById('stark-profile');
  if (!chart) return;

  const ids = ['line-label','centre-wavelength','measured-width','measured-uncertainty','instrument-width','instrument-uncertainty','correction-model','reference-width','reference-type','reference-density','reference-uncertainty','reference-temperature','plasma-temperature'];
  const fields = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const output = {
    density: document.getElementById('electron-density'), uncertainty: document.getElementById('density-uncertainty'), corrected: document.getElementById('corrected-width'), reference: document.getElementById('reference-fwhm'), order: document.getElementById('density-order'), share: document.getElementById('instrument-share'), temperature: document.getElementById('temperature-difference'), reading: document.getElementById('density-reading'), equation: document.getElementById('calculation-used')
  };
  const demo = { 'line-label':'Synthetic isolated line I', 'centre-wavelength':500, 'measured-width':0.24, 'measured-uncertainty':0.01, 'instrument-width':0.06, 'instrument-uncertainty':0.005, 'correction-model':'quadrature', 'reference-width':0.05, 'reference-type':'half', 'reference-density':1e16, 'reference-uncertainty':10, 'reference-temperature':10000, 'plasma-temperature':9500 };
  const help = {
    label: 'The label does not affect the mathematics. Record the element, ionization stage and wavelength so the result can be traced to the correct transition.',
    wavelength: 'Centre wavelength is the fitted location of the emission peak in nanometres. It sets the horizontal scale of the illustration but does not enter the density equation.',
    measured: 'Measured FWHM is the full peak width at half its maximum height. Obtain it from a fitted, background-corrected spectral line—not by counting pixels by eye.',
    'measured-uncertainty': 'This is the estimated one-standard-deviation uncertainty in the fitted measured width. It contributes to the displayed uncertainty in electron density.',
    instrument: 'Instrumental FWHM is the width produced by the spectrometer itself. Measure it with a narrow calibration line near the wavelength being analyzed.',
    correction: 'Gaussian quadrature uses √(measured² − instrument²). Lorentzian subtraction uses measured − instrument. No correction treats the full observed width as Stark width. Each is an approximation; a fitted Voigt profile is preferable when the component shapes are known.',
    'reference-width': 'Use a published Stark parameter for this exact transition. Check whether the source gives half-width w or a complete FWHM, and keep the wavelength unit consistent.',
    'reference-density': 'This is the electron density at which the published reference width was calculated or measured. Common tables use 10¹⁶ or 10¹⁷ cm⁻³, but you must copy the value from your actual source.'
  };
  let latest = null;

  const number = (id) => Number(fields[id].value);
  const round = (value, digits = 4) => Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
  const superscript = (value) => String(value).replace(/-/g,'⁻').replace(/0/g,'⁰').replace(/1/g,'¹').replace(/2/g,'²').replace(/3/g,'³').replace(/4/g,'⁴').replace(/5/g,'⁵').replace(/6/g,'⁶').replace(/7/g,'⁷').replace(/8/g,'⁸').replace(/9/g,'⁹');
  function scientific(value, digits = 3, unit = '') {
    if (!Number.isFinite(value) || value === 0) return `0${unit ? ` ${unit}` : ''}`;
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / (10 ** exponent);
    return `${mantissa.toFixed(digits)} × 10${superscript(exponent)}${unit ? ` ${unit}` : ''}`;
  }

  function correctedWidth(measured, instrument, measuredUncertainty, instrumentUncertainty, model) {
    if (model === 'none') return { width: measured, uncertainty: measuredUncertainty, label: 'No instrumental correction' };
    if (measured <= instrument) return null;
    if (model === 'lorentzian') return { width: measured - instrument, uncertainty: Math.hypot(measuredUncertainty, instrumentUncertainty), label: 'Lorentzian subtraction' };
    const width = Math.sqrt((measured ** 2) - (instrument ** 2));
    const uncertainty = width > 0 ? Math.hypot((measured / width) * measuredUncertainty, (instrument / width) * instrumentUncertainty) : NaN;
    return { width, uncertainty, label: 'Gaussian quadrature' };
  }

  function clearResult(message) {
    [output.density,output.uncertainty,output.corrected,output.reference,output.order,output.share,output.temperature,output.equation].forEach((node) => { node.textContent = '—'; });
    output.reading.textContent = message;
    output.reading.className = 'density-reading is-error';
    latest = null;
    drawEmpty(message);
  }

  function calculate() {
    const data = {
      label: fields['line-label'].value.trim() || 'Unlabelled line', wavelength:number('centre-wavelength'), measured:number('measured-width'), measuredUncertainty:number('measured-uncertainty'), instrument:number('instrument-width'), instrumentUncertainty:number('instrument-uncertainty'), model:fields['correction-model'].value, referenceWidth:number('reference-width'), referenceType:fields['reference-type'].value, referenceDensity:number('reference-density'), referenceUncertainty:number('reference-uncertainty'), referenceTemperature:number('reference-temperature'), plasmaTemperature:number('plasma-temperature')
    };
    const required = [data.wavelength,data.measured,data.referenceWidth,data.referenceDensity];
    if (required.some((value) => !Number.isFinite(value) || value <= 0)) return clearResult('Enter positive values for wavelength, measured FWHM, published width and reference electron density.');
    if ([data.instrument,data.measuredUncertainty,data.instrumentUncertainty,data.referenceUncertainty].some((value) => !Number.isFinite(value) || value < 0)) return clearResult('Widths and uncertainties cannot be negative. Use zero only when an optional uncertainty is unknown.');
    const correction = correctedWidth(data.measured, data.instrument, data.measuredUncertainty, data.instrumentUncertainty, data.model);
    if (!correction) return clearResult('The measured FWHM must be larger than the instrumental FWHM for this correction. Recheck the two values or choose “No correction” only when scientifically justified.');

    const referenceFWHM = data.referenceType === 'half' ? 2 * data.referenceWidth : data.referenceWidth;
    const density = data.referenceDensity * (correction.width / referenceFWHM);
    const correctedRelative = correction.width > 0 ? correction.uncertainty / correction.width : 0;
    const referenceRelative = data.referenceUncertainty / 100;
    const densityUncertainty = density * Math.hypot(correctedRelative, referenceRelative);
    const instrumentShare = data.instrument / data.measured;
    const temperatureDifference = data.referenceTemperature > 0 && data.plasmaTemperature > 0 ? Math.abs(data.referenceTemperature - data.plasmaTemperature) / data.referenceTemperature : NaN;
    const exponent = Math.floor(Math.log10(density));
    const ratio = correction.width / referenceFWHM;

    output.density.textContent = scientific(density, 3, 'cm⁻³');
    output.uncertainty.textContent = densityUncertainty > 0 ? `Propagated input estimate: ± ${scientific(densityUncertainty, 2, 'cm⁻³')} (${round((densityUncertainty / density) * 100, 1)}%)` : 'No input uncertainty was supplied.';
    output.corrected.textContent = `${round(correction.width, 5)} nm`;
    output.reference.textContent = `${round(referenceFWHM, 5)} nm`;
    output.order.textContent = `10${superscript(exponent)} cm⁻³`;
    output.share.textContent = `${round(instrumentShare * 100, 1)}%`;
    output.temperature.textContent = Number.isFinite(temperatureDifference) ? `${round(temperatureDifference * 100, 1)}%` : 'Not assessed';
    const referenceText = data.referenceType === 'half' ? `2 × ${round(data.referenceWidth,5)} nm` : `${round(data.referenceWidth,5)} nm`;
    output.equation.textContent = `Nₑ = ${scientific(data.referenceDensity,2)} × (${round(correction.width,5)} nm ÷ ${referenceText}) = ${scientific(density,3,'cm⁻³')}`;

    const cautions = [];
    if (data.model === 'none' && data.instrument > 0) cautions.push('instrumental width was not removed');
    if (instrumentShare >= 0.5 && data.model !== 'none') cautions.push('instrument width is at least half of the observed width');
    if (Number.isFinite(temperatureDifference) && temperatureDifference > 0.2) cautions.push('the plasma and reference temperatures differ by more than 20%');
    if (ratio > 10 || ratio < 0.1) cautions.push('the result extrapolates more than tenfold from the reference width');
    const plainMeaning = `The corrected line width is ${round(ratio,2)} times the published reference width, so the estimated electron density is ${round(ratio,2)} times the reference density.`;
    output.reading.textContent = cautions.length ? `${plainMeaning} Treat the result cautiously because ${cautions.join('; ')}.` : `${plainMeaning} The numerical uncertainty shown above covers only the entered width uncertainties—not model error, line blending or an incorrect atomic parameter.`;
    output.reading.className = `density-reading${cautions.length ? ' is-caution' : ''}`;

    latest = { ...data, correctedWidth:correction.width, correctedUncertainty:correction.uncertainty, correctionLabel:correction.label, referenceFWHM, density, densityUncertainty, instrumentShare, temperatureDifference, ratio };
    drawProfile(latest);
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attributes = {}, text = '') {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key,value]) => node.setAttribute(key,value));
    if (text) node.textContent = text;
    return node;
  }
  function drawEmpty(message) {
    chart.replaceChildren(svg('text',{x:500,y:230,'text-anchor':'middle',class:'empty-chart-text'},message));
  }
  function drawProfile(data) {
    chart.replaceChildren();
    const left=74,right=970,top=35,bottom=390,width=right-left,height=bottom-top;
    const span=Math.max(data.measured*3.2,0.18), min=data.wavelength-span, max=data.wavelength+span;
    const xScale=(x)=>left+((x-min)/(max-min))*width, yScale=(y)=>bottom-(y*height);
    for(let i=0;i<=5;i++){const y=i/5,py=yScale(y);chart.append(svg('line',{x1:left,y1:py,x2:right,y2:py,class:'chart-grid'}));chart.append(svg('text',{x:left-12,y:py+4,'text-anchor':'end',class:'chart-label'},y.toFixed(1)));}
    for(let i=0;i<=6;i++){const x=min+((max-min)*i/6),px=xScale(x);chart.append(svg('line',{x1:px,y1:top,x2:px,y2:bottom,class:'chart-grid'}));chart.append(svg('text',{x:px,y:bottom+23,'text-anchor':'middle',class:'chart-label'},x.toFixed(2)));}
    chart.append(svg('line',{x1:left,y1:bottom,x2:right,y2:bottom,class:'chart-axis'}));chart.append(svg('line',{x1:left,y1:top,x2:left,y2:bottom,class:'chart-axis'}));chart.append(svg('line',{x1:left,y1:yScale(.5),x2:right,y2:yScale(.5),class:'half-line'}));chart.append(svg('text',{x:left+7,y:yScale(.5)-8,class:'chart-label'},'Half maximum'));
    chart.append(svg('text',{x:(left+right)/2,y:446,'text-anchor':'middle',class:'chart-axis-title'},'WAVELENGTH (nm)'));chart.append(svg('text',{x:18,y:(top+bottom)/2,transform:`rotate(-90 18 ${(top+bottom)/2})`,'text-anchor':'middle',class:'chart-axis-title'},'NORMALIZED INTENSITY'));
    const pathFor=(fwhm,shape)=>{let d='';for(let i=0;i<=320;i++){const x=min+(max-min)*i/320,dx=x-data.wavelength;const y=shape==='gaussian'?Math.exp(-4*Math.log(2)*(dx/fwhm)**2):1/(1+4*(dx/fwhm)**2);d+=`${i?'L':'M'}${xScale(x).toFixed(2)},${yScale(y).toFixed(2)}`;}return d;};
    chart.append(svg('path',{d:pathFor(data.measured,'lorentzian'),class:'observed-curve'}));
    chart.append(svg('path',{d:pathFor(data.correctedWidth,'lorentzian'),class:'stark-curve'}));
    if(data.instrument>0) chart.append(svg('path',{d:pathFor(data.instrument,'gaussian'),class:'instrument-curve'}));
    const halfY=yScale(.5),x1=xScale(data.wavelength-data.correctedWidth/2),x2=xScale(data.wavelength+data.correctedWidth/2);
    chart.append(svg('line',{x1,y1:halfY,x2,y2:halfY,class:'width-marker'}));chart.append(svg('line',{x1,y1:halfY-7,x2:x1,y2:halfY+7,class:'width-marker'}));chart.append(svg('line',{x1:x2,y1:halfY-7,x2,y2:halfY+7,class:'width-marker'}));
    chart.append(svg('text',{x:(x1+x2)/2,y:halfY-13,'text-anchor':'middle',class:'chart-label'},`Corrected FWHM ${round(data.correctedWidth,4)} nm`));
  }

  function downloadCSV() {
    if (!latest) return;
    const rows = [
      ['Field','Value','Unit'],['Line label',latest.label,''],['Centre wavelength',latest.wavelength,'nm'],['Measured FWHM',latest.measured,'nm'],['Measured FWHM uncertainty',latest.measuredUncertainty,'nm'],['Instrumental FWHM',latest.instrument,'nm'],['Instrumental uncertainty',latest.instrumentUncertainty,'nm'],['Correction model',latest.correctionLabel,''],['Corrected Stark FWHM',latest.correctedWidth,'nm'],['Corrected width uncertainty',latest.correctedUncertainty,'nm'],['Published input value',latest.referenceWidth,'nm'],['Published value type',latest.referenceType === 'half' ? 'electron-impact half-width w' : 'full Stark FWHM',''],['Reference Stark FWHM used',latest.referenceFWHM,'nm'],['Reference electron density',latest.referenceDensity,'cm^-3'],['Reference-width uncertainty',latest.referenceUncertainty,'%'],['Reference temperature',latest.referenceTemperature,'K'],['Plasma temperature',latest.plasmaTemperature,'K'],['Estimated electron density',latest.density,'cm^-3'],['Propagated input uncertainty',latest.densityUncertainty,'cm^-3'],['Important note','Estimate depends on line isolation, profile correction, Stark dominance and correct reference data.','']
    ];
    const csv=rows.map((row)=>row.map((cell)=>`"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='stark-electron-density-analysis.csv';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  }

  ids.forEach((id)=>fields[id].addEventListener(fields[id].tagName === 'SELECT' ? 'change' : 'input',calculate));
  document.querySelectorAll('[data-help]').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('[data-help]').forEach((item)=>item.classList.toggle('is-active',item===button));document.getElementById('help-message').textContent=help[button.dataset.help];}));
  document.getElementById('restore-stark').addEventListener('click',()=>{Object.entries(demo).forEach(([id,value])=>{fields[id].value=value;});calculate();});
  document.getElementById('download-stark').addEventListener('click',downloadCSV);
  calculate();
})();
