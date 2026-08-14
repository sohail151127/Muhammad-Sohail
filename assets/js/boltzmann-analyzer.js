(() => {
  const tableBody = document.getElementById('line-rows');
  const chart = document.getElementById('boltzmann-chart');
  if (!tableBody || !chart) return;

  const kBoltzmannEV = 8.617333262e-5;
  const demoRows = [
    { label: 'Demo 1', wavelength: 400, intensity: 4330.9709, transition: 1.2e7, weight: 3, energy: 2.5 },
    { label: 'Demo 2', wavelength: 425, intensity: 7015.4438, transition: 2.4e7, weight: 5, energy: 3.0 },
    { label: 'Demo 3', wavelength: 450, intensity: 3932.9554, transition: 1.8e7, weight: 7, energy: 3.5 },
    { label: 'Demo 4', wavelength: 475, intensity: 1419.2167, transition: 3.1e7, weight: 3, energy: 4.0 },
    { label: 'Demo 5', wavelength: 500, intensity: 1140.0861, transition: 2.7e7, weight: 5, energy: 4.5 },
    { label: 'Demo 6', wavelength: 525, intensity: 440.7074, transition: 1.5e7, weight: 7, energy: 5.0 }
  ];
  const guideText = {
    wavelength: 'Wavelength λ identifies where the emission line appears. Enter nanometres (nm) and use the same wavelength convention for every row.',
    intensity: 'Integrated intensity I is the background-corrected area under the emission line. Values may be in arbitrary units, but they must be measured and processed consistently.',
    transition: 'Aₖᵢ is the radiative transition probability from upper level k to lower level i, in reciprocal seconds (s⁻¹). Obtain it from a reliable atomic database such as NIST ASD.',
    weight: 'gₖ is the statistical weight, or degeneracy, of the upper level. NIST expresses it as g = 2J + 1.',
    energy: 'Upper energy Eᵤ is the energy of the emitting upper level relative to the ground level. This tool requires electronvolts (eV).'
  };
  const resultNodes = {
    temperature: document.getElementById('temperature-k'), uncertainty: document.getElementById('temperature-uncertainty'), temperatureEV: document.getElementById('temperature-ev'), slope: document.getElementById('fit-slope'), r2: document.getElementById('fit-r2'), lines: document.getElementById('fit-lines'), span: document.getElementById('energy-span'), reading: document.getElementById('fit-reading'), status: document.getElementById('line-status')
  };
  let latestAnalysis = null;

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function rowMarkup(row = {}) {
    const value = (key) => row[key] ?? '';
    return `<tr>
      <td><input data-field="label" type="text" value="${escapeHTML(value('label'))}" aria-label="Line label"></td>
      <td><input data-field="wavelength" type="number" min="0" step="any" value="${value('wavelength')}" aria-label="Wavelength in nanometres"></td>
      <td><input data-field="intensity" type="number" min="0" step="any" value="${value('intensity')}" aria-label="Integrated intensity"></td>
      <td><input data-field="transition" type="number" min="0" step="any" value="${value('transition')}" aria-label="Transition probability per second"></td>
      <td><input data-field="weight" type="number" min="0" step="any" value="${value('weight')}" aria-label="Upper statistical weight"></td>
      <td><input data-field="energy" type="number" min="0" step="any" value="${value('energy')}" aria-label="Upper energy in electronvolts"></td>
      <td><button class="remove-line" type="button" aria-label="Remove this spectral line">×</button></td>
    </tr>`;
  }

  function setRows(rows) {
    tableBody.innerHTML = rows.map(rowMarkup).join('');
    analyze();
  }

  function readRows() {
    return [...tableBody.querySelectorAll('tr')].map((row, index) => {
      const get = (field) => row.querySelector(`[data-field="${field}"]`).value;
      return { row: index + 1, label: get('label').trim() || `Line ${index + 1}`, wavelength: Number(get('wavelength')), intensity: Number(get('intensity')), transition: Number(get('transition')), weight: Number(get('weight')), energy: Number(get('energy')) };
    });
  }

  function regression(points) {
    const count = points.length;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / count;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / count;
    const sxx = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    const sxy = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
    if (sxx === 0) return null;
    const slope = sxy / sxx;
    const intercept = meanY - slope * meanX;
    const fitted = points.map((point) => intercept + slope * point.x);
    const sse = points.reduce((sum, point, index) => sum + (point.y - fitted[index]) ** 2, 0);
    const sst = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
    const r2 = sst === 0 ? 0 : 1 - sse / sst;
    const slopeSE = count > 2 ? Math.sqrt((sse / (count - 2)) / sxx) : NaN;
    return { slope, intercept, fitted, sse, r2, slopeSE };
  }

  function clearResults(message, type = 'error') {
    ['temperature','uncertainty','temperatureEV','slope','r2','lines','span'].forEach((key) => { resultNodes[key].textContent = '—'; });
    resultNodes.reading.textContent = message;
    resultNodes.reading.className = `fit-reading is-${type}`;
    latestAnalysis = null;
    drawEmptyChart(message);
  }

  function analyze() {
    const rows = readRows();
    const valid = rows.filter((row) => row.wavelength > 0 && row.intensity > 0 && row.transition > 0 && row.weight > 0 && Number.isFinite(row.energy) && row.energy >= 0);
    const excluded = rows.length - valid.length;
    resultNodes.status.classList.toggle('has-error', excluded > 0 || valid.length < 3);
    resultNodes.status.textContent = `${valid.length} valid line${valid.length === 1 ? '' : 's'}${excluded ? ` · ${excluded} incomplete or invalid row${excluded === 1 ? '' : 's'} excluded` : ''}.`;
    if (valid.length < 3) { clearResults('Add at least three complete, positive spectral-line rows before calculating a fit.'); return; }
    const points = valid.map((row) => ({ ...row, x: row.energy, y: Math.log(row.intensity * row.wavelength / (row.weight * row.transition)) }));
    const fit = regression(points);
    if (!fit) { clearResults('The upper-energy values must not all be identical. A spread in Eᵤ is required to determine a slope.'); return; }
    if (fit.slope >= 0) { clearResults('The fitted slope is zero or positive, so this dataset does not produce a positive Boltzmann temperature. Check line assignments, atomic data, intensities and experimental assumptions.'); latestAnalysis = { points, fit, valid: false }; drawChart(points, fit); return; }

    const temperatureK = -1 / (kBoltzmannEV * fit.slope);
    const temperatureEV = kBoltzmannEV * temperatureK;
    const uncertaintyK = Number.isFinite(fit.slopeSE) ? fit.slopeSE / (kBoltzmannEV * fit.slope ** 2) : NaN;
    const energies = points.map((point) => point.x);
    const energySpan = Math.max(...energies) - Math.min(...energies);
    points.forEach((point, index) => { point.fitted = fit.fitted[index]; point.residual = point.y - fit.fitted[index]; });
    latestAnalysis = { points, fit, temperatureK, temperatureEV, uncertaintyK, energySpan, valid: true };

    resultNodes.temperature.textContent = `${temperatureK.toLocaleString('en-US', { maximumSignificantDigits: 4 })} K`;
    resultNodes.uncertainty.textContent = Number.isFinite(uncertaintyK) ? `Regression-only 1σ estimate: ± ${uncertaintyK.toLocaleString('en-US', { maximumSignificantDigits: 3 })} K` : 'Uncertainty requires more than two lines.';
    resultNodes.temperatureEV.textContent = `${temperatureEV.toLocaleString('en-US', { maximumSignificantDigits: 4 })} eV`;
    resultNodes.slope.textContent = `${fit.slope.toFixed(5)} eV⁻¹`;
    resultNodes.r2.textContent = fit.r2.toFixed(5);
    resultNodes.lines.textContent = valid.length;
    resultNodes.span.textContent = `${energySpan.toLocaleString('en-US', { maximumSignificantDigits: 3 })} eV`;

    const strong = fit.r2 >= 0.98;
    const narrow = energySpan < 1;
    resultNodes.reading.className = `fit-reading${strong && !narrow ? '' : ' is-caution'}`;
    resultNodes.reading.textContent = `${strong ? 'The transformed points are highly linear' : 'The transformed points show noticeable scatter'} (R² = ${fit.r2.toFixed(4)}). ${narrow ? 'The upper-energy span is below 1 eV, so the slope may be weakly constrained. ' : ''}The fitted slope corresponds to approximately ${temperatureK.toLocaleString('en-US', { maximumSignificantDigits: 4 })} K. This remains an excitation-temperature estimate under the stated assumptions—not proof of LTE or a complete plasma temperature measurement.`;
    drawChart(points, fit);
  }

  function svgElement(name, attributes = {}, text = '') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  }

  function drawEmptyChart(message) {
    chart.replaceChildren();
    chart.append(svgElement('rect', { x: 65, y: 35, width: 820, height: 410, fill: '#fafaf8', stroke: '#e2e3df' }));
    chart.append(svgElement('text', { x: 460, y: 240, 'text-anchor': 'middle', class: 'empty-chart-text' }, message));
  }

  function drawChart(points, fit) {
    chart.replaceChildren();
    const width = 920, height = 520, margin = { top: 35, right: 34, bottom: 67, left: 82 };
    const plotWidth = width - margin.left - margin.right, plotHeight = height - margin.top - margin.bottom;
    const rawXMin = Math.min(...points.map((point) => point.x)), rawXMax = Math.max(...points.map((point) => point.x));
    const allY = [...points.map((point) => point.y), ...fit.fitted];
    const rawYMin = Math.min(...allY), rawYMax = Math.max(...allY);
    const xPad = Math.max((rawXMax - rawXMin) * .08, .1), yPad = Math.max((rawYMax - rawYMin) * .12, .1);
    const xMin = rawXMin - xPad, xMax = rawXMax + xPad, yMin = rawYMin - yPad, yMax = rawYMax + yPad;
    const xScale = (value) => margin.left + (value - xMin) / (xMax - xMin) * plotWidth;
    const yScale = (value) => margin.top + plotHeight - (value - yMin) / (yMax - yMin) * plotHeight;
    for (let tick = 0; tick <= 5; tick += 1) {
      const x = margin.left + plotWidth * tick / 5, xv = xMin + (xMax - xMin) * tick / 5;
      const y = margin.top + plotHeight * tick / 5, yv = yMax - (yMax - yMin) * tick / 5;
      chart.append(svgElement('line', { x1: x, y1: margin.top, x2: x, y2: margin.top + plotHeight, class: 'chart-grid' }));
      chart.append(svgElement('text', { x, y: height - 36, 'text-anchor': 'middle', class: 'chart-label' }, xv.toFixed(2)));
      chart.append(svgElement('line', { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: 'chart-grid' }));
      chart.append(svgElement('text', { x: margin.left - 12, y: y + 4, 'text-anchor': 'end', class: 'chart-label' }, yv.toFixed(2)));
    }
    chart.append(svgElement('line', { x1: margin.left, y1: margin.top + plotHeight, x2: width - margin.right, y2: margin.top + plotHeight, class: 'chart-axis' }));
    chart.append(svgElement('line', { x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + plotHeight, class: 'chart-axis' }));
    chart.append(svgElement('text', { x: margin.left + plotWidth / 2, y: height - 8, 'text-anchor': 'middle', class: 'chart-axis-title' }, 'UPPER-LEVEL ENERGY, Eᵤ (eV)'));
    chart.append(svgElement('text', { x: 20, y: margin.top + plotHeight / 2, 'text-anchor': 'middle', transform: `rotate(-90 20 ${margin.top + plotHeight / 2})`, class: 'chart-axis-title' }, 'ln(Iλ / gA)'));
    const fitY1 = fit.intercept + fit.slope * rawXMin, fitY2 = fit.intercept + fit.slope * rawXMax;
    chart.append(svgElement('line', { x1: xScale(rawXMin), y1: yScale(fitY1), x2: xScale(rawXMax), y2: yScale(fitY2), class: 'fit-line' }));
    points.forEach((point, index) => {
      const x = xScale(point.x), y = yScale(point.y), fittedY = yScale(fit.fitted[index]);
      chart.append(svgElement('line', { x1: x, y1: y, x2: x, y2: fittedY, class: 'residual-line' }));
      const circle = svgElement('circle', { cx: x, cy: y, r: 6, class: 'data-point', tabindex: '0', 'aria-label': `${point.label}: upper energy ${point.x} electronvolts, transformed value ${point.y.toFixed(4)}` });
      circle.append(svgElement('title', {}, `${point.label}\nEᵤ = ${point.x} eV\ny = ${point.y.toFixed(5)}\nresidual = ${(point.y - fit.fitted[index]).toFixed(5)}`));
      chart.append(circle);
      chart.append(svgElement('text', { x: x + 9, y: y - 9, class: 'point-label' }, point.label));
    });
  }

  function downloadCSV() {
    if (!latestAnalysis?.points) return;
    const species = document.getElementById('species-name').value.trim() || 'Unspecified species';
    const headers = ['Species','Label','Wavelength_nm','Integrated_intensity','Aki_per_s','gk','Upper_energy_eV','ln_I_lambda_over_gA','Fitted_y','Residual'];
    const rows = latestAnalysis.points.map((point) => [species,point.label,point.wavelength,point.intensity,point.transition,point.weight,point.energy,point.y,point.fitted ?? '',point.residual ?? '']);
    if (latestAnalysis.valid) rows.push([],['Estimated_temperature_K',latestAnalysis.temperatureK],['Regression_R_squared',latestAnalysis.fit.r2],['Slope_per_eV',latestAnalysis.fit.slope],['Regression_only_uncertainty_K',latestAnalysis.uncertaintyK]);
    const csv = [headers,...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const link = document.createElement('a'); link.href = url; link.download = 'boltzmann-plot-analysis.csv'; link.click(); URL.revokeObjectURL(url);
  }

  tableBody.addEventListener('input', analyze);
  tableBody.addEventListener('click', (event) => { const button = event.target.closest('.remove-line'); if (!button) return; button.closest('tr').remove(); analyze(); });
  document.getElementById('add-line').addEventListener('click', () => { tableBody.insertAdjacentHTML('beforeend', rowMarkup({ label: `Line ${tableBody.children.length + 1}` })); tableBody.lastElementChild.querySelector('input').focus(); analyze(); });
  document.getElementById('restore-lines').addEventListener('click', () => { document.getElementById('species-name').value = 'Synthetic species I'; setRows(demoRows); tableBody.querySelector('input').focus(); });
  document.getElementById('download-boltzmann').addEventListener('click', downloadCSV);
  document.getElementById('table-guide').addEventListener('click', (event) => { const button = event.target.closest('[data-guide]'); if (!button) return; document.querySelectorAll('[data-guide]').forEach((item) => item.classList.toggle('is-active', item === button)); document.getElementById('guide-explanation').textContent = guideText[button.dataset.guide]; });
  setRows(demoRows);
})();
