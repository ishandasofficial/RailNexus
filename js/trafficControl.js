/* Rail Nexus - Real-Time Traffic Control & Anti-Collision Safety Shield Module */

export class TrafficControlModule {
  constructor(app) {
    this.app = app;

    // State for 4 customizable trains & automated emergency reroute switch
    this.calcInputs = {
      isAutoRerouteEnabled: true,
      t1: { id: 'T12', line: 'line1', km: 4.2, speed: 65, enabled: true },
      t2: { id: 'T09', line: 'line1', km: 11.5, speed: 55, enabled: true },
      t3: { id: 'T04', line: 'line2', km: 3.8, speed: 70, enabled: true },
      t4: { id: 'T18', line: 'line2', km: 12.2, speed: 60, enabled: true },
      isSimulating: false
    };

    this.simAnimFrame = null;
    this.lastFrameTime = 0;
    this.hasConflict = false;
    this.advisoryResult = null;
  }

  render() {
    const fleet = this.app.fleet;

    // Compute dynamic headway and safety directives across active trains on both lines
    const calcResult = this.computeHeadwayAdvisory();
    this.hasConflict = calcResult.isConflict;
    this.advisoryResult = calcResult;

    // Update global safety shield badge state on top app header
    this.app.updateSafetyShieldStatus(calcResult.directiveState);

    return `
      <!-- Dual Interconnected Section Control Map Visualizer -->
      <div class="track-map-container">
        <div class="track-map-header">
          <div class="track-title">
            <i data-lucide="git-merge" style="color:var(--accent-terracotta);"></i> Dual-Line Interconnected Network Map (4 Active Trains)
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem;">
            <!-- Connect Lines & Emergency Reroute Button -->
            <button id="toggle-reroute-btn" class="action-btn-sm" style="background:${this.calcInputs.isAutoRerouteEnabled ? 'var(--accent-terracotta-tint)' : 'var(--bg-secondary)'}; color:${this.calcInputs.isAutoRerouteEnabled ? 'var(--accent-terracotta)' : 'var(--text-muted)'}; font-weight:700; border-color:${this.calcInputs.isAutoRerouteEnabled ? 'var(--accent-terracotta)' : 'var(--border-color)'};">
              <i data-lucide="git-branch" style="width:12px; height:12px; vertical-align:middle;"></i>
              Line Reroute: <strong id="reroute-btn-text">${this.calcInputs.isAutoRerouteEnabled ? 'AUTO REROUTE ON' : 'MANUAL'}</strong>
            </button>

            <!-- Simulate Movement Button -->
            <button id="toggle-sim-btn" class="action-btn-sm" style="background:${this.calcInputs.isSimulating ? 'var(--accent-terracotta)' : 'var(--bg-surface)'}; color:${this.calcInputs.isSimulating ? '#FFFFFF' : 'var(--text-main)'}; font-weight:600; border-color:${this.calcInputs.isSimulating ? 'var(--accent-terracotta)' : 'var(--border-color)'};">
              <i data-lucide="${this.calcInputs.isSimulating ? 'pause' : 'play'}" style="width:12px; height:12px; vertical-align:middle;"></i>
              <span id="sim-btn-text">${this.calcInputs.isSimulating ? 'Pause Live Movement' : 'Simulate Trains Live'}</span>
            </button>

            <div style="font-size:0.78rem; background:var(--bg-secondary); padding:4px 12px; border-radius:12px; border:1px solid var(--border-color); font-weight:600;">
              <i data-lucide="radio" style="width:12px; height:12px; color:var(--status-service);"></i> Automatic Train Protection (ATP) Live
            </div>
          </div>
        </div>

        <!-- Dual Railway Line Map Container -->
        <div class="dual-stations-container">
          <!-- Line 1 Title Tag -->
          <div class="line-title-tag tag-line1">Line 1: North Line (Station A ➔ Station B Junction) - 15 km</div>

          <!-- Line 1 Track Line -->
          <div class="line1-track">
            <div class="line1-progress" style="width: 100%;"></div>
          </div>

          <!-- Line 1 Station Node A (0.0 km) -->
          <div class="station-node node-line1" style="left: 0%; transform: translateX(0%);">
            <div class="station-marker"></div>
            <div class="station-label">Station A</div>
            <div class="station-distance">0.0 km</div>
          </div>

          <!-- Line 1 Station Node B Junction (15.0 km) -->
          <div class="station-node node-line1" style="left: 100%; transform: translateX(-100%);">
            <div class="station-marker" style="border-color:var(--accent-terracotta);"></div>
            <div class="station-label" style="text-align:right;">Station B (Junction)</div>
            <div class="station-distance" style="text-align:right;">15.0 km</div>
          </div>

          <!-- Interactive Interchange Junction Switch Connection -->
          <div id="junction-switch-line" class="interchange-junction-switch ${this.calcInputs.isAutoRerouteEnabled ? 'connected' : 'disconnected'}"></div>
          <div id="junction-switch-badge" class="interchange-badge-tag ${this.calcInputs.isAutoRerouteEnabled ? '' : 'disconnected'}">
            <i data-lucide="repeat" style="width:10px; height:10px; inline-size:10px;"></i>
            <span id="junction-badge-text">Interchange: ${this.calcInputs.isAutoRerouteEnabled ? 'REROUTE CONNECTED' : 'MANUAL'}</span>
          </div>

          <!-- Line 2 Title Tag -->
          <div class="line-title-tag tag-line2">Line 2: South Line (Station C Junction ➔ Station D) - 15 km</div>

          <!-- Line 2 Track Line -->
          <div class="line2-track">
            <div class="line2-progress" style="width: 100%;"></div>
          </div>

          <!-- Line 2 Station Node C Junction (0.0 km) -->
          <div class="station-node node-line2" style="left: 0%; transform: translateX(0%);">
            <div class="station-marker" style="border-color:var(--dark-primary);"></div>
            <div class="station-label">Station C (Junction)</div>
            <div class="station-distance">0.0 km</div>
          </div>

          <!-- Line 2 Station Node D (15.0 km) -->
          <div class="station-node node-line2" style="left: 100%; transform: translateX(-100%);">
            <div class="station-marker" style="border-color:var(--status-service);"></div>
            <div class="station-label" style="text-align:right;">Station D</div>
            <div class="station-distance" style="text-align:right;">15.0 km</div>
          </div>

          <!-- Decluttered Single Sleek Train Pin Markers on Map -->
          ${this.renderTrainPin('t1', 'Terracotta')}
          ${this.renderTrainPin('t2', 'Mustard')}
          ${this.renderTrainPin('t3', 'Plum')}
          ${this.renderTrainPin('t4', 'Teal')}
        </div>

        <!-- Live Network Occupancy Status Bar -->
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.75rem; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--border-color); font-size:0.8rem;">
          <div>
            <span style="color:var(--text-muted);">Line 1 Status (A ➔ B):</span>
            <strong id="line1-status-text" style="color:${calcResult.line1Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
              ${calcResult.line1Trains.length > 0 ? `Occupied (${calcResult.line1Trains.join(', ')})` : 'Clear / Unoccupied'}
            </strong>
          </div>

          <div>
            <span style="color:var(--text-muted);">Line 2 Status (C ➔ D):</span>
            <strong id="line2-status-text" style="color:${calcResult.line2Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
              ${calcResult.line2Trains.length > 0 ? `Occupied (${calcResult.line2Trains.join(', ')})` : 'Clear / Unoccupied'}
            </strong>
          </div>

          <div>
            <span style="color:var(--text-muted);">Emergency Reroute Switch:</span>
            <strong id="junction-status-text" style="color:${calcResult.junctionRerouted ? 'var(--accent-terracotta)' : 'var(--status-service)'};">
              ${calcResult.junctionRerouted ? 'Reroute Active' : 'Switch Standby'}
            </strong>
          </div>
        </div>
      </div>

      <!-- Restructured 2-Column Dashboard: Left = Customization Controls | Right = Safety Contents -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <i data-lucide="sliders" style="color:var(--accent-terracotta);"></i> Central Control & Multi-Line Safety Directives
            </div>
            <div class="card-subtitle">Left: Customize 4 trains & line controls | Right: Real-time Line 1 & Line 2 Safety Directives</div>
          </div>
        </div>

        <div class="calc-grid">
          <!-- LEFT COLUMN: Train Customization Controls & ON/OFF Sliders -->
          <div>
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.4rem;">
              <i data-lucide="settings" style="width:14px; height:14px; color:var(--accent-terracotta);"></i> Train Customization & Fleet Toggles
            </div>

            ${this.renderTrainControlCard('t1', 'Train 1 (North Line Lead)', 'var(--accent-terracotta)')}
            ${this.renderTrainControlCard('t2', 'Train 2 (North Line Follower)', 'var(--status-standby)')}
            ${this.renderTrainControlCard('t3', 'Train 3 (South Line Lead)', 'var(--dark-primary)')}
            ${this.renderTrainControlCard('t4', 'Train 4 (South Line Follower)', 'var(--status-service)')}
          </div>

          <!-- RIGHT COLUMN: Dual Safety Content Boxes (Line 1, Line 2, & Emergency Reroute) -->
          <div>
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.4rem;">
              <i data-lucide="shield-alert" style="color:var(--status-service); width:14px; height:14px;"></i> Active Line Safety Directives (Line 1 & Line 2)
            </div>

            <!-- Line 1 Dedicated Safety Content Box -->
            <div id="line1-advisory-box" class="advisory-box ${calcResult.line1Conflict ? 'conflict' : 'verified'}" style="margin-bottom:1rem;">
              <div id="line1-advisory-title" class="advisory-title" style="color:${calcResult.line1Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
                <i data-lucide="${calcResult.line1Conflict ? 'alert-triangle' : 'shield-check'}"></i>
                LINE 1 (NORTH LINE) SAFETY DIRECTIVE
              </div>
              <div id="line1-advisory-body" class="advisory-text">
                ${calcResult.line1Advisory}
              </div>

              <div style="margin-top:0.75rem; padding-top:0.5rem; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; font-size:0.78rem;">
                <span>Active Trains: <strong id="line1-active-names">${calcResult.line1Trains.length > 0 ? calcResult.line1Trains.join(', ') : 'None'}</strong></span>
                <span>Min Separation: <strong id="line1-sep-val">${calcResult.line1Sep < 50 ? calcResult.line1Sep.toFixed(1) + ' km' : 'Clear'}</strong></span>
              </div>
            </div>

            <!-- Line 2 Dedicated Safety Content Box -->
            <div id="line2-advisory-box" class="advisory-box ${calcResult.line2Conflict ? 'conflict' : 'verified'}" style="margin-bottom:1rem;">
              <div id="line2-advisory-title" class="advisory-title" style="color:${calcResult.line2Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
                <i data-lucide="${calcResult.line2Conflict ? 'alert-triangle' : 'shield-check'}"></i>
                LINE 2 (SOUTH LINE) SAFETY DIRECTIVE
              </div>
              <div id="line2-advisory-body" class="advisory-text">
                ${calcResult.line2Advisory}
              </div>

              <div style="margin-top:0.75rem; padding-top:0.5rem; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; font-size:0.78rem;">
                <span>Active Trains: <strong id="line2-active-names">${calcResult.line2Trains.length > 0 ? calcResult.line2Trains.join(', ') : 'None'}</strong></span>
                <span>Min Separation: <strong id="line2-sep-val">${calcResult.line2Sep < 50 ? calcResult.line2Sep.toFixed(1) + ' km' : 'Clear'}</strong></span>
              </div>
            </div>

            <!-- Emergency Reroute Interchange Switch Safety Box -->
            <div id="junction-advisory-box" class="advisory-box ${calcResult.junctionRerouted ? 'conflict' : 'verified'}">
              <div id="junction-advisory-title" class="advisory-title" style="color:${calcResult.junctionRerouted ? 'var(--accent-terracotta)' : 'var(--status-service)'};">
                <i data-lucide="git-branch"></i>
                INTERCHANGE EMERGENCY REROUTE DIRECTIVE
              </div>
              <div id="junction-advisory-body" class="advisory-text">
                ${calcResult.junctionAdvisory}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTrainPin(key, themeColor) {
    const t = this.calcInputs[key];
    const percent = Math.min(100, Math.max(0, (t.km / 15.0) * 100));
    const isLine1 = t.line === 'line1';
    const topClass = isLine1 ? 'pin-on-line1' : 'pin-on-line2';

    let bgStyle = 'background:var(--accent-terracotta);';
    if (themeColor === 'Mustard') bgStyle = 'background:var(--status-standby); color:var(--dark-primary);';
    if (themeColor === 'Plum') bgStyle = 'background:var(--dark-primary); color:var(--bg-surface);';
    if (themeColor === 'Teal') bgStyle = 'background:var(--status-service); color:var(--bg-surface);';

    return `
      <div id="${key}-map-pin" class="train-map-pin ${topClass}" style="left: ${percent}%; display: ${t.enabled ? 'flex' : 'none'};">
        <div id="${key}-pin-pill" class="pin-badge-pill" style="${bgStyle}">
          <i data-lucide="train" style="width:12px; height:12px;"></i>
          <span id="${key}-pin-label">📍 ${t.id}: ${t.km.toFixed(1)} km</span>
        </div>
        <div class="pin-rail-pointer"></div>
      </div>
    `;
  }

  renderTrainControlCard(key, title, labelColor) {
    const t = this.calcInputs[key];
    const fleet = this.app.fleet;

    return `
      <div style="background:var(--bg-secondary); padding:0.85rem; border-radius:var(--radius-md); border:1px solid var(--border-color); margin-bottom:1rem; opacity:${t.enabled ? '1' : '0.65'};">
        <div style="font-weight:700; font-size:0.85rem; color:${labelColor}; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
          <span><i data-lucide="train" style="width:13px; height:13px; inline-size:13px;"></i> ${title} ${!t.enabled ? '(REMOVED)' : ''}</span>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span id="${key}-dist-val" style="font-size:0.78rem; color:var(--text-main); font-weight:700;">${t.km.toFixed(1)} km</span>
            
            <!-- ON / OFF Slider Switch Button -->
            <label class="switch-toggle" title="Toggle Train Active / Removed from Track">
              <input type="checkbox" id="${key}-enable-toggle" ${t.enabled ? 'checked' : ''}>
              <span class="slider-toggle"></span>
            </label>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.5rem; margin-bottom:0.5rem;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Train ID</label>
            <select id="${key}-select" class="form-select" ${!t.enabled ? 'disabled' : ''}>
              ${fleet.map(item => `<option value="${item.id}" ${item.id === t.id ? 'selected' : ''}>${item.id}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Line</label>
            <select id="${key}-line" class="form-select" ${!t.enabled ? 'disabled' : ''}>
              <option value="line1" ${t.line === 'line1' ? 'selected' : ''}>Line 1 (North)</option>
              <option value="line2" ${t.line === 'line2' ? 'selected' : ''}>Line 2 (South)</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Speed (km/h)</label>
            <input type="number" id="${key}-speed" class="form-input" value="${t.speed}" min="20" max="110" ${!t.enabled ? 'disabled' : ''}>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">Position Slider (0.0 ➔ 15.0 km)</label>
          <input type="range" id="${key}-slider" min="0" max="15" step="0.1" value="${t.km}" style="width:100%;" ${!t.enabled ? 'disabled' : ''}>
        </div>

        <div style="display:flex; gap:0.35rem; margin-top:0.4rem;">
          <button class="action-btn-sm quick-jump-${key}" data-km="0.0" ${!t.enabled ? 'disabled' : ''}>Stn A/C (0km)</button>
          <button class="action-btn-sm quick-jump-${key}" data-km="7.5" ${!t.enabled ? 'disabled' : ''}>Mid Line (7.5km)</button>
          <button class="action-btn-sm quick-jump-${key}" data-km="15.0" ${!t.enabled ? 'disabled' : ''}>Stn B/D (15km)</button>
        </div>
      </div>
    `;
  }

  computeHeadwayAdvisory() {
    const { t1, t2, t3, t4, isAutoRerouteEnabled } = this.calcInputs;

    const line1Trains = [];
    const line2Trains = [];

    [t1, t2, t3, t4].forEach(t => {
      if (!t.enabled) return;
      if (t.line === 'line1') line1Trains.push(t);
      else line2Trains.push(t);
    });

    // Compute Line 1 safety separation
    let line1Sep = 99.0;
    let line1Conflict = false;
    if (line1Trains.length >= 2) {
      line1Sep = Math.abs(line1Trains[0].km - line1Trains[1].km);
      if (line1Sep < 3.5) line1Conflict = true;
    }

    // Compute Line 2 safety separation
    let line2Sep = 99.0;
    let line2Conflict = false;
    if (line2Trains.length >= 2) {
      line2Sep = Math.abs(line2Trains[0].km - line2Trains[1].km);
      if (line2Sep < 3.5) line2Conflict = true;
    }

    // Automated Emergency Line Rerouting Logic
    let junctionRerouted = false;
    let junctionAdvisory = '';

    if (isAutoRerouteEnabled && line1Conflict && line1Trains.length >= 2) {
      // Auto-reroute rear train on Line 1 onto Line 2 to prevent collision!
      const follower = line1Trains[1];
      follower.line = 'line2';
      follower.km = 1.0;
      junctionRerouted = true;
      junctionAdvisory = `AUTOMATED EMERGENCY REROUTE EXECUTED: Potential collision detected on Line 1 (${line1Sep.toFixed(1)} km separation < 3.5 km). ATP protection automatically rerouted Train ${follower.id} onto Line 2 via Interchange Switch at Station B (15.0 km) to prevent conflict!`;

      // Re-evaluate line trains after reroute
      line1Conflict = false;
      line1Sep = 99.0;
    } else if (isAutoRerouteEnabled && line2Conflict && line2Trains.length >= 2) {
      // Auto-reroute rear train on Line 2 onto Line 1!
      const follower = line2Trains[1];
      follower.line = 'line1';
      follower.km = 1.0;
      junctionRerouted = true;
      junctionAdvisory = `AUTOMATED EMERGENCY REROUTE EXECUTED: Potential collision detected on Line 2 (${line2Sep.toFixed(1)} km separation < 3.5 km). ATP protection automatically rerouted Train ${follower.id} onto Line 1 via Station C Interchange Switch!`;

      line2Conflict = false;
      line2Sep = 99.0;
    } else {
      junctionAdvisory = isAutoRerouteEnabled
        ? `INTERCHANGE SWITCH REROUTE ACTIVE: Automated ATP crossover switch ready. If collision risk occurs on Line 1 or Line 2, trailing train will automatically divert onto alternate line.`
        : `INTERCHANGE SWITCH MANUAL MODE: Automated emergency rerouting is in manual mode. Direct line switching controlled via manual controls.`;
    }

    const isConflict = line1Conflict || line2Conflict;

    // Line 1 Advisory Text
    let line1Advisory = '';
    if (line1Conflict) {
      line1Advisory = `CRITICAL BLOCK CONFLICT: Trains on Line 1 (North Line) have insufficient physical separation of ${line1Sep.toFixed(1)} km (< 3.5 km safe threshold). Rear train MUST HOLD at current station immediately.`;
    } else if (line1Trains.length > 0) {
      line1Advisory = `MOVEMENT AUTHORIZED: Line 1 operating clear with ${line1Trains.length} active train(s). Safe minimum separation: ${line1Sep < 50 ? line1Sep.toFixed(1) + ' km' : 'Clear'}.`;
    } else {
      line1Advisory = `LINE 1 CLEAR: No active trains on Line 1 (North Line).`;
    }

    // Line 2 Advisory Text
    let line2Advisory = '';
    if (line2Conflict) {
      line2Advisory = `CRITICAL BLOCK CONFLICT: Trains on Line 2 (South Line) have insufficient physical separation of ${line2Sep.toFixed(1)} km (< 3.5 km safe threshold). ATP system triggered mandatory brake override.`;
    } else if (line2Trains.length > 0) {
      line2Advisory = `MOVEMENT AUTHORIZED: Line 2 operating clear with ${line2Trains.length} active train(s). Safe minimum separation: ${line2Sep < 50 ? line2Sep.toFixed(1) + ' km' : 'Clear'}.`;
    } else {
      line2Advisory = `LINE 2 CLEAR: No active trains on Line 2 (South Line).`;
    }

    const directiveState = isConflict ? 'conflict' : 'verified';

    return {
      isConflict,
      directiveState,
      line1Trains: line1Trains.map(t => t.id),
      line2Trains: line2Trains.map(t => t.id),
      line1Sep,
      line2Sep,
      line1Conflict,
      line2Conflict,
      junctionRerouted,
      line1Advisory,
      line2Advisory,
      junctionAdvisory
    };
  }

  attachEvents(container) {
    const keys = ['t1', 't2', 't3', 't4'];

    keys.forEach(key => {
      const toggle = container.querySelector(`#${key}-enable-toggle`);
      const select = container.querySelector(`#${key}-select`);
      const lineSelect = container.querySelector(`#${key}-line`);
      const speedInput = container.querySelector(`#${key}-speed`);
      const slider = container.querySelector(`#${key}-slider`);
      const quickJumps = container.querySelectorAll(`.quick-jump-${key}`);

      if (toggle) {
        toggle.addEventListener('change', (e) => {
          this.calcInputs[key].enabled = e.target.checked;
          this.app.render();
        });
      }

      if (select) {
        select.addEventListener('change', (e) => {
          this.calcInputs[key].id = e.target.value;
          this.updateLiveDOM();
        });
      }

      if (lineSelect) {
        lineSelect.addEventListener('change', (e) => {
          this.calcInputs[key].line = e.target.value;
          this.updateLiveDOM();
        });
      }

      if (speedInput) {
        speedInput.addEventListener('input', (e) => {
          this.calcInputs[key].speed = parseFloat(e.target.value) || 60;
          this.updateLiveDOM();
        });
      }

      if (slider) {
        slider.addEventListener('input', (e) => {
          this.calcInputs[key].km = parseFloat(e.target.value);
          this.updateLiveDOM();
        });
      }

      quickJumps.forEach(btn => {
        btn.addEventListener('click', () => {
          this.calcInputs[key].km = parseFloat(btn.getAttribute('data-km'));
          this.updateLiveDOM();
        });
      });
    });

    // Toggle Emergency Reroute Switch button
    const rerouteBtn = container.querySelector('#toggle-reroute-btn');
    const junctionBadge = container.querySelector('#junction-switch-badge');

    const handleRerouteToggle = () => {
      this.calcInputs.isAutoRerouteEnabled = !this.calcInputs.isAutoRerouteEnabled;
      this.app.render();
    };

    if (rerouteBtn) rerouteBtn.addEventListener('click', handleRerouteToggle);
    if (junctionBadge) junctionBadge.addEventListener('click', handleRerouteToggle);

    // Toggle live simulation movement playback
    const simBtn = container.querySelector('#toggle-sim-btn');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        this.calcInputs.isSimulating = !this.calcInputs.isSimulating;
        if (this.calcInputs.isSimulating) {
          this.startSimulation();
        } else {
          this.stopSimulation();
        }
        this.updateLiveDOM();
      });
    }
  }

  updateLiveDOM() {
    const calcResult = this.computeHeadwayAdvisory();
    this.hasConflict = calcResult.isConflict;
    this.advisoryResult = calcResult;

    // 1. Update Header Safety Shield
    this.app.updateSafetyShieldStatus(calcResult.directiveState);

    // 2. Update Map Pin Markers for 4 Trains
    const keys = ['t1', 't2', 't3', 't4'];
    keys.forEach(key => {
      const t = this.calcInputs[key];
      const percent = Math.min(100, Math.max(0, (t.km / 15.0) * 100));

      const pinNode = document.querySelector(`#${key}-map-pin`);
      const pinLabel = document.querySelector(`#${key}-pin-label`);
      const slider = document.querySelector(`#${key}-slider`);
      const distVal = document.querySelector(`#${key}-dist-val`);
      const lineSelect = document.querySelector(`#${key}-line`);

      if (pinNode) {
        pinNode.style.left = `${percent}%`;
        pinNode.className = `train-map-pin ${t.line === 'line1' ? 'pin-on-line1' : 'pin-on-line2'}`;
        pinNode.style.display = t.enabled ? 'flex' : 'none';
      }

      if (pinLabel) pinLabel.innerText = `📍 ${t.id}: ${t.km.toFixed(1)} km`;
      if (slider) slider.value = t.km;
      if (distVal) distVal.innerText = `${t.km.toFixed(1)} km`;
      if (lineSelect) lineSelect.value = t.line;
    });

    // 3. Update Line Status Chips
    const line1Status = document.querySelector('#line1-status-text');
    if (line1Status) {
      line1Status.style.color = calcResult.line1Conflict ? 'var(--status-critical)' : 'var(--status-service)';
      line1Status.innerText = calcResult.line1Trains.length > 0 ? `Occupied (${calcResult.line1Trains.join(', ')})` : 'Clear / Unoccupied';
    }

    const line2Status = document.querySelector('#line2-status-text');
    if (line2Status) {
      line2Status.style.color = calcResult.line2Conflict ? 'var(--status-critical)' : 'var(--status-service)';
      line2Status.innerText = calcResult.line2Trains.length > 0 ? `Occupied (${calcResult.line2Trains.join(', ')})` : 'Clear / Unoccupied';
    }

    const juncStatus = document.querySelector('#junction-status-text');
    if (juncStatus) {
      juncStatus.style.color = calcResult.junctionRerouted ? 'var(--accent-terracotta)' : 'var(--status-service)';
      juncStatus.innerText = calcResult.junctionRerouted ? 'Reroute Active' : 'Switch Standby';
    }

    // 4. Update Line 1 Dedicated Safety Box
    const l1Box = document.querySelector('#line1-advisory-box');
    const l1Title = document.querySelector('#line1-advisory-title');
    const l1Body = document.querySelector('#line1-advisory-body');
    const l1Active = document.querySelector('#line1-active-names');
    const l1Sep = document.querySelector('#line1-sep-val');

    if (l1Box) l1Box.className = `advisory-box ${calcResult.line1Conflict ? 'conflict' : 'verified'}`;
    if (l1Title) l1Title.style.color = calcResult.line1Conflict ? 'var(--status-critical)' : 'var(--status-service)';
    if (l1Body) l1Body.innerText = calcResult.line1Advisory;
    if (l1Active) l1Active.innerText = calcResult.line1Trains.length > 0 ? calcResult.line1Trains.join(', ') : 'None';
    if (l1Sep) l1Sep.innerText = calcResult.line1Sep < 50 ? `${calcResult.line1Sep.toFixed(1)} km` : 'Clear';

    // 5. Update Line 2 Dedicated Safety Box
    const l2Box = document.querySelector('#line2-advisory-box');
    const l2Title = document.querySelector('#line2-advisory-title');
    const l2Body = document.querySelector('#line2-advisory-body');
    const l2Active = document.querySelector('#line2-active-names');
    const l2Sep = document.querySelector('#line2-sep-val');

    if (l2Box) l2Box.className = `advisory-box ${calcResult.line2Conflict ? 'conflict' : 'verified'}`;
    if (l2Title) l2Title.style.color = calcResult.line2Conflict ? 'var(--status-critical)' : 'var(--status-service)';
    if (l2Body) l2Body.innerText = calcResult.line2Advisory;
    if (l2Active) l2Active.innerText = calcResult.line2Trains.length > 0 ? calcResult.line2Trains.join(', ') : 'None';
    if (l2Sep) l2Sep.innerText = calcResult.line2Sep < 50 ? `${calcResult.line2Sep.toFixed(1)} km` : 'Clear';

    // 6. Update Emergency Reroute Interchange Switch Safety Box
    const juncBox = document.querySelector('#junction-advisory-box');
    const juncTitle = document.querySelector('#junction-advisory-title');
    const juncBody = document.querySelector('#junction-advisory-body');

    if (juncBox) juncBox.className = `advisory-box ${calcResult.junctionRerouted ? 'conflict' : 'verified'}`;
    if (juncTitle) juncTitle.style.color = calcResult.junctionRerouted ? 'var(--accent-terracotta)' : 'var(--status-service)';
    if (juncBody) juncBody.innerText = calcResult.junctionAdvisory;

    // 7. Update Sim Button Text
    const simBtnText = document.querySelector('#sim-btn-text');
    const simBtn = document.querySelector('#toggle-sim-btn');
    if (simBtnText) simBtnText.innerText = this.calcInputs.isSimulating ? 'Pause Live Movement' : 'Simulate Trains Live';
    if (simBtn) {
      simBtn.style.background = this.calcInputs.isSimulating ? 'var(--accent-terracotta)' : 'var(--bg-surface)';
      simBtn.style.color = this.calcInputs.isSimulating ? '#FFFFFF' : 'var(--text-main)';
      simBtn.style.borderColor = this.calcInputs.isSimulating ? 'var(--accent-terracotta)' : 'var(--border-color)';
    }
  }

  startSimulation() {
    this.stopSimulation();
    this.lastFrameTime = performance.now();

    const animate = (now) => {
      if (!this.calcInputs.isSimulating) return;

      const deltaSec = Math.min((now - this.lastFrameTime) / 1000.0, 0.1);
      this.lastFrameTime = now;

      const keys = ['t1', 't2', 't3', 't4'];
      keys.forEach(key => {
        const t = this.calcInputs[key];
        if (!t.enabled) return;

        t.km += (t.speed / 3600) * deltaSec * 80.0;

        if (t.km >= 15.0) {
          t.km = 0.0;
        }
      });

      this.updateLiveDOM();

      this.simAnimFrame = requestAnimationFrame(animate);
    };

    this.simAnimFrame = requestAnimationFrame(animate);
  }

  stopSimulation() {
    if (this.simAnimFrame) {
      cancelAnimationFrame(this.simAnimFrame);
      this.simAnimFrame = null;
    }
  }
}
