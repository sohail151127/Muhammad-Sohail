(() => {
  const chart = document.getElementById('spectrum-chart');
  if (!chart) return;

  const palette = ['#315f8a', '#dd6c3e', '#467977', '#7b5b87', '#9a7b35'];
  const elements = {
    file: document.getElementById('spectrum-file'),
    demo: document.getElementById('load-demo'),
    baseline: document.getElementById('baseline-toggle'),
    normalization: document.getElementById('normalization'),
    threshold: document.getElementById('peak-threshold'),
    thresholdOutput: document.getElementById('threshold-output'),
    peakToggle: document.getElementById('peak-toggle'),
    download: document.getElementById('download-data'),
    status: document.getElementById('dataset-status'),
    legend: document.getElementById('chart-legend'),
    table: document.getElementById('peak-table-body'),
    processing: document.getElementById('processing-summary'),
    tooltip: document.getElementById('chart-tooltip'),
    points: document.getElementById('metric-points'),
    range: document.getElementById('metric-range'),
    samples: document.getElementById('metric-samples'),
    peak: document.getElementById('metric-peak')
  };

  let rawData = createDemoData();
  let processedData = null;
  let currentPeaks = [];

  function gaussian(x, center, width, height) {
    return height * Math.exp(-0.5 * Math.pow((x - center) / width, 2));
  }

  function createDemoData() {
    const wavelengths = [];
    const healthy = [];
    const infected = [];
    for (let wavelength = 240; wavelength <= 780; wavelength += 2) {
      const base = 105 + 0.12 * (wavelength - 240) + 8 * Math.sin(wavelength / 27);
      const structure = gaussian(wavelength, 279.6, 2.6, 260) + gaussian(wavelength, 393.4, 2.2, 590) + gaussian(wavelength, 422.7, 2.8, 330) + gaussian(wavelength, 589.2, 2.6, 470) + gaussian(wavelength, 766.5, 3.1, 530);
      wavelengths.push(wavelength);
      healthy.push(base + structure + 6 * Math.sin(wavelength * 0.47));
      infected.push(base * 1.08 + structure * 0.78 + gaussian(wavelength, 516.8, 3.2, 260) + 7 * Math.cos(wavelength * 0.39));
    }
    return { name: 'Synthetic demonstration', wavelengths, series: [{ name: 'Demo sample A', values: healthy }, { name: 'Demo sample B', values: infected }], synthetic: true };
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function parseCSV(text, fileName) {
    const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split(/[;,\t]/).map((cell) => cell.trim()));
    if (rows.length < 3) throw new Error('The file needs a header and at least two numeric data rows.');
    const firstIsNumeric = Number.isFinite(Number(rows[0][0])) && Number.isFinite(Number(rows[0][1]));
    const header = firstIsNumeric ? rows[0].map((_, index) => index === 0 ? 'Wavelength' : `Sample ${index}`) : rows.shift();
    const columnCount = Math.max(...rows.map((row) => row.length));
    if (columnCount < 2) throw new Error('Include a wavelength column and at least one intensity column.');
    const parsed = rows.map((row) => row.slice(0, columnCount).map(Number)).filter((row) => row.length === columnCount && row.every(Number.isFinite)).sort((a, b) => a[0] - b[0]);
    if (parsed.length < 2) throw new Error('No usable numeric wavelength–intensity rows were found.');
    return {
      name: fileName,
      wavelengths: parsed.map((row) => row[0]),
      series: Array.from({ length: columnCount - 1 }, (_, index) => ({ name: header[index + 1] || `Sample ${index + 1}`, values: parsed.map((row) => row[index + 1]) })),
      synthetic: false
    };
  }

  function edgeBaseline(values) {
    const edgeCount = Math.max(3, Math.min(12, Math.floor(values.length * 0.06)));
    const start = median(values.slice(0, edgeCount));
    const end = median(values.slice(-edgeCount));
    return values.map((_, index) => start + (end - start) * index / Math.max(1, values.length - 1));
  }

  function integrate(values, wavelengths) {
    let area = 0;
    for (let index = 1; index < values.length; index += 1) area += Math.abs(wavelengths[index] - wavelengths[index - 1]) * (Math.abs(values[index]) + Math.abs(values[index - 1])) / 2;
    return area;
  }

  function processData() {
    const useBaseline = elements.baseline.checked;
    const normalization = elements.normalization.value;
    processedData = {
      ...rawData,
      series: rawData.series.map((series) => {
        const baseline = useBaseline ? edgeBaseline(series.values) : series.values.map(() => 0);
        let values = series.values.map((value, index) => Math.max(0, value - baseline[index]));
        const divisor = normalization === 'max' ? Math.max(...values.map(Math.abs), 1) : normalization === 'area' ? Math.max(integrate(values, rawData.wavelengths), 1) : 1;
        values = values.map((value) => value / divisor);
        return { ...series, values };
      })
    };
    currentPeaks = findPeaks(processedData);
    render();
  }

  function findPeaks(data) {
    const threshold = Number(elements.threshold.value) / 100;
    const candidates = [];
    data.series.forEach((series, seriesIndex) => {
      const maximum = Math.max(...series.values, 0);
      for (let index = 2; index < series.values.length - 2; index += 1) {
        const value = series.values[index];
        if (value >= maximum * threshold && value > series.values[index - 1] && value >= series.values[index + 1] && value > series.values[index - 2] && value >= series.values[index + 2]) {
          candidates.push({ seriesIndex, sample: series.name, index, wavelength: data.wavelengths[index], value, relative: maximum ? value / maximum : 0 });
        }
      }
    });
    return candidates.sort((a, b) => b.relative - a.relative).slice(0, 12);
  }

  function svgElement(name, attributes = {}, text = '') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1000) return value.toExponential(2);
    if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
    return value.toFixed(value < 10 ? 3 : 1);
  }

  function renderChart() {
    chart.replaceChildren();
    const width = 960;
    const height = 480;
    const margin = { top: 34, right: 28, bottom: 58, left: 72 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const xMin = processedData.wavelengths[0];
    const xMax = processedData.wavelengths.at(-1);
    const allValues = processedData.series.flatMap((series) => series.values);
    const yMin = Math.min(0, ...allValues);
    const yMax = Math.max(...allValues, 1);
    const xScale = (value) => margin.left + (value - xMin) / Math.max(1, xMax - xMin) * plotWidth;
    const yScale = (value) => margin.top + plotHeight - (value - yMin) / Math.max(1e-12, yMax - yMin) * plotHeight;

    for (let tick = 0; tick <= 5; tick += 1) {
      const x = margin.left + plotWidth * tick / 5;
      const wavelength = xMin + (xMax - xMin) * tick / 5;
      chart.append(svgElement('line', { x1: x, y1: margin.top, x2: x, y2: margin.top + plotHeight, class: 'chart-grid' }));
      chart.append(svgElement('text', { x, y: height - 31, 'text-anchor': 'middle', class: 'chart-label' }, wavelength.toFixed(0)));
      const y = margin.top + plotHeight * tick / 5;
      const intensity = yMax - (yMax - yMin) * tick / 5;
      chart.append(svgElement('line', { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: 'chart-grid' }));
      chart.append(svgElement('text', { x: margin.left - 12, y: y + 4, 'text-anchor': 'end', class: 'chart-label' }, formatNumber(intensity)));
    }
    chart.append(svgElement('line', { x1: margin.left, y1: margin.top + plotHeight, x2: width - margin.right, y2: margin.top + plotHeight, class: 'chart-axis' }));
    chart.append(svgElement('line', { x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + plotHeight, class: 'chart-axis' }));
    chart.append(svgElement('text', { x: margin.left + plotWidth / 2, y: height - 7, 'text-anchor': 'middle', class: 'chart-axis-title' }, 'WAVELENGTH (nm)'));
    chart.append(svgElement('text', { x: 17, y: margin.top + plotHeight / 2, 'text-anchor': 'middle', transform: `rotate(-90 17 ${margin.top + plotHeight / 2})`, class: 'chart-axis-title' }, 'PROCESSED INTENSITY'));

    processedData.series.forEach((series, seriesIndex) => {
      const points = series.values.map((value, index) => `${xScale(processedData.wavelengths[index]).toFixed(2)},${yScale(value).toFixed(2)}`).join(' ');
      chart.append(svgElement('polyline', { points, class: 'chart-line', stroke: palette[seriesIndex % palette.length] }));
    });

    if (elements.peakToggle.checked) {
      currentPeaks.slice(0, 8).forEach((peak, index) => {
        const x = xScale(peak.wavelength);
        const y = yScale(peak.value);
        chart.append(svgElement('line', { x1: x, y1: y, x2: x, y2: margin.top + plotHeight, class: 'chart-peak-line' }));
        chart.append(svgElement('circle', { cx: x, cy: y, r: 4, class: 'chart-peak-dot' }));
        chart.append(svgElement('text', { x: x + 5, y: Math.max(margin.top + 11, y - 8 - (index % 2) * 10), class: 'chart-peak-label' }, `${peak.wavelength.toFixed(1)} nm`));
      });
    }

    const crosshair = svgElement('line', { y1: margin.top, y2: margin.top + plotHeight, class: 'chart-crosshair', visibility: 'hidden' });
    const focusDots = processedData.series.map((series, index) => svgElement('circle', { r: 4, class: 'chart-focus-dot', stroke: palette[index % palette.length], visibility: 'hidden' }));
    chart.append(crosshair, ...focusDots);
    const hitArea = svgElement('rect', { x: margin.left, y: margin.top, width: plotWidth, height: plotHeight, class: 'chart-hit-area', tabindex: '0', 'aria-label': 'Interactive spectrum plot. Use left and right arrow keys to inspect wavelengths.' });
    chart.append(hitArea);
    let focusIndex = Math.floor(processedData.wavelengths.length / 2);
    const showPoint = (index, clientX, clientY) => {
      focusIndex = Math.max(0, Math.min(processedData.wavelengths.length - 1, index));
      const x = xScale(processedData.wavelengths[focusIndex]);
      crosshair.setAttribute('x1', x); crosshair.setAttribute('x2', x); crosshair.setAttribute('visibility', 'visible');
      focusDots.forEach((dot, seriesIndex) => { dot.setAttribute('cx', x); dot.setAttribute('cy', yScale(processedData.series[seriesIndex].values[focusIndex])); dot.setAttribute('visibility', 'visible'); });
      elements.tooltip.innerHTML = `<strong>${processedData.wavelengths[focusIndex].toFixed(2)} nm</strong>${processedData.series.map((series) => `<span>${escapeHTML(series.name)}: ${formatNumber(series.values[focusIndex])}</span>`).join('')}`;
      elements.tooltip.hidden = false;
      const cardRect = chart.closest('.chart-card').getBoundingClientRect();
      elements.tooltip.style.left = `${Math.min(cardRect.width - 220, Math.max(8, (clientX ?? cardRect.left + x / width * cardRect.width) - cardRect.left + 10))}px`;
      elements.tooltip.style.top = `${Math.max(70, (clientY ?? cardRect.top + 210) - cardRect.top - 20)}px`;
    };
    hitArea.addEventListener('pointermove', (event) => { const rect = chart.getBoundingClientRect(); const viewX = (event.clientX - rect.left) / rect.width * width; showPoint(Math.round((viewX - margin.left) / plotWidth * (processedData.wavelengths.length - 1)), event.clientX, event.clientY); });
    hitArea.addEventListener('pointerleave', () => { crosshair.setAttribute('visibility', 'hidden'); focusDots.forEach((dot) => dot.setAttribute('visibility', 'hidden')); elements.tooltip.hidden = true; });
    hitArea.addEventListener('focus', () => showPoint(focusIndex));
    hitArea.addEventListener('blur', () => { crosshair.setAttribute('visibility', 'hidden'); focusDots.forEach((dot) => dot.setAttribute('visibility', 'hidden')); elements.tooltip.hidden = true; });
    hitArea.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showPoint(focusIndex + (event.key === 'ArrowRight' ? 1 : -1)); } });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function render() {
    renderChart();
    elements.legend.innerHTML = processedData.series.map((series, index) => `<span><i style="--legend-color:${palette[index % palette.length]}"></i>${escapeHTML(series.name)}</span>`).join('');
    elements.table.innerHTML = currentPeaks.length ? currentPeaks.map((peak) => `<tr><td>${escapeHTML(peak.sample)}</td><td>${peak.wavelength.toFixed(2)} nm</td><td>${formatNumber(peak.value)}</td><td>${(peak.relative * 100).toFixed(1)}%</td></tr>`).join('') : '<tr class="empty-row"><td colspan="4">No local maxima exceed the selected threshold. Try lowering it.</td></tr>';
    elements.points.textContent = processedData.wavelengths.length.toLocaleString();
    elements.range.textContent = `${processedData.wavelengths[0].toFixed(0)}–${processedData.wavelengths.at(-1).toFixed(0)} nm`;
    elements.samples.textContent = processedData.series.length;
    elements.peak.textContent = currentPeaks.length ? `${currentPeaks[0].wavelength.toFixed(1)} nm` : 'None';
    const steps = [];
    if (elements.baseline.checked) steps.push('linear edge baseline');
    steps.push(elements.normalization.value === 'max' ? 'maximum normalization' : elements.normalization.value === 'area' ? 'area normalization' : 'no normalization');
    elements.processing.textContent = steps.join(' · ');
  }

  function downloadProcessed() {
    if (!processedData) return;
    const header = ['Wavelength_nm', ...processedData.series.map((series) => series.name)];
    const rows = processedData.wavelengths.map((wavelength, index) => [wavelength, ...processedData.series.map((series) => series.values[index])].map((value) => typeof value === 'number' ? Number(value.toPrecision(10)) : value));
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'libs-spectrum-processed.csv'; link.click();
    URL.revokeObjectURL(url);
  }

  elements.file.addEventListener('change', async () => {
    const file = elements.file.files[0];
    if (!file) return;
    try {
      rawData = parseCSV(await file.text(), file.name);
      elements.status.textContent = `${file.name} loaded locally: ${rawData.wavelengths.length} points across ${rawData.series.length} sample${rawData.series.length === 1 ? '' : 's'}.`;
      processData();
    } catch (error) {
      elements.status.textContent = `Could not read ${file.name}: ${error.message}`;
    }
  });
  elements.demo.addEventListener('click', () => { rawData = createDemoData(); elements.file.value = ''; elements.status.textContent = 'Synthetic demonstration data restored. Upload your own CSV at any time.'; processData(); });
  elements.baseline.addEventListener('change', processData);
  elements.normalization.addEventListener('change', processData);
  elements.threshold.addEventListener('input', () => { elements.thresholdOutput.textContent = `${elements.threshold.value}%`; processData(); });
  elements.peakToggle.addEventListener('change', render);
  elements.download.addEventListener('click', downloadProcessed);

  processData();
})();
