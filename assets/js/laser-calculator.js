(() => {
  const form = document.getElementById('laser-form');
  if (!form) return;

  const defaults = { wavelength: 1064, pulseEnergy: 50, pulseDuration: 8, repetitionRate: 10, beamDiameter: 5, focalLength: 100, beamQuality: 1.5 };
  const fields = {
    wavelength: document.getElementById('wavelength'), pulseEnergy: document.getElementById('pulse-energy'), pulseDuration: document.getElementById('pulse-duration'), repetitionRate: document.getElementById('repetition-rate'), beamDiameter: document.getElementById('beam-diameter'), focalLength: document.getElementById('focal-length'), beamQuality: document.getElementById('beam-quality')
  };
  const output = {
    spot: document.getElementById('spot-diameter'), fluence: document.getElementById('peak-fluence'), power: document.getElementById('peak-power'), irradiance: document.getElementById('peak-irradiance'), average: document.getElementById('average-power'), rayleigh: document.getElementById('rayleigh-range'), divergence: document.getElementById('divergence'), fNumber: document.getElementById('f-number'), visualSpot: document.getElementById('visual-spot'), explanation: document.getElementById('result-explanation'), message: document.getElementById('input-message'), spotSub: document.getElementById('spot-substitution'), powerSub: document.getElementById('power-substitution'), fluenceSub: document.getElementById('fluence-substitution'), irradianceSub: document.getElementById('irradiance-substitution')
  };

  function readable(value, unit, digits = 3) {
    if (!Number.isFinite(value)) return '—';
    const absolute = Math.abs(value);
    let number;
    if (absolute !== 0 && (absolute >= 100000 || absolute < 0.001)) number = value.toExponential(2);
    else number = value.toLocaleString('en-US', { maximumSignificantDigits: digits });
    return `${number} ${unit}`;
  }

  function readInputs() {
    return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, Number(field.value)]));
  }

  function validate(values) {
    const labels = { wavelength: 'Wavelength', pulseEnergy: 'Pulse energy', pulseDuration: 'Pulse duration', repetitionRate: 'Repetition rate', beamDiameter: 'Beam diameter', focalLength: 'Focal length', beamQuality: 'M² beam quality' };
    const invalid = Object.entries(values).find(([key, value]) => !Number.isFinite(value) || (key === 'repetitionRate' ? value < 0 : value <= 0));
    if (invalid) return `${labels[invalid[0]]} must be a valid ${invalid[0] === 'repetitionRate' ? 'zero or positive' : 'positive'} number.`;
    if (values.beamQuality < 1) return 'M² cannot be below 1. An ideal Gaussian beam has M² = 1; real beams are equal to or larger than 1.';
    return '';
  }

  function calculate(values) {
    const wavelengthM = values.wavelength * 1e-9;
    const energyJ = values.pulseEnergy * 1e-3;
    const durationS = values.pulseDuration * 1e-9;
    const diameterM = values.beamDiameter * 1e-3;
    const focalLengthM = values.focalLength * 1e-3;
    const radiusM = 2 * values.beamQuality * wavelengthM * focalLengthM / (Math.PI * diameterM);
    const spotDiameterM = 2 * radiusM;
    const gaussianAreaM2 = Math.PI * radiusM ** 2;
    const peakPowerW = energyJ / durationS;
    const peakFluenceJcm2 = (2 * energyJ / gaussianAreaM2) / 1e4;
    const peakIrradianceWcm2 = (2 * peakPowerW / gaussianAreaM2) / 1e4;
    const averagePowerW = energyJ * values.repetitionRate;
    const rayleighM = Math.PI * radiusM ** 2 / (values.beamQuality * wavelengthM);
    const divergenceRad = values.beamQuality * wavelengthM / (Math.PI * radiusM);
    return { wavelengthM, energyJ, durationS, diameterM, focalLengthM, radiusM, spotDiameterM, peakPowerW, peakFluenceJcm2, peakIrradianceWcm2, averagePowerW, rayleighM, divergenceRad, fNumber: focalLengthM / diameterM };
  }

  function render() {
    const values = readInputs();
    const error = validate(values);
    output.message.hidden = !error;
    output.message.textContent = error;
    if (error) return;
    const result = calculate(values);
    const spotMicrometres = result.spotDiameterM * 1e6;
    output.spot.textContent = readable(spotMicrometres, 'µm');
    output.visualSpot.textContent = readable(spotMicrometres, 'µm');
    output.fluence.textContent = readable(result.peakFluenceJcm2, 'J/cm²');
    output.power.textContent = readable(result.peakPowerW / 1e6, 'MW');
    output.irradiance.textContent = readable(result.peakIrradianceWcm2 / 1e9, 'GW/cm²');
    output.average.textContent = readable(result.averagePowerW, 'W');
    output.rayleigh.textContent = readable(result.rayleighM * 1e3, 'mm');
    output.divergence.textContent = readable(result.divergenceRad * 1e3, 'mrad');
    output.fNumber.textContent = `f/${result.fNumber.toLocaleString('en-US', { maximumSignificantDigits: 3 })}`;

    output.explanation.textContent = `With these assumptions, the lens produces an estimated ${readable(spotMicrometres, 'µm')} spot. Delivering ${values.pulseEnergy} mJ in ${values.pulseDuration} ns gives about ${readable(result.peakPowerW / 1e6, 'MW')} of rectangular-equivalent peak power. Concentrating that pulse into the Gaussian focus gives an on-axis peak fluence estimate of ${readable(result.peakFluenceJcm2, 'J/cm²')}. Real measurements may differ because alignment, aberrations, transmission losses, pulse shape and plasma formation are not included.`;

    output.spotSub.textContent = `d = 4 × ${values.beamQuality} × ${values.wavelength} nm × ${values.focalLength} mm ÷ (π × ${values.beamDiameter} mm) = ${readable(spotMicrometres, 'µm')}`;
    output.powerSub.textContent = `P ≈ ${values.pulseEnergy} mJ ÷ ${values.pulseDuration} ns = ${readable(result.peakPowerW / 1e6, 'MW')}`;
    output.fluenceSub.textContent = `F = 2 × ${values.pulseEnergy} mJ ÷ [π × (${readable(result.radiusM * 1e6, 'µm')})²] = ${readable(result.peakFluenceJcm2, 'J/cm²')}`;
    output.irradianceSub.textContent = `I = 2 × ${readable(result.peakPowerW / 1e6, 'MW')} ÷ [π × (${readable(result.radiusM * 1e6, 'µm')})²] = ${readable(result.peakIrradianceWcm2 / 1e9, 'GW/cm²')}`;
  }

  form.addEventListener('input', render);
  document.getElementById('restore-example').addEventListener('click', () => { Object.entries(defaults).forEach(([key, value]) => { fields[key].value = value; }); render(); fields.wavelength.focus(); });
  render();
})();
