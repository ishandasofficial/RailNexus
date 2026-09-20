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
      t5: { id: 'T21', line: 'line3', km: 5.1, speed: 62, enabled: true },
      t6: { id: 'T27', line: 'line4', km: 9.6, speed: 58, enabled: true },
      isSimulating: false
    };

    this.simAnimFrame = null;
    this.lastFrameTime = 0;
    this.hasConflict = false;
    this.advisoryResult = null;
    this.inspection = {
      line: 'line1',
      checkpointKm: 0,
      lastSignal: 'verified',
      blocked: false,
      blockedLine: null,
      defectAtNextCheckpoint: false,
      inspectedCheckpoints: []
    };
  }

  getLineName(line) {
    return {
      line1: 'Line 1 (North)',
      line2: 'Line 2 (South)',
      line3: 'Line 3 (Inspection Standby)',
      line4: 'Line 4 (Goods Carrier Standby)'
    }[line] || line;
  }

  getLineTopClass(line) {
    return `pin-on-${line}`;
  }

  getLineTopOffset(line) {
    return { line1: '22px', line2: '142px', line3: '262px', line4: '382px' }[line] || '22px';
  }

  moveTrainToLine(key, line) {
    const standbyOwner = { line3: 't5', line4: 't6' }[line];
    if (standbyOwner && standbyOwner !== key) {
      this.app.render();
      this.app.showNotification(`${this.getLineName(line)} is reserved for ${line === 'line3' ? 'the inspection train' : 'the goods carrier train'}.`, 'warning');
      return;
    }

    this.calcInputs[key].line = line;
    this.calcInputs[key].km = 0.0;
    this.updateLiveDOM();
  }

  render() {
    const fleet = this.app.fleet;

    // Compute dynamic headway and safety directives across active trains on both lines
    const calcResult = this.computeHeadwayAdvisory();
    this.hasConflict = calcResult.isConflict;
    this.advisoryResult = calcResult;

    // Update global safety shield badge state on top app header
    this.app.updateSafetyShieldStatus(this.getDirectiveState(calcResult));

    return `
      <!-- Dual Interconnected Section Control Map Visualizer -->
      <div class="track-map-container">
        <div class="track-map-header">
          <div class="track-title">
            <i data-lucide="git-merge" style="color:var(--accent-terracotta);"></i> Four-Line Interconnected Network Map (6 Active Trains)
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

        <!-- Four Railway Line Map Container -->
        <div class="dual-stations-container four-line-map">
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

          <div class="line-title-tag tag-line3">Line 3: Inspection Standby Track (15 km)</div>
          <div class="line3-track"><div class="line3-progress" style="width: 100%;"></div></div>

          <div class="line-title-tag tag-line4">Line 4: Goods Carrier Standby Track (15 km)</div>
          <div class="line4-track"><div class="line4-progress" style="width: 100%;"></div></div>

          <!-- Decluttered Single Sleek Train Pin Markers on Map -->
          ${this.renderTrainPin('t1', 'Terracotta')}
          ${this.renderTrainPin('t2', 'Mustard')}
          ${this.renderTrainPin('t3', 'Plum')}
          ${this.renderTrainPin('t4', 'Teal')}
          ${this.renderTrainPin('t5', 'Mustard')}
          ${this.renderTrainPin('t6', 'Plum')}
        </div>

        <!-- Live Network Occupancy Status Bar -->
        <div class="line-status-grid" style="display:grid; gap:0.75rem; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--border-color); font-size:0.8rem;">
          <div>
            <span style="color:var(--text-muted);">Line 1 Status (A ➔ B):</span>
            <strong id="line1-status-text" style="color:${calcResult.line1Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
              ${calcResult.line1Conflict ? `BLOCKED (${calcResult.line1Trains.join(', ') || 'No active trains'})` : calcResult.line1Trains.length > 0 ? `Occupied (${calcResult.line1Trains.join(', ')})` : 'Clear / Unoccupied'}
            </strong>
          </div>

          <div>
            <span style="color:var(--text-muted);">Line 3 Status (Inspection Standby):</span>
            <strong id="line3-status-text" style="color:${calcResult.line3Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
              ${calcResult.line3Conflict ? `BLOCKED (${calcResult.line3Trains.join(', ') || 'No active trains'})` : calcResult.line3Trains.length > 0 ? `Occupied (${calcResult.line3Trains.join(', ')})` : 'Clear / Unoccupied'}
            </strong>
          </div>

          <div>
            <span style="color:var(--text-muted);">Line 4 Status (Goods Carrier Standby):</span>
            <strong id="line4-status-text" style="color:${calcResult.line4Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
              ${calcResult.line4Conflict ? `BLOCKED (${calcResult.line4Trains.join(', ') || 'No active trains'})` : calcResult.line4Trains.length > 0 ? `Occupied (${calcResult.line4Trains.join(', ')})` : 'Clear / Unoccupied'}
            </strong>
          </div>

          <div>
            <span style="color:var(--text-muted);">Line 2 Status (C ➔ D):</span>
            <strong id="line2-status-text" style="color:${calcResult.line2Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
              ${calcResult.line2Conflict ? `BLOCKED (${calcResult.line2Trains.join(', ') || 'No active trains'})` : calcResult.line2Trains.length > 0 ? `Occupied (${calcResult.line2Trains.join(', ')})` : 'Clear / Unoccupied'}
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

      ${this.renderInspectionCart()}

      <!-- Restructured 2-Column Dashboard: Left = Customization Controls | Right = Safety Contents -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <i data-lucide="sliders" style="color:var(--accent-terracotta);"></i> Central Control & Multi-Line Safety Directives
            </div>
            <div class="card-subtitle">Left: Customize 6 trains & line controls | Right: Real-time safety directives for all four lines</div>
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
            ${this.renderTrainControlCard('t5', 'Train 5 (Inspection Train)', 'var(--status-standby)')}
            ${this.renderTrainControlCard('t6', 'Train 6 (Goods Carrier)', 'var(--dark-primary)')}
          </div>

          <!-- RIGHT COLUMN: Dual Safety Content Boxes (Line 1, Line 2, & Emergency Reroute) -->
          <div>
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.4rem;">
              <i data-lucide="shield-alert" style="color:var(--status-service); width:14px; height:14px;"></i> Active Line Safety Directives (Lines 1-4)
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

            <div id="line3-advisory-box" class="advisory-box ${calcResult.line3Conflict ? 'conflict' : 'verified'}" style="margin-bottom:1rem;">
              <div id="line3-advisory-title" class="advisory-title" style="color:${calcResult.line3Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
                <i data-lucide="${calcResult.line3Conflict ? 'alert-triangle' : 'shield-check'}"></i>
                LINE 3 (INSPECTION STANDBY) SAFETY DIRECTIVE
              </div>
              <div id="line3-advisory-body" class="advisory-text">${calcResult.line3Advisory}</div>
              <div style="margin-top:0.75rem; padding-top:0.5rem; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; font-size:0.78rem;">
                <span>Active Trains: <strong id="line3-active-names">${calcResult.line3Trains.length > 0 ? calcResult.line3Trains.join(', ') : 'None'}</strong></span>
                <span>Min Separation: <strong id="line3-sep-val">${calcResult.line3Sep < 50 ? calcResult.line3Sep.toFixed(1) + ' km' : 'Clear'}</strong></span>
              </div>
            </div>

            <div id="line4-advisory-box" class="advisory-box ${calcResult.line4Conflict ? 'conflict' : 'verified'}" style="margin-bottom:1rem;">
              <div id="line4-advisory-title" class="advisory-title" style="color:${calcResult.line4Conflict ? 'var(--status-critical)' : 'var(--status-service)'};">
                <i data-lucide="${calcResult.line4Conflict ? 'alert-triangle' : 'shield-check'}"></i>
                LINE 4 (GOODS CARRIER STANDBY) SAFETY DIRECTIVE
              </div>
              <div id="line4-advisory-body" class="advisory-text">${calcResult.line4Advisory}</div>
              <div style="margin-top:0.75rem; padding-top:0.5rem; border-top:1px dashed var(--border-color); display:flex; justify-content:space-between; font-size:0.78rem;">
                <span>Active Trains: <strong id="line4-active-names">${calcResult.line4Trains.length > 0 ? calcResult.line4Trains.join(', ') : 'None'}</strong></span>
                <span>Min Separation: <strong id="line4-sep-val">${calcResult.line4Sep < 50 ? calcResult.line4Sep.toFixed(1) + ' km' : 'Clear'}</strong></span>
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
    const topClass = this.getLineTopClass(t.line);
    const isDanger = this.inspection.blocked && this.inspection.blockedLine === t.line;

    let bgStyle = 'background:var(--accent-terracotta);';
    if (themeColor === 'Mustard') bgStyle = 'background:var(--status-standby); color:var(--dark-primary);';
    if (themeColor === 'Plum') bgStyle = 'background:var(--dark-primary); color:var(--bg-surface);';
    if (themeColor === 'Teal') bgStyle = 'background:var(--status-service); color:var(--bg-surface);';

    return `
      <div id="${key}-map-pin" class="train-map-pin ${topClass}" style="left: ${percent}%; display: ${t.enabled ? 'flex' : 'none'};">
        <div id="${key}-pin-pill" class="pin-badge-pill${isDanger ? ' conflict' : ''}" style="${isDanger ? '' : bgStyle}">
          <i data-lucide="train" style="width:12px; height:12px;"></i>
          <span id="${key}-pin-label">${isDanger ? '⚠ DANGER ' : '📍 '}${t.id}: ${t.km.toFixed(1)} km</span>
        </div>
        <div class="pin-rail-pointer"></div>
      </div>
    `;
  }

  renderInspectionCart() {
    const inspection = this.inspection;
    const isBlocked = inspection.blocked;
    const signalColor = isBlocked ? 'var(--status-critical)' : 'var(--status-service)';
    const signalText = isBlocked ? 'BLOCK TRACK' : 'TRACK OK';
    const lineName = this.getLineName(inspection.line);
    const defectCoordinate = isBlocked ? `${lineName} / chainage ${inspection.checkpointKm.toFixed(1)} km` : 'No defect recorded';
    const checkpoints = inspection.inspectedCheckpoints.length > 0
      ? inspection.inspectedCheckpoints.map(km => `${km.toFixed(1)} km`).join(', ')
      : 'None yet';

    return `
      <div class="card inspection-cart-card">
        <div class="card-header">
          <div>
            <div class="card-title"><i data-lucide="rail-symbol" style="color:var(--accent-terracotta);"></i> Inspection Cart System</div>
            <div class="card-subtitle">Track condition signal issued at every 2 km checkpoint before movement authority is granted.</div>
          </div>
          <div id="inspection-signal" class="inspection-signal" style="color:${signalColor}; border-color:${signalColor}; background:${isBlocked ? 'var(--status-critical-bg)' : 'var(--status-service-bg)'};">
            <span class="pulse-dot" style="background:${signalColor};"></span><strong>${signalText}</strong>
          </div>
        </div>

        <div class="inspection-cart-grid">
          <div>
            <label class="form-label" for="inspection-line">Inspection line</label>
            <select id="inspection-line" class="form-select" ${isBlocked ? 'disabled' : ''}>
              <option value="line1" ${inspection.line === 'line1' ? 'selected' : ''}>Line 1 (North)</option>
              <option value="line2" ${inspection.line === 'line2' ? 'selected' : ''}>Line 2 (South)</option>
              <option value="line3" ${inspection.line === 'line3' ? 'selected' : ''}>Line 3 (Inspection Standby)</option>
              <option value="line4" ${inspection.line === 'line4' ? 'selected' : ''}>Line 4 (Goods Carrier Standby)</option>
            </select>
          </div>
          <div class="inspection-readout"><span class="form-label">Next checkpoint</span><strong id="inspection-next-checkpoint">${inspection.checkpointKm >= 14 ? 'Terminal at 15.0 km' : `${inspection.checkpointKm + 2}.0 km`}</strong></div>
          <div class="inspection-readout"><span class="form-label">Last signal</span><strong id="inspection-last-signal" style="color:${signalColor};">${signalText}</strong></div>
        </div>

        <div class="inspection-track" aria-label="Inspection checkpoint progress">
          <div class="inspection-track-progress" id="inspection-progress" style="width:${Math.min(100, (inspection.checkpointKm / 15) * 100)}%;"></div>
          ${[2, 4, 6, 8, 10, 12, 14].map(km => `<span class="inspection-marker ${inspection.inspectedCheckpoints.includes(km) ? 'checked' : ''}" style="left:${(km / 15) * 100}%;" title="${km} km checkpoint"></span>`).join('')}
        </div>
        <div class="inspection-meta"><span>Line: <strong id="inspection-line-name">${lineName}</strong></span><span>Checked: <strong id="inspection-checked-list">${checkpoints}</strong></span></div>
        <div class="inspection-meta" style="margin-top:0.45rem;"><span>Exact defect coordinate: <strong id="inspection-defect-coordinate" style="color:${isBlocked ? 'var(--status-critical)' : 'var(--text-muted)'};">${defectCoordinate}</strong></span></div>

        <div class="inspection-actions">
          <button id="run-inspection-btn" class="btn-primary" ${isBlocked ? 'disabled' : ''}><i data-lucide="scan-line"></i> Inspect Next 2 km</button>
          <button id="simulate-defect-btn" class="action-btn-sm" style="color:${inspection.defectAtNextCheckpoint ? 'var(--status-critical)' : 'var(--text-main)'}; border-color:${inspection.defectAtNextCheckpoint ? 'var(--status-critical)' : 'var(--border-color)'};" ${isBlocked ? 'disabled' : ''}><i data-lucide="triangle-alert"></i> ${inspection.defectAtNextCheckpoint ? 'Defect Armed' : 'Simulate Defect'}</button>
          <button id="reset-inspection-btn" class="action-btn-sm"><i data-lucide="rotate-ccw"></i> Reset Cart</button>
        </div>
      </div>
    `;
  }

  getDirectiveState(calcResult) {
    return calcResult.isConflict || this.inspection.blocked ? 'conflict' : 'verified';
  }

  renderTrainControlCard(key, title, labelColor) {
    const t = this.calcInputs[key];
    const fleet = this.app.fleet;
    const isDanger = this.inspection.blocked && this.inspection.blockedLine === t.line;

    return `
      <div style="background:var(--bg-secondary); padding:0.85rem; border-radius:var(--radius-md); border:1px solid var(--border-color); margin-bottom:1rem; opacity:${t.enabled ? '1' : '0.65'};">
        <div style="font-weight:700; font-size:0.85rem; color:${labelColor}; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
          <span><i data-lucide="train" style="width:13px; height:13px; inline-size:13px;"></i> ${title} ${!t.enabled ? '(REMOVED)' : ''}</span>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <strong id="${key}-safety-state" style="font-size:0.7rem; color:${isDanger ? 'var(--status-critical)' : 'var(--status-service)'};">${isDanger ? 'DANGER' : 'SAFE'}</strong>
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
              <option value="line3" ${t.line === 'line3' ? 'selected' : ''}>Line 3 (Inspection Standby)</option>
              <option value="line4" ${t.line === 'line4' ? 'selected' : ''}>Line 4 (Goods Carrier Standby)</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Speed (km/h)</label>
            <input type="number" id="${key}-speed" class="form-input" value="${t.speed}" min="20" max="110" ${!t.enabled ? 'disabled' : ''}>
          </div>
        </div>

        <div class="track-routing-actions">
          <span class="form-label">Go to track</span>
          <button class="action-btn-sm go-track-${key}" data-line="line1">1</button>
          <button class="action-btn-sm go-track-${key}" data-line="line2">2</button>
          <button class="action-btn-sm go-track-${key}" data-line="line3">3 (Inspection)</button>
          <button class="action-btn-sm go-track-${key}" data-line="line4">4 (Goods)</button>
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
    return this.computeFourLineAdvisory();
  }

  computeFourLineAdvisory() {
    const lineKeys = ['line1', 'line2', 'line3', 'line4'];
    const trainsByLine = () => {
      const result = { line1: [], line2: [], line3: [], line4: [] };
      Object.keys(this.calcInputs)
        .filter(key => key.startsWith('t'))
        .forEach(key => {
          const train = this.calcInputs[key];
          if (train.enabled && result[train.line]) result[train.line].push(train);
        });
      lineKeys.forEach(line => result[line].sort((a, b) => a.km - b.km));
      return result;
    };

    const getSeparation = trains => {
      if (trains.length < 2) return { separation: 99.0, conflict: false };
      let separation = 99.0;
      for (let index = 1; index < trains.length; index++) {
        separation = Math.min(separation, Math.abs(trains[index].km - trains[index - 1].km));
      }
      return { separation, conflict: separation < 3.5 };
    };

    const blockedLine = this.inspection.blocked ? this.inspection.blockedLine : null;
    let trains = trainsByLine();
    let lineResults = {};
    lineKeys.forEach(line => {
      lineResults[line] = getSeparation(trains[line]);
    });

    let junctionRerouted = false;
    let junctionAdvisory = this.calcInputs.isAutoRerouteEnabled
      ? 'INTERCHANGE SWITCH REROUTE ACTIVE: Automated ATP crossover switch ready for the Line 1 and Line 2 junction.'
      : 'INTERCHANGE SWITCH MANUAL MODE: Direct line switching is controlled via manual controls.';

    if (this.calcInputs.isAutoRerouteEnabled && !blockedLine && lineResults.line1.conflict && trains.line1.length >= 2) {
      const follower = trains.line1[1];
      follower.line = 'line2';
      follower.km = 1.0;
      junctionRerouted = true;
      junctionAdvisory = `AUTOMATED EMERGENCY REROUTE EXECUTED: Train ${follower.id} moved from Line 1 to Line 2 after a ${lineResults.line1.separation.toFixed(1)} km separation conflict.`;
      trains = trainsByLine();
      lineKeys.forEach(line => { lineResults[line] = getSeparation(trains[line]); });
    } else if (this.calcInputs.isAutoRerouteEnabled && !blockedLine && lineResults.line2.conflict && trains.line2.length >= 2) {
      const follower = trains.line2[1];
      follower.line = 'line1';
      follower.km = 1.0;
      junctionRerouted = true;
      junctionAdvisory = `AUTOMATED EMERGENCY REROUTE EXECUTED: Train ${follower.id} moved from Line 2 to Line 1 after a ${lineResults.line2.separation.toFixed(1)} km separation conflict.`;
      trains = trainsByLine();
      lineKeys.forEach(line => { lineResults[line] = getSeparation(trains[line]); });
    }

    const makeAdvisory = line => {
      const lineResult = lineResults[line];
      const lineTrains = trains[line];
      const isBlocked = blockedLine === line;
      const trainNames = lineTrains.map(train => train.id).join(', ') || 'none';
      if (isBlocked) {
        return `TRACK BLOCK ACTIVE: Inspection cart detected a defect at exact coordinate ${this.getLineName(line)} / chainage ${this.inspection.checkpointKm.toFixed(1)} km. All ${this.getLineName(line)} trains (${trainNames}) are automatically held until the track is cleared.`;
      }
      if (lineResult.conflict) {
        return `CRITICAL BLOCK CONFLICT: ${this.getLineName(line)} has insufficient physical separation of ${lineResult.separation.toFixed(1)} km (< 3.5 km safe threshold). Trains must hold until ATP clears the section.`;
      }
      if (lineTrains.length > 0) {
        return `MOVEMENT AUTHORIZED: ${this.getLineName(line)} operating clear with ${lineTrains.length} active train(s). Safe minimum separation: ${lineResult.separation < 50 ? lineResult.separation.toFixed(1) + ' km' : 'Clear'}.`;
      }
      return `${this.getLineName(line).toUpperCase()} CLEAR: No active trains on ${this.getLineName(line)}.`;
    };

    const result = { isConflict: false, directiveState: 'verified', junctionRerouted, junctionAdvisory };
    lineKeys.forEach(line => {
      const lineBlocked = blockedLine === line;
      result[`${line}Trains`] = trains[line].map(train => train.id);
      result[`${line}Sep`] = lineResults[line].separation;
      result[`${line}InspectionBlocked`] = lineBlocked;
      result[`${line}Conflict`] = lineResults[line].conflict || lineBlocked;
      result[`${line}Advisory`] = makeAdvisory(line);
      result.isConflict = result.isConflict || result[`${line}Conflict`];
    });
    result.directiveState = result.isConflict ? 'conflict' : 'verified';
    return result;
  }

  computeLegacyHeadwayAdvisory() {
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

    const line1InspectionBlocked = this.inspection.blocked && this.inspection.blockedLine === 'line1';
    const line2InspectionBlocked = this.inspection.blocked && this.inspection.blockedLine === 'line2';

    // Automated Emergency Line Rerouting Logic
    let junctionRerouted = false;
    let junctionAdvisory = '';

    if (isAutoRerouteEnabled && !line1InspectionBlocked && line1Conflict && line1Trains.length >= 2) {
      // Auto-reroute rear train on Line 1 onto Line 2 to prevent collision!
      const follower = line1Trains[1];
      follower.line = 'line2';
      follower.km = 1.0;
      junctionRerouted = true;
      junctionAdvisory = `AUTOMATED EMERGENCY REROUTE EXECUTED: Potential collision detected on Line 1 (${line1Sep.toFixed(1)} km separation < 3.5 km). ATP protection automatically rerouted Train ${follower.id} onto Line 2 via Interchange Switch at Station B (15.0 km) to prevent conflict!`;

      // Re-evaluate line trains after reroute
      line1Conflict = false;
      line1Sep = 99.0;
    } else if (isAutoRerouteEnabled && !line2InspectionBlocked && line2Conflict && line2Trains.length >= 2) {
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

    const isConflict = line1Conflict || line2Conflict || line1InspectionBlocked || line2InspectionBlocked;

    // Line 1 Advisory Text
    let line1Advisory = '';
    if (line1InspectionBlocked) {
      line1Advisory = `TRACK BLOCK ACTIVE: Inspection cart detected a defect at exact coordinate Line 1 / chainage ${this.inspection.checkpointKm.toFixed(1)} km. All Line 1 trains (${line1Trains.map(t => t.id).join(', ') || 'none'}) are automatically held until the track is cleared.`;
    } else if (line1Conflict) {
      line1Advisory = `CRITICAL BLOCK CONFLICT: Trains on Line 1 (North Line) have insufficient physical separation of ${line1Sep.toFixed(1)} km (< 3.5 km safe threshold). Rear train MUST HOLD at current station immediately.`;
    } else if (line1Trains.length > 0) {
      line1Advisory = `MOVEMENT AUTHORIZED: Line 1 operating clear with ${line1Trains.length} active train(s). Safe minimum separation: ${line1Sep < 50 ? line1Sep.toFixed(1) + ' km' : 'Clear'}.`;
    } else {
      line1Advisory = `LINE 1 CLEAR: No active trains on Line 1 (North Line).`;
    }

    // Line 2 Advisory Text
    let line2Advisory = '';
    if (line2InspectionBlocked) {
      line2Advisory = `TRACK BLOCK ACTIVE: Inspection cart detected a defect at exact coordinate Line 2 / chainage ${this.inspection.checkpointKm.toFixed(1)} km. All Line 2 trains (${line2Trains.map(t => t.id).join(', ') || 'none'}) are automatically held until the track is cleared.`;
    } else if (line2Conflict) {
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
      line1Conflict: line1Conflict || line1InspectionBlocked,
      line2Conflict: line2Conflict || line2InspectionBlocked,
      line1InspectionBlocked,
      line2InspectionBlocked,
      junctionRerouted,
      line1Advisory,
      line2Advisory,
      junctionAdvisory
    };
  }

  attachEvents(container) {
    const keys = ['t1', 't2', 't3', 't4', 't5', 't6'];

    const inspectionLine = container.querySelector('#inspection-line');
    const runInspectionBtn = container.querySelector('#run-inspection-btn');
    const simulateDefectBtn = container.querySelector('#simulate-defect-btn');
    const resetInspectionBtn = container.querySelector('#reset-inspection-btn');

    if (inspectionLine) {
      inspectionLine.addEventListener('change', (e) => {
        this.inspection.line = e.target.value;
        this.resetInspection(true);
      });
    }

    if (runInspectionBtn) {
      runInspectionBtn.addEventListener('click', () => this.runInspection());
    }

    if (simulateDefectBtn) {
      simulateDefectBtn.addEventListener('click', () => {
        this.inspection.defectAtNextCheckpoint = !this.inspection.defectAtNextCheckpoint;
        this.app.render();
      });
    }

    if (resetInspectionBtn) {
      resetInspectionBtn.addEventListener('click', () => this.resetInspection(true));
    }

    keys.forEach(key => {
      const toggle = container.querySelector(`#${key}-enable-toggle`);
      const select = container.querySelector(`#${key}-select`);
      const lineSelect = container.querySelector(`#${key}-line`);
      const speedInput = container.querySelector(`#${key}-speed`);
      const slider = container.querySelector(`#${key}-slider`);
      const quickJumps = container.querySelectorAll(`.quick-jump-${key}`);
      const trackButtons = container.querySelectorAll(`.go-track-${key}`);

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
          this.moveTrainToLine(key, e.target.value);
        });
      }

      trackButtons.forEach(button => {
        button.addEventListener('click', () => {
          this.moveTrainToLine(key, button.getAttribute('data-line'));
        });
      });

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

  runInspection() {
    if (this.inspection.blocked || this.inspection.checkpointKm >= 14) return;

    const nextCheckpoint = this.inspection.checkpointKm + 2;
    this.inspection.checkpointKm = nextCheckpoint;
    this.inspection.inspectedCheckpoints.push(nextCheckpoint);

    if (this.inspection.defectAtNextCheckpoint) {
      this.inspection.lastSignal = 'blocked';
      this.inspection.blocked = true;
      this.inspection.blockedLine = this.inspection.line;
      this.inspection.defectAtNextCheckpoint = false;
      this.app.showNotification(`Inspection fault detected at ${this.getLineName(this.inspection.line)} / chainage ${nextCheckpoint.toFixed(1)} km. Track block signal issued.`, 'warning');
    } else {
      this.inspection.lastSignal = 'verified';
      this.app.showNotification(`Track verified at ${nextCheckpoint.toFixed(1)} km. Movement authority remains active.`, 'success');
    }

    this.updateLiveDOM();
  }

  resetInspection(renderApp = true) {
    this.inspection.checkpointKm = 0;
    this.inspection.lastSignal = 'verified';
    this.inspection.blocked = false;
    this.inspection.blockedLine = null;
    this.inspection.defectAtNextCheckpoint = false;
    this.inspection.inspectedCheckpoints = [];
    if (renderApp) this.app.render();
    else this.app.updateSafetyShieldStatus(this.getDirectiveState(this.advisoryResult || this.computeHeadwayAdvisory()));
  }

  updateLiveDOM() {
    const calcResult = this.computeHeadwayAdvisory();
    this.hasConflict = calcResult.isConflict;
    this.advisoryResult = calcResult;

    // 1. Update Header Safety Shield
    this.app.updateSafetyShieldStatus(this.getDirectiveState(calcResult));

    // 2. Update Map Pin Markers for 4 Trains
    const keys = ['t1', 't2', 't3', 't4', 't5', 't6'];
    keys.forEach(key => {
      const t = this.calcInputs[key];
      const percent = Math.min(100, Math.max(0, (t.km / 15.0) * 100));

      const pinNode = document.querySelector(`#${key}-map-pin`);
      const pinLabel = document.querySelector(`#${key}-pin-label`);
      const slider = document.querySelector(`#${key}-slider`);
      const distVal = document.querySelector(`#${key}-dist-val`);
      const lineSelect = document.querySelector(`#${key}-line`);
      const safetyState = document.querySelector(`#${key}-safety-state`);
      const pinPill = document.querySelector(`#${key}-pin-pill`);
      const isDanger = this.inspection.blocked && t.line === this.inspection.blockedLine;

      if (pinNode) {
        pinNode.style.left = `${percent}%`;
        pinNode.style.top = this.getLineTopOffset(t.line);
        pinNode.className = `train-map-pin ${this.getLineTopClass(t.line)}`;
        pinNode.style.display = t.enabled ? 'flex' : 'none';
      }

      if (pinLabel) pinLabel.innerText = `${isDanger ? '⚠ DANGER ' : '📍 '}${t.id}: ${t.km.toFixed(1)} km`;
      if (pinPill) {
        pinPill.className = `pin-badge-pill${isDanger ? ' conflict' : ''}`;
      }
      if (safetyState) {
        safetyState.innerText = isDanger ? 'DANGER' : 'SAFE';
        safetyState.style.color = isDanger ? 'var(--status-critical)' : 'var(--status-service)';
      }
      if (slider) slider.value = t.km;
      if (distVal) distVal.innerText = `${t.km.toFixed(1)} km`;
      if (lineSelect) lineSelect.value = t.line;
    });

    // 3. Update Line Status Chips
    const line1Status = document.querySelector('#line1-status-text');
    if (line1Status) {
      line1Status.style.color = calcResult.line1Conflict ? 'var(--status-critical)' : 'var(--status-service)';
      line1Status.innerText = calcResult.line1Conflict
        ? `BLOCKED (${calcResult.line1Trains.join(', ') || 'No active trains'})`
        : calcResult.line1Trains.length > 0 ? `Occupied (${calcResult.line1Trains.join(', ')})` : 'Clear / Unoccupied';
    }

    const line2Status = document.querySelector('#line2-status-text');
    if (line2Status) {
      line2Status.style.color = calcResult.line2Conflict ? 'var(--status-critical)' : 'var(--status-service)';
      line2Status.innerText = calcResult.line2Conflict
        ? `BLOCKED (${calcResult.line2Trains.join(', ') || 'No active trains'})`
        : calcResult.line2Trains.length > 0 ? `Occupied (${calcResult.line2Trains.join(', ')})` : 'Clear / Unoccupied';
    }

    ['line3', 'line4'].forEach(line => {
      const status = document.querySelector(`#${line}-status-text`);
      if (!status) return;
      const trains = calcResult[`${line}Trains`];
      const blocked = calcResult[`${line}Conflict`];
      status.style.color = blocked ? 'var(--status-critical)' : 'var(--status-service)';
      status.innerText = blocked
        ? `BLOCKED (${trains.join(', ') || 'No active trains'})`
        : trains.length > 0 ? `Occupied (${trains.join(', ')})` : 'Clear / Unoccupied';
    });

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

    ['line3', 'line4'].forEach(line => {
      const box = document.querySelector(`#${line}-advisory-box`);
      const title = document.querySelector(`#${line}-advisory-title`);
      const body = document.querySelector(`#${line}-advisory-body`);
      const active = document.querySelector(`#${line}-active-names`);
      const separation = document.querySelector(`#${line}-sep-val`);
      const conflict = calcResult[`${line}Conflict`];
      if (box) box.className = `advisory-box ${conflict ? 'conflict' : 'verified'}`;
      if (title) title.style.color = conflict ? 'var(--status-critical)' : 'var(--status-service)';
      if (body) body.innerText = calcResult[`${line}Advisory`];
      if (active) active.innerText = calcResult[`${line}Trains`].length > 0 ? calcResult[`${line}Trains`].join(', ') : 'None';
      if (separation) separation.innerText = calcResult[`${line}Sep`] < 50 ? `${calcResult[`${line}Sep`].toFixed(1)} km` : 'Clear';
    });

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

    // 8. Update Inspection Cart checkpoint and track block signal
    this.updateInspectionDOM();
  }

  updateInspectionDOM() {
    const inspection = this.inspection;
    const isBlocked = inspection.blocked;
    const signalColor = isBlocked ? 'var(--status-critical)' : 'var(--status-service)';
    const signalText = isBlocked ? 'BLOCK TRACK' : 'TRACK OK';
    const signal = document.querySelector('#inspection-signal');
    const lastSignal = document.querySelector('#inspection-last-signal');
    const nextCheckpoint = document.querySelector('#inspection-next-checkpoint');
    const progress = document.querySelector('#inspection-progress');
    const checkedList = document.querySelector('#inspection-checked-list');
    const defectCoordinate = document.querySelector('#inspection-defect-coordinate');
    const runButton = document.querySelector('#run-inspection-btn');

    if (signal) {
      signal.style.color = signalColor;
      signal.style.borderColor = signalColor;
      signal.style.background = isBlocked ? 'var(--status-critical-bg)' : 'var(--status-service-bg)';
      signal.innerHTML = `<span class="pulse-dot" style="background:${signalColor};"></span><strong>${signalText}</strong>`;
    }
    if (lastSignal) {
      lastSignal.innerText = signalText;
      lastSignal.style.color = signalColor;
    }
    if (nextCheckpoint) nextCheckpoint.innerText = inspection.checkpointKm >= 14 ? 'Terminal at 15.0 km' : `${inspection.checkpointKm + 2}.0 km`;
    if (progress) progress.style.width = `${Math.min(100, (inspection.checkpointKm / 15) * 100)}%`;
    if (checkedList) checkedList.innerText = inspection.inspectedCheckpoints.length > 0
      ? inspection.inspectedCheckpoints.map(km => `${km.toFixed(1)} km`).join(', ')
      : 'None yet';
    if (defectCoordinate) {
      defectCoordinate.innerText = isBlocked
        ? `${this.getLineName(inspection.line)} / chainage ${inspection.checkpointKm.toFixed(1)} km`
        : 'No defect recorded';
      defectCoordinate.style.color = isBlocked ? 'var(--status-critical)' : 'var(--text-muted)';
    }
    if (runButton) runButton.disabled = isBlocked || inspection.checkpointKm >= 14;
  }

  startSimulation() {
    this.stopSimulation();
    this.lastFrameTime = performance.now();

    const animate = (now) => {
      if (!this.calcInputs.isSimulating) return;

      const deltaSec = Math.min((now - this.lastFrameTime) / 1000.0, 0.1);
      this.lastFrameTime = now;

      const keys = ['t1', 't2', 't3', 't4', 't5', 't6'];
      keys.forEach(key => {
        const t = this.calcInputs[key];
        if (!t.enabled || (this.inspection.blocked && t.line === this.inspection.blockedLine)) return;

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
