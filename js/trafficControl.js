/* Rail Nexus - Real-Time Traffic Control & Anti-Collision Safety Shield Module */

export class TrafficControlModule {
  constructor(app) {
    this.app = app;
    this.calcInputs = {
      activeTrainCount: 25,
      selectedTrainId: 'T12',
      currentStation: 'Station A',
      timeInput: '14:35',
      targetStation: 'Station B'
    };
    this.hasConflict = false;
    this.advisoryResult = null;
  }

  render() {
    const fleet = this.app.fleet;
    const activeTrains = fleet.filter(t => t.induction === 'revenue');

    // Run headway calculation on render
    const calcResult = this.computeHeadwayAdvisory();
    this.hasConflict = calcResult.isConflict;
    this.advisoryResult = calcResult;

    // Update global safety shield state
    this.app.updateSafetyShieldStatus(this.hasConflict ? 'conflict' : 'verified');

    return `
      <!-- Section Control Map Visualizer -->
      <div class="track-map-container">
        <div class="track-map-header">
          <div class="track-title">
            <i data-lucide="map" style="color:var(--accent-terracotta);"></i> Section Control Map (Station A ➔ B ➔ C)
          </div>
          <div style="font-size:0.78rem; background:var(--bg-secondary); padding:4px 12px; border-radius:12px; border:1px solid var(--border-color); font-weight:600;">
            <i data-lucide="radio" style="width:12px; height:12px; color:var(--status-service);"></i> Automatic Train Protection (ATP) Live
          </div>
        </div>

        <div class="stations-bar">
          <div class="track-line">
            <div class="track-line-progress"></div>
          </div>

          <div class="distance-marker-span dist-ab">Span A-B: 12 km</div>
          <div class="distance-marker-span dist-bc">Span B-C: 18 km</div>

          <!-- Station Node A -->
          <div class="station-node" style="left: 0%;">
            <div class="station-marker"></div>
            <div class="station-label">Station A</div>
            <div class="station-distance">0.0 km</div>
          </div>

          <!-- Station Node B -->
          <div class="station-node" style="left: 40%;">
            <div class="station-marker"></div>
            <div class="station-label">Station B</div>
            <div class="station-distance">12.0 km</div>
          </div>

          <!-- Station Node C -->
          <div class="station-node" style="left: 100%;">
            <div class="station-marker"></div>
            <div class="station-label">Station C</div>
            <div class="station-distance">30.0 km (Total)</div>
          </div>

          <!-- Animated Train Markers on Track -->
          ${this.renderTrackTrainMarkers(activeTrains)}
        </div>
      </div>

      <!-- Interactive Safety Calculator & Directives Engine -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <i data-lucide="calculator" style="color:var(--accent-terracotta);"></i> Anti-Collision Spacing & Headway Calculator
            </div>
            <div class="card-subtitle">Real-time spacing, speed estimate, and headway directive logic</div>
          </div>
        </div>

        <div class="calc-grid">
          <!-- Input Form -->
          <div>
            <div class="form-group">
              <label class="form-label">Number of Active Revenue Trains</label>
              <input type="number" id="calc-active-count" class="form-input" value="${activeTrains.length}" min="1" max="40">
            </div>

            <div class="form-group">
              <label class="form-label">Target Train ID</label>
              <select id="calc-train-id" class="form-select">
                ${fleet.map(t => `<option value="${t.id}" ${t.id === this.calcInputs.selectedTrainId ? 'selected' : ''}>${t.id} - ${t.name}</option>`).join('')}
              </select>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;">
              <div class="form-group">
                <label class="form-label">Current Station</label>
                <select id="calc-current-station" class="form-select">
                  <option value="Station A" ${this.calcInputs.currentStation === 'Station A' ? 'selected' : ''}>Station A (0 km)</option>
                  <option value="Station B" ${this.calcInputs.currentStation === 'Station B' ? 'selected' : ''}>Station B (12 km)</option>
                  <option value="Station C" ${this.calcInputs.currentStation === 'Station C' ? 'selected' : ''}>Station C (30 km)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Departure / Time Input</label>
                <input type="time" id="calc-time-input" class="form-input" value="${this.calcInputs.timeInput}">
              </div>
            </div>
          </div>

          <!-- Directives Output -->
          <div>
            <div class="advisory-box ${calcResult.isConflict ? 'conflict' : 'verified'}">
              <div class="advisory-title" style="color:${calcResult.isConflict ? 'var(--status-critical)' : 'var(--status-service)'};">
                <i data-lucide="${calcResult.isConflict ? 'alert-triangle' : 'shield-check'}"></i>
                ${calcResult.isConflict ? 'SAFETY DIRECTIVE - POTENTIAL BLOCK CONFLICT DETECTED' : 'SAFETY DIRECTIVE - MOVEMENT AUTHORIZED'}
              </div>
              <div class="advisory-text">
                ${calcResult.advisoryText}
              </div>

              <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px dashed var(--border-color); display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.8rem;">
                <div>
                  <span style="color:var(--text-muted);">Calculated Headway:</span><br>
                  <strong>${calcResult.headwayMin} min</strong> (Min required: 3.5 min)
                </div>
                <div>
                  <span style="color:var(--text-muted);">Estimated Speed:</span><br>
                  <strong>${calcResult.estSpeedKmh} km/h</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTrackTrainMarkers(activeTrains) {
    const selectedTrain = activeTrains.find(t => t.id === this.calcInputs.selectedTrainId) || activeTrains[0];
    const otherTrain = activeTrains.find(t => t.id !== this.calcInputs.selectedTrainId) || activeTrains[1];

    let leftPos1 = 5; // Station A
    let leftPos2 = 40; // Station B

    if (this.calcInputs.currentStation === 'Station B') leftPos1 = 40;
    if (this.calcInputs.currentStation === 'Station C') leftPos1 = 95;

    return `
      <div class="train-node-map ${this.hasConflict ? 'conflict' : ''}" style="left: ${leftPos1}%;">
        <div class="train-node-icon ${this.hasConflict ? 'conflict' : ''}">
          <i data-lucide="train" style="width:12px; height:12px;"></i>
          ${this.calcInputs.selectedTrainId}
        </div>
      </div>

      <div class="train-node-map" style="left: ${leftPos2}%;">
        <div class="train-node-icon" style="background:var(--dark-primary); color:var(--bg-surface);">
          <i data-lucide="train" style="width:12px; height:12px;"></i>
          T09
        </div>
      </div>
    `;
  }

  computeHeadwayAdvisory() {
    const trainId = this.calcInputs.selectedTrainId;
    const currentStation = this.calcInputs.currentStation;

    // Simulate headway conflict logic: If Train is at Station A and time is around 14:35 with T09 at Station B, detect block conflict
    if (currentStation === 'Station A' && trainId === 'T12') {
      return {
        isConflict: true,
        headwayMin: 2.1,
        estSpeedKmh: 72,
        advisoryText: `Advisory: Train ${trainId} must hold at Station A until 14:45 to maintain safe headway of 5.5 min and avoid block conflict with Train T09 currently operating at Station B (Span A-B: 12 km).`
      };
    } else if (currentStation === 'Station B') {
      return {
        isConflict: false,
        headwayMin: 6.4,
        estSpeedKmh: 65,
        advisoryText: `Advisory: Train ${trainId} cleared for departure from Station B toward Station C (Span B-C: 18 km). Movement authority granted with 6.4 min headway spacing.`
      };
    } else {
      return {
        isConflict: false,
        headwayMin: 8.2,
        estSpeedKmh: 68,
        advisoryText: `Advisory: Train ${trainId} operating within safe headway boundaries at ${currentStation}. No traffic or block overlap conflicts detected across section.`
      };
    }
  }

  attachEvents(container) {
    const activeCountInput = container.querySelector('#calc-active-count');
    const trainSelect = container.querySelector('#calc-train-id');
    const stationSelect = container.querySelector('#calc-current-station');
    const timeInput = container.querySelector('#calc-time-input');

    if (trainSelect) {
      trainSelect.addEventListener('change', (e) => {
        this.calcInputs.selectedTrainId = e.target.value;
        this.app.render();
      });
    }

    if (stationSelect) {
      stationSelect.addEventListener('change', (e) => {
        this.calcInputs.currentStation = e.target.value;
        this.app.render();
      });
    }

    if (timeInput) {
      timeInput.addEventListener('change', (e) => {
        this.calcInputs.timeInput = e.target.value;
        this.app.render();
      });
    }
  }
}
