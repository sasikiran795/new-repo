/**
 * AURELIUS LUXE AUCTIONS & AI CONCIERGE CHATBOT
 * Complete Client-Side Engine: Web Audio SFX, Simulated Floor Bidders,
 * NLP Bidding & Appraisal Dialogue, Live Timers, and Inventory Tracking.
 */

(function () {
  'use strict';

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  const STATE = {
    user: {
      paddle: '#77',
      name: 'Sasikumar',
      balance: 250000,
      activeAutoBidMax: null, // null or number
      wonLots: []
    },
    settings: {
      sfxEnabled: true,
      ttsEnabled: true,
      currentPersona: 'auctioneer' // 'auctioneer', 'advisor', 'aggressive'
    },
    config: {
      geminiApiKey: localStorage.getItem('aurelius_gemini_key') || '',
      geminiModel: localStorage.getItem('aurelius_gemini_model') || 'gemini-1.5-flash',
      supabaseUrl: localStorage.getItem('aurelius_supabase_url') || '',
      supabaseAnonKey: localStorage.getItem('aurelius_supabase_key') || '',
      isGeminiConnected: false,
      isSupabaseConnected: false,
      supabaseClient: null
    },
    activeLotIndex: 0,
    lots: [
      {
        id: '101',
        title: '1968 Patek Philippe Celestial Tourbillon Chronograph',
        category: 'HOROLOGY & TIMEPIECES',
        provenance: 'Geneva Private Collection • 18K Rose Gold • Obsidian Dial • Mint Condition',
        image: 'assets/img/watch.jpg',
        currentBid: 52000,
        increment: 3000,
        estimateMin: 45000,
        estimateMax: 65000,
        reserveMet: true,
        highBidder: { name: 'Elena Rostova (Monaco) • Paddle #12', isUser: false },
        bidsCount: 18,
        timeLeft: 28,
        initialTime: 28,
        timerActive: true,
        status: 'active', // active, sold
        winner: null,
        specs: {
          condition: 'Mint Pristine (9.9/10)',
          movement: 'Calibre CH 29-535 PS Q Manual-Wind',
          caseDiameter: '41mm 18K Rose Gold with Sapphire Caseback',
          authenticity: 'Geneva Seal Certified #88201',
          historicalTrend: '+28.4% 3-Year Appreciation',
          curatorNote: 'One of only four known surviving examples in private custody with original archival papers and presentation mahogany box.'
        }
      },
      {
        id: '102',
        title: 'The Imperial Muzo Emerald & Diamond Heritage Pendant',
        category: 'FINE JEWELRY & GEMSTONES',
        provenance: 'Bogotá Royal Vault • 42.6 Carat Colombian Emerald • D-Flawless Diamonds',
        image: 'assets/img/emerald.jpg',
        currentBid: 110000,
        increment: 5000,
        estimateMin: 100000,
        estimateMax: 140000,
        reserveMet: true,
        highBidder: { name: 'Lord Harrington (Geneva) • Paddle #04', isUser: false },
        bidsCount: 24,
        timeLeft: 35,
        initialTime: 35,
        timerActive: false,
        status: 'upcoming',
        winner: null,
        specs: {
          condition: 'Museum Grade Flawless Setting',
          gemstone: 'Natural Colombian Muzo Emerald (No Heat, Insignificant Oil)',
          caratWeight: '42.60 Carat Center Octagonal Step-Cut',
          authenticity: 'Dual Gübelin & SSEF Gemological Heritage Dossier',
          historicalTrend: '+41.2% 5-Year High Jewelry Index',
          curatorNote: 'Acquired during the 1920s Paris Art Deco exposition; displaying the legendary saturated "Old Mine" green hue.'
        }
      },
      {
        id: '103',
        title: 'Apex Chiron Aerodynamic Titanium Hypercar (1:8 Masterpiece)',
        category: 'CONCEPT MOTORING & COLLECTIBLES',
        provenance: 'Maranello Design Studio • Hand-Milled Grade 5 Titanium • Cyan LED Illumination',
        image: 'assets/img/hypercar.jpg',
        currentBid: 85000,
        increment: 5000,
        estimateMin: 80000,
        estimateMax: 120000,
        reserveMet: true,
        highBidder: { name: 'Kaito Tanaka (Tokyo) • Paddle #89', isUser: false },
        bidsCount: 14,
        timeLeft: 40,
        initialTime: 40,
        timerActive: false,
        status: 'upcoming',
        winner: null,
        specs: {
          condition: '1 of 1 Titanium Studio Prototype',
          chassis: 'Aerospace Grade 5 Titanium & Prepreg Carbon Monocoque',
          dimensions: '58cm x 26cm x 15cm (Scale 1:8 Master Model)',
          authenticity: 'Signed by Lead Aerodynamicist + Embedded NFC Cryptographic Tag',
          historicalTrend: '+35.0% Collector Prototype Index',
          curatorNote: 'Commissioned for the Geneva International Motor Show aerodynamic wind-tunnel validation display.'
        }
      }
    ],
    rivalBidders: [
      { name: 'Elena Rostova (Monaco)', paddle: '#12', budgetLimit: 78000, style: 'Aggressive Art Dealer' },
      { name: 'Lord Harrington (Geneva)', paddle: '#04', budgetLimit: 135000, style: 'Conservative Aristocrat' },
      { name: 'Kaito Tanaka (Tokyo)', paddle: '#89', budgetLimit: 115000, style: 'Tech Venture Magnate' },
      { name: 'Lady Margaret (London)', paddle: '#31', budgetLimit: 68000, style: 'Heritage Collector' },
      { name: 'Julian Sterling (New York)', paddle: '#58', budgetLimit: 95000, style: 'Floor Speculator' }
    ],
    liveFeed: [],
    timerInterval: null
  };

  // ==========================================================================
  // WEB AUDIO API SOUND EFFECTS SYNTHESIZER
  // ==========================================================================

  const AudioEngine = {
    ctx: null,

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
      }
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    // Gavel knock sound: resonant dual thump with wood acoustic decay
    playGavel() {
      if (!STATE.settings.sfxEnabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Primary wood knock
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);

      // Resonant echo bounce
      setTimeout(() => {
        if (!this.ctx) return;
        const now2 = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(90, now2);
        osc2.frequency.exponentialRampToValueAtTime(25, now2 + 0.15);
        gain2.gain.setValueAtTime(0.4, now2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.2);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now2);
        osc2.stop(now2 + 0.21);
      }, 70);
    },

    // Crisp crystal chime for successful bids
    playBidChime() {
      if (!STATE.settings.sfxEnabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.2); // A6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now); // E6

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.46);
      osc2.stop(now + 0.46);
    },

    // Warning tone when outbid
    playOutbidWarning() {
      if (!STATE.settings.sfxEnabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(370, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    },

    // Tick for final seconds
    playTick() {
      if (!STATE.settings.sfxEnabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    },

    // Glorious ascending win arpeggio
    playVictory() {
      if (!STATE.settings.sfxEnabled) return;
      this.init();
      this.resume();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.65);
        }, idx * 130);
      });
    }
  };

  // ==========================================================================
  // TEXT-TO-SPEECH (TTS) AUCTIONEER VOICE
  // ==========================================================================

  const VoiceEngine = {
    speak(text) {
      if (!STATE.settings.ttsEnabled) return;
      if (!('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      // Prefer refined English voices if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        (v.lang.includes('en-GB') || v.lang.includes('en-US')) && 
        (v.name.includes('Natural') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Daniel') || v.name.includes('Google UK English Male'))
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  // ==========================================================================
  // DOM REFERENCES
  // ==========================================================================

  const DOM = {
    userBalanceDisplay: document.getElementById('userBalanceDisplay'),
    addFundsBtn: document.getElementById('addFundsBtn'),
    sfxToggleBtn: document.getElementById('sfxToggleBtn'),
    ttsToggleBtn: document.getElementById('ttsToggleBtn'),
    wonLotsBtn: document.getElementById('wonLotsBtn'),
    wonLotsCount: document.getElementById('wonLotsCount'),
    
    // Catalog
    lotsCarousel: document.getElementById('lotsCarousel'),
    
    // Main Lot Showcase
    lotCategoryBadge: document.getElementById('lotCategoryBadge'),
    lotNumberBadge: document.getElementById('lotNumberBadge'),
    lotMainImage: document.getElementById('lotMainImage'),
    lotEstimateDisplay: document.getElementById('lotEstimateDisplay'),
    lotReserveStatus: document.getElementById('lotReserveStatus'),
    lotTitle: document.getElementById('lotTitle'),
    lotProvenance: document.getElementById('lotProvenance'),
    currentBidPrice: document.getElementById('currentBidPrice'),
    bidsCountBadge: document.getElementById('bidsCountBadge'),
    highBidderBanner: document.getElementById('highBidderBanner'),
    highBidderName: document.getElementById('highBidderName'),
    
    // Countdown
    countdownSeconds: document.getElementById('countdownSeconds'),
    timerProgressCircle: document.getElementById('timerProgressCircle'),
    gavelStageText: document.getElementById('gavelStageText'),
    hammerIndicator: document.getElementById('hammerIndicator'),
    hammerStatusNotice: document.getElementById('hammerStatusNotice'),
    
    // Controls
    quickBidBtn: document.getElementById('quickBidBtn'),
    quickBidAmount: document.getElementById('quickBidAmount'),
    incrementTag: document.getElementById('incrementTag'),
    customBidInput: document.getElementById('customBidInput'),
    customBidBtn: document.getElementById('customBidBtn'),
    proxyMaxInput: document.getElementById('proxyMaxInput'),
    proxyToggleBtn: document.getElementById('proxyToggleBtn'),
    proxyStatusText: document.getElementById('proxyStatusText'),
    
    // Sub-Tabs
    subTabBtns: document.querySelectorAll('.sub-tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    liveBidsFeedList: document.getElementById('liveBidsFeedList'),
    feedCount: document.getElementById('feedCount'),
    provenanceReportCard: document.getElementById('provenanceReportCard'),
    
    // Chatbot
    personaSelect: document.getElementById('personaSelect'),
    chatMessagesContainer: document.getElementById('chatMessagesContainer'),
    chatSuggestionsBar: document.getElementById('chatSuggestionsBar'),
    chatForm: document.getElementById('chatForm'),
    chatInput: document.getElementById('chatInput'),
    voiceInputBtn: document.getElementById('voiceInputBtn'),
    botStatusActivity: document.getElementById('botStatusActivity'),
    
    // Modals
    wonLotsModal: document.getElementById('wonLotsModal'),
    wonLotsModalBody: document.getElementById('wonLotsModalBody'),
    closeWonLotsBtn: document.getElementById('closeWonLotsBtn'),
    fundsModal: document.getElementById('fundsModal'),
    closeFundsBtn: document.getElementById('closeFundsBtn'),
    presetFundBtns: document.querySelectorAll('.preset-fund-btn'),
    
    // Canvas
    confettiCanvas: document.getElementById('confettiCanvas'),

    // Cloud & Settings Modal
    settingsToggleBtn: document.getElementById('settingsToggleBtn'),
    geminiPillBtn: document.getElementById('geminiPillBtn'),
    geminiDot: document.getElementById('geminiDot'),
    geminiTxt: document.getElementById('geminiTxt'),
    supabasePillBtn: document.getElementById('supabasePillBtn'),
    supabaseDot: document.getElementById('supabaseDot'),
    supabaseTxt: document.getElementById('supabaseTxt'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    clearConfigBtn: document.getElementById('clearConfigBtn'),
    geminiApiKeyInput: document.getElementById('geminiApiKeyInput'),
    geminiModelSelect: document.getElementById('geminiModelSelect'),
    toggleGeminiKeyVis: document.getElementById('toggleGeminiKeyVis'),
    testGeminiBtn: document.getElementById('testGeminiBtn'),
    geminiTestFeedback: document.getElementById('geminiTestFeedback'),
    geminiStatusTag: document.getElementById('geminiStatusTag'),
    supabaseUrlInput: document.getElementById('supabaseUrlInput'),
    supabaseAnonKeyInput: document.getElementById('supabaseAnonKeyInput'),
    toggleSupabaseKeyVis: document.getElementById('toggleSupabaseKeyVis'),
    testSupabaseBtn: document.getElementById('testSupabaseBtn'),
    copySchemaBtn: document.getElementById('copySchemaBtn'),
    syncLotsToSupabaseBtn: document.getElementById('syncLotsToSupabaseBtn'),
    supabaseTestFeedback: document.getElementById('supabaseTestFeedback'),
    supabaseStatusTag: document.getElementById('supabaseStatusTag'),
    settingsNavBtns: document.querySelectorAll('.settings-nav-btn'),
    settingsTabPanes: document.querySelectorAll('.settings-tab-pane')
  };

  // ==========================================================================
  // CLOUD INTEGRATIONS: GEMINI AI & SUPABASE DATABASE
  // ==========================================================================

  const CloudManager = {
    async init() {
      // 1. Fetch server-side config if available
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const srv = await res.json();
          if (srv.hasGemini && !STATE.config.geminiApiKey) {
            STATE.config.geminiApiKey = 'SERVER_ENV';
            STATE.config.geminiModel = srv.geminiModel;
          }
          if (srv.hasSupabase && !STATE.config.supabaseUrl) {
            STATE.config.supabaseUrl = srv.supabaseUrl;
            STATE.config.supabaseAnonKey = 'SERVER_ENV';
          }
        }
      } catch (e) {
        // standalone static fallback
      }

      // Populate input values
      if (DOM.geminiApiKeyInput && STATE.config.geminiApiKey && STATE.config.geminiApiKey !== 'SERVER_ENV') {
        DOM.geminiApiKeyInput.value = STATE.config.geminiApiKey;
      }
      if (DOM.geminiModelSelect) {
        DOM.geminiModelSelect.value = STATE.config.geminiModel || 'gemini-1.5-flash';
      }
      if (DOM.supabaseUrlInput && STATE.config.supabaseUrl) {
        DOM.supabaseUrlInput.value = STATE.config.supabaseUrl;
      }
      if (DOM.supabaseAnonKeyInput && STATE.config.supabaseAnonKey && STATE.config.supabaseAnonKey !== 'SERVER_ENV') {
        DOM.supabaseAnonKeyInput.value = STATE.config.supabaseAnonKey;
      }

      // Check Gemini connection
      if (STATE.config.geminiApiKey) {
        STATE.config.isGeminiConnected = true;
      }
      this.updateGeminiUI();

      // Check Supabase connection
      if (STATE.config.supabaseUrl && STATE.config.supabaseAnonKey && typeof window.supabase !== 'undefined') {
        try {
          STATE.config.supabaseClient = window.supabase.createClient(
            STATE.config.supabaseUrl,
            STATE.config.supabaseAnonKey === 'SERVER_ENV' ? '' : STATE.config.supabaseAnonKey
          );
          STATE.config.isSupabaseConnected = true;
          SupabaseSync.init();
        } catch (err) {
          console.warn('Supabase init notice:', err);
        }
      }
      this.updateSupabaseUI();
    },

    updateGeminiUI() {
      if (STATE.config.isGeminiConnected) {
        if (DOM.geminiDot) DOM.geminiDot.className = 'pill-dot online';
        if (DOM.geminiTxt) DOM.geminiTxt.textContent = 'Gemini AI ✓';
        if (DOM.geminiStatusTag) {
          DOM.geminiStatusTag.innerHTML = `<span class="status-indicator-dot online"></span><span class="status-indicator-label">Active (${STATE.config.geminiModel || '1.5-flash'})</span>`;
        }
      } else {
        if (DOM.geminiDot) DOM.geminiDot.className = 'pill-dot offline';
        if (DOM.geminiTxt) DOM.geminiTxt.textContent = 'Gemini (Offline)';
        if (DOM.geminiStatusTag) {
          DOM.geminiStatusTag.innerHTML = '<span class="status-indicator-dot offline"></span><span class="status-indicator-label">Local Heuristics</span>';
        }
      }
    },

    updateSupabaseUI() {
      if (STATE.config.isSupabaseConnected) {
        if (DOM.supabaseDot) DOM.supabaseDot.className = 'pill-dot online';
        if (DOM.supabaseTxt) DOM.supabaseTxt.textContent = 'Supabase DB ✓';
        if (DOM.supabaseStatusTag) {
          DOM.supabaseStatusTag.innerHTML = '<span class="status-indicator-dot online"></span><span class="status-indicator-label">Connected</span>';
        }
      } else {
        if (DOM.supabaseDot) DOM.supabaseDot.className = 'pill-dot offline';
        if (DOM.supabaseTxt) DOM.supabaseTxt.textContent = 'Supabase (Off)';
        if (DOM.supabaseStatusTag) {
          DOM.supabaseStatusTag.innerHTML = '<span class="status-indicator-dot offline"></span><span class="status-indicator-label">Browser Local</span>';
        }
      }
    },

    async testGemini(key, model) {
      if (!DOM.geminiTestFeedback) return;
      DOM.geminiTestFeedback.textContent = 'Contacting Gemini API...';
      DOM.geminiTestFeedback.className = 'test-feedback';

      const apiKeyToUse = key || STATE.config.geminiApiKey;
      if (!apiKeyToUse) {
        DOM.geminiTestFeedback.textContent = 'Please enter a Gemini API Key first.';
        DOM.geminiTestFeedback.className = 'test-feedback error';
        return false;
      }

      try {
        const payload = {
          apiKey: apiKeyToUse === 'SERVER_ENV' ? '' : apiKeyToUse,
          model: model || 'gemini-1.5-flash',
          message: 'Respond in 1 short sentence: Confirm you are ready to preside as Aurelius AI Master Auctioneer.',
          systemPrompt: 'You are Aurelius, the AI Master Auctioneer.'
        };
        const res = await fetch('/api/chat-gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          DOM.geminiTestFeedback.textContent = `✓ Success! Gemini replied: "${data.reply}"`;
          DOM.geminiTestFeedback.className = 'test-feedback success';
          STATE.config.isGeminiConnected = true;
          this.updateGeminiUI();
          return true;
        } else {
          DOM.geminiTestFeedback.textContent = `✗ Error: ${data.error}`;
          DOM.geminiTestFeedback.className = 'test-feedback error';
          return false;
        }
      } catch (err) {
        DOM.geminiTestFeedback.textContent = `✗ Network Error: ${err.message}`;
        DOM.geminiTestFeedback.className = 'test-feedback error';
        return false;
      }
    },

    async testSupabase(url, key) {
      if (!DOM.supabaseTestFeedback) return;
      DOM.supabaseTestFeedback.textContent = 'Validating Supabase connection...';
      DOM.supabaseTestFeedback.className = 'test-feedback';

      if (!url || !key) {
        DOM.supabaseTestFeedback.textContent = 'Please provide both Supabase URL and Public Anon Key.';
        DOM.supabaseTestFeedback.className = 'test-feedback error';
        return false;
      }

      if (typeof window.supabase === 'undefined') {
        DOM.supabaseTestFeedback.textContent = 'Supabase JS library not loaded. Check internet connection.';
        DOM.supabaseTestFeedback.className = 'test-feedback error';
        return false;
      }

      try {
        const client = window.supabase.createClient(url, key);
        const { data, error } = await client.from('lots').select('id').limit(1);
        if (error) {
          DOM.supabaseTestFeedback.textContent = `Connected to project, but table check returned: ${error.message} (Tip: run supabase_schema.sql in Supabase SQL Editor).`;
          DOM.supabaseTestFeedback.className = 'test-feedback warning';
        } else {
          DOM.supabaseTestFeedback.textContent = `✓ Connected to Supabase! Successfully queried the 'lots' table.`;
          DOM.supabaseTestFeedback.className = 'test-feedback success';
        }
        STATE.config.supabaseClient = client;
        STATE.config.isSupabaseConnected = true;
        this.updateSupabaseUI();
        return true;
      } catch (err) {
        DOM.supabaseTestFeedback.textContent = `✗ Failed to connect: ${err.message}`;
        DOM.supabaseTestFeedback.className = 'test-feedback error';
        return false;
      }
    },

    async saveSettings() {
      const gKey = DOM.geminiApiKeyInput.value.trim();
      const gModel = DOM.geminiModelSelect.value;
      const sUrl = DOM.supabaseUrlInput.value.trim();
      const sKey = DOM.supabaseAnonKeyInput.value.trim();

      if (gKey) {
        STATE.config.geminiApiKey = gKey;
        localStorage.setItem('aurelius_gemini_key', gKey);
        STATE.config.isGeminiConnected = true;
      }
      STATE.config.geminiModel = gModel;
      localStorage.setItem('aurelius_gemini_model', gModel);

      if (sUrl && sKey) {
        STATE.config.supabaseUrl = sUrl;
        STATE.config.supabaseAnonKey = sKey;
        localStorage.setItem('aurelius_supabase_url', sUrl);
        localStorage.setItem('aurelius_supabase_key', sKey);
        if (typeof window.supabase !== 'undefined') {
          STATE.config.supabaseClient = window.supabase.createClient(sUrl, sKey);
          STATE.config.isSupabaseConnected = true;
          SupabaseSync.init();
        }
      }

      // Persist to server .env
      try {
        await fetch('/api/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geminiApiKey: gKey,
            geminiModel: gModel,
            supabaseUrl: sUrl,
            supabaseAnonKey: sKey
          })
        });
      } catch (e) {
        // ignore if static
      }

      this.updateGeminiUI();
      this.updateSupabaseUI();
      AudioEngine.playBidChime();
      DOM.settingsModal.hidden = true;
      appendBotMessage(`⚙️ **Cloud Settings Saved!**\n• Gemini AI: ${STATE.config.isGeminiConnected ? 'Active (' + gModel + ')' : 'Local Heuristics'}\n• Supabase Database: ${STATE.config.isSupabaseConnected ? 'Connected & Syncing' : 'Browser Local'}`);
    },

    clearSettings() {
      localStorage.removeItem('aurelius_gemini_key');
      localStorage.removeItem('aurelius_gemini_model');
      localStorage.removeItem('aurelius_supabase_url');
      localStorage.removeItem('aurelius_supabase_key');
      STATE.config.geminiApiKey = '';
      STATE.config.supabaseUrl = '';
      STATE.config.supabaseAnonKey = '';
      STATE.config.isGeminiConnected = false;
      STATE.config.isSupabaseConnected = false;
      STATE.config.supabaseClient = null;

      DOM.geminiApiKeyInput.value = '';
      DOM.supabaseUrlInput.value = '';
      DOM.supabaseAnonKeyInput.value = '';
      DOM.geminiTestFeedback.textContent = '';
      DOM.supabaseTestFeedback.textContent = '';

      fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: '', supabaseUrl: '', supabaseAnonKey: '' })
      }).catch(() => {});

      this.updateGeminiUI();
      this.updateSupabaseUI();
      appendBotMessage(`🧹 All stored API keys and cloud settings have been cleared.`);
    }
  };

  const GeminiChatEngine = {
    async queryGemini(userText) {
      const lot = STATE.lots[STATE.activeLotIndex];
      const persona = STATE.settings.currentPersona;

      const systemPrompt = `You are Aurelius, the AI Master Auctioneer and Luxury Valuation Concierge for the high-end Aurelius Salon.
Persona: ${persona === 'advisor' ? 'Wealth and Art Investment Advisor (analytical, ROI-focused)' : persona === 'aggressive' ? 'Aggressive Floor Trader (urgent, high-energy)' : 'Grand Master Auctioneer (theatrical, aristocratic, prestigious)'}.
Active Auction Item:
- Lot #${lot.id}: ${lot.title}
- Category: ${lot.category}
- Provenance: ${lot.provenance}
- Current High Bid: $${lot.currentBid.toLocaleString()} USD
- Minimum Next Bid: $${(lot.currentBid + lot.increment).toLocaleString()} USD (Increment: +$${lot.increment.toLocaleString()})
- Valuation Estimate: $${lot.estimateMin.toLocaleString()} - $${lot.estimateMax.toLocaleString()} USD
- Leading Bidder: ${lot.highBidder.name} (${lot.highBidder.isUser ? 'USER IS WINNING' : 'Rival holds the hammer'})
- User Paddle: ${STATE.user.paddle} (Sasikumar), Verified Credit Line: $${STATE.user.balance.toLocaleString()} USD
- Specifications: Condition: ${lot.specs.condition}, Authenticity: ${lot.specs.authenticity}, Historical Trend: ${lot.specs.historicalTrend}

COMMAND PARSING RULES:
If the user indicates they want to bid (e.g. "bid $55k", "place bid", "raise", "bid minimum"), output the special action token [ACTION:BID:amount_in_numbers] anywhere in your response. Example: [ACTION:BID:${lot.currentBid + lot.increment}].
If the user sets an auto-bid limit (e.g. "set auto-bid to $80k"), output [ACTION:AUTOBID:amount_in_numbers].
If the user wants to switch lots (e.g. "switch to emerald", "lot 2", "lot 3"), output [ACTION:SWITCH:lot_id].

FORMATTING:
Respond in character as Aurelius with elegant markdown formatting, bold highlights, concise advice, and refined luxury terminology. Do not break character. Keep responses under 150 words unless detailing an in-depth appraisal.`;

      try {
        const payload = {
          apiKey: STATE.config.geminiApiKey === 'SERVER_ENV' ? '' : STATE.config.geminiApiKey,
          model: STATE.config.geminiModel || 'gemini-1.5-flash',
          message: userText,
          systemPrompt: systemPrompt
        };

        const res = await fetch('/api/chat-gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success && data.reply) {
          return { success: true, reply: data.reply };
        } else {
          return { success: false, error: data.error };
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  };

  const SupabaseSync = {
    async init() {
      if (!STATE.config.supabaseClient) return;
      const client = STATE.config.supabaseClient;

      // Subscribe to real-time changes on bids
      try {
        client
          .channel('public:bids')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, payload => {
            const newBid = payload.new;
            if (newBid && !newBid.is_user) {
              const currentLot = STATE.lots[STATE.activeLotIndex];
              if (currentLot.id === newBid.lot_id && Number(newBid.amount) > currentLot.currentBid) {
                currentLot.currentBid = Number(newBid.amount);
                currentLot.bidsCount++;
                currentLot.highBidder = { name: `${newBid.bidder_name} • Paddle ${newBid.paddle}`, isUser: false };
                applySoftCloseExtension(currentLot);
                AudioEngine.playGavel();
                triggerGavelAnimation();
                addFeedItem(newBid.bidder_name, newBid.paddle, Number(newBid.amount), false);
                renderActiveLot();
              }
            }
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    },

    async recordBid(lotId, bidderName, paddle, amount, isUser) {
      if (!STATE.config.supabaseClient) return;
      try {
        const client = STATE.config.supabaseClient;
        await client.from('bids').insert([
          {
            lot_id: String(lotId),
            bidder_name: bidderName,
            paddle: paddle,
            amount: amount,
            is_user: isUser
          }
        ]);

        await client.from('lots').update({
          current_bid: amount,
          high_bidder_name: bidderName,
          high_bidder_paddle: paddle,
          updated_at: new Date().toISOString()
        }).eq('id', String(lotId));
      } catch (err) {
        console.warn('Supabase recordBid error:', err);
      }
    },

    async recordChatMessage(lotId, role, content, persona) {
      if (!STATE.config.supabaseClient) return;
      try {
        const client = STATE.config.supabaseClient;
        await client.from('chat_messages').insert([
          {
            lot_id: String(lotId),
            role: role,
            content: content,
            persona: persona
          }
        ]);
      } catch (err) {
        console.warn('Supabase recordChatMessage error:', err);
      }
    },

    async syncAllLotsToSupabase() {
      if (!STATE.config.supabaseClient) {
        alert('Supabase is not connected. Please enter your Supabase URL & Anon Key first.');
        return;
      }
      const client = STATE.config.supabaseClient;
      if (DOM.supabaseTestFeedback) {
        DOM.supabaseTestFeedback.textContent = 'Syncing catalog lots to Supabase...';
        DOM.supabaseTestFeedback.className = 'test-feedback';
      }

      try {
        const records = STATE.lots.map(l => ({
          id: String(l.id),
          title: l.title,
          category: l.category,
          provenance: l.provenance,
          image: l.image,
          current_bid: l.currentBid,
          increment: l.increment,
          estimate_min: l.estimateMin,
          estimate_max: l.estimateMax,
          reserve_met: l.reserveMet,
          high_bidder_name: l.highBidder.name,
          high_bidder_paddle: l.highBidder.paddle || '#12',
          bids_count: l.bidsCount,
          status: l.status,
          specs: l.specs,
          updated_at: new Date().toISOString()
        }));

        const { error } = await client.from('lots').upsert(records, { onConflict: 'id' });
        if (error) {
          if (DOM.supabaseTestFeedback) {
            DOM.supabaseTestFeedback.textContent = `✗ Sync failed: ${error.message}`;
            DOM.supabaseTestFeedback.className = 'test-feedback error';
          }
        } else {
          if (DOM.supabaseTestFeedback) {
            DOM.supabaseTestFeedback.textContent = `✓ Successfully synced ${records.length} luxury lots to Supabase database!`;
            DOM.supabaseTestFeedback.className = 'test-feedback success';
          }
          AudioEngine.playBidChime();
        }
      } catch (err) {
        if (DOM.supabaseTestFeedback) {
          DOM.supabaseTestFeedback.textContent = `✗ Sync error: ${err.message}`;
          DOM.supabaseTestFeedback.className = 'test-feedback error';
        }
      }
    }
  };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async function init() {
    await CloudManager.init();
    setupInitialLotFeed();
    renderLotCarousel();
    renderActiveLot();
    startCountdownTimer();
    bindEvents();
    renderWelcomeMessage();
  }

  // Populate initial realistic bid ticker
  function setupInitialLotFeed() {
    const lot = STATE.lots[0];
    STATE.liveFeed = [
      { actor: 'Elena Rostova (Monaco)', paddle: '#12', amt: 52000, time: 'Just now', isLead: true },
      { actor: 'Lord Harrington (Geneva)', paddle: '#04', amt: 49000, time: '14s ago' },
      { actor: 'Kaito Tanaka (Tokyo)', paddle: '#89', amt: 46000, time: '32s ago' },
      { actor: 'Phone Bidder #07', paddle: '#07', amt: 43000, time: '1m ago' },
      { actor: 'Floor Paddle #19', paddle: '#19', amt: 40000, time: '2m ago' }
    ];
    renderFeedList();
  }

  // ==========================================================================
  // LOT RENDERING & UI UPDATES
  // ==========================================================================

  function renderLotCarousel() {
    DOM.lotsCarousel.innerHTML = '';
    STATE.lots.forEach((lot, idx) => {
      const pill = document.createElement('button');
      pill.className = `lot-nav-pill ${idx === STATE.activeLotIndex ? 'active' : ''}`;
      pill.setAttribute('data-index', idx);
      pill.innerHTML = `
        <span class="lot-pill-id">#${lot.id}</span>
        <span class="lot-pill-name">${lot.title}</span>
        <span class="lot-pill-status ${lot.status === 'sold' ? 'closed' : ''}">${lot.status.toUpperCase()}</span>
      `;
      pill.addEventListener('click', () => switchLot(idx));
      DOM.lotsCarousel.appendChild(pill);
    });
  }

  function switchLot(index) {
    if (index === STATE.activeLotIndex) return;
    STATE.activeLotIndex = index;
    const lot = STATE.lots[index];

    // Reset proxy auto bid for previous lot unless reconfigured
    STATE.user.activeAutoBidMax = null;
    updateProxyDisplay();

    renderLotCarousel();
    renderActiveLot();

    // Reset countdown for this lot if not sold
    if (lot.status !== 'sold') {
      lot.timeLeft = lot.initialTime;
      lot.timerActive = true;
    }

    AudioEngine.playBidChime();

    // Inform chatbot
    const announceMsg = `We have pivoted our salon focus to **Lot #${lot.id}: ${lot.title}**. Opening high bid stands at **$${lot.currentBid.toLocaleString()} USD**. How may I assist your strategy on this piece?`;
    appendBotMessage(announceMsg);
    VoiceEngine.speak(`Now presenting Lot ${lot.id}, ${lot.title}. Current bid at ${lot.currentBid.toLocaleString()} dollars.`);
  }

  function renderActiveLot() {
    const lot = STATE.lots[STATE.activeLotIndex];

    DOM.lotCategoryBadge.textContent = lot.category;
    DOM.lotNumberBadge.textContent = `LOT #${lot.id}`;
    DOM.lotMainImage.src = lot.image;
    DOM.lotMainImage.alt = lot.title;
    DOM.lotTitle.textContent = lot.title;
    DOM.lotProvenance.textContent = lot.provenance;
    DOM.lotEstimateDisplay.textContent = `$${lot.estimateMin.toLocaleString()} - $${lot.estimateMax.toLocaleString()}`;
    DOM.lotReserveStatus.textContent = lot.reserveMet ? 'MET ✓' : 'NOT MET';
    DOM.bidsCountBadge.textContent = `${lot.bidsCount} Bids Placed`;

    // Price
    DOM.currentBidPrice.textContent = lot.currentBid.toLocaleString();
    DOM.currentBidPrice.classList.add('pulse-price');
    setTimeout(() => DOM.currentBidPrice.classList.remove('pulse-price'), 500);

    // Next bid
    const nextBid = lot.currentBid + lot.increment;
    DOM.quickBidAmount.textContent = `$${nextBid.toLocaleString()}`;
    DOM.incrementTag.textContent = `+ $${lot.increment.toLocaleString()} Increment`;
    DOM.customBidInput.min = nextBid;
    DOM.customBidInput.placeholder = `$${nextBid.toLocaleString()} or higher`;

    // High bidder banner
    if (lot.highBidder.isUser) {
      DOM.highBidderBanner.classList.add('user-winning');
      DOM.highBidderName.innerHTML = `🌟 <strong>YOU (Winning!) • Paddle ${STATE.user.paddle}</strong>`;
    } else {
      DOM.highBidderBanner.classList.remove('user-winning');
      DOM.highBidderName.textContent = lot.highBidder.name;
    }

    // Provenance report card tab
    renderProvenanceTab(lot);

    // Suggestions bar update
    updateSuggestionChips(lot);
  }

  function renderProvenanceTab(lot) {
    DOM.provenanceReportCard.innerHTML = `
      <div class="prov-stat-box">
        <div class="prov-stat-label">AUTHENTICITY CERTIFICATE</div>
        <div class="prov-stat-val text-gold">${lot.specs.authenticity}</div>
      </div>
      <div class="prov-stat-box">
        <div class="prov-stat-label">CONDITION REPORT</div>
        <div class="prov-stat-val">${lot.specs.condition}</div>
      </div>
      <div class="prov-stat-box">
        <div class="prov-stat-label">HISTORICAL MARKET APPRECIATION</div>
        <div class="prov-stat-val text-emerald" style="color:var(--accent-emerald)">${lot.specs.historicalTrend}</div>
      </div>
      <div class="prov-stat-box">
        <div class="prov-stat-label">CURATOR ARCHIVAL NOTE</div>
        <div class="prov-stat-val" style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary)">${lot.specs.curatorNote}</div>
      </div>
    `;
  }

  function updateSuggestionChips(lot) {
    const nextBid = lot.currentBid + lot.increment;
    DOM.chatSuggestionsBar.innerHTML = `
      <button class="suggestion-chip" data-cmd="bid ${nextBid}">⚡ Place Next Bid ($${(nextBid/1000).toFixed(0)}k)</button>
      <button class="suggestion-chip" data-cmd="appraise">🔍 Appraise Lot #${lot.id}</button>
      <button class="suggestion-chip" data-cmd="strategy">🎯 Advise Bidding Strategy</button>
      <button class="suggestion-chip" data-cmd="autobid ${lot.currentBid + (lot.increment * 4)}">🤖 Set Auto-Bid</button>
      <button class="suggestion-chip" data-cmd="compare">⚖️ Compare Lots</button>
    `;
  }

  // ==========================================================================
  // LIVE FEED STREAM
  // ==========================================================================

  function addFeedItem(actor, paddle, amt, isUser = false) {
    const item = {
      actor,
      paddle,
      amt,
      time: 'Just now',
      isUser,
      isLead: true
    };
    STATE.liveFeed.unshift(item);
    if (STATE.liveFeed.length > 20) STATE.liveFeed.pop();
    renderFeedList();
  }

  function renderFeedList() {
    DOM.feedCount.textContent = STATE.liveFeed.length;
    DOM.liveBidsFeedList.innerHTML = STATE.liveFeed.map(item => `
      <div class="feed-item ${item.isUser ? 'user-bid' : ''} ${item.isLead ? 'lead-bid' : ''}">
        <div class="feed-actor">
          <span class="feed-badge">${item.paddle}</span>
          <span class="feed-actor-name">${item.actor}</span>
        </div>
        <div style="display:flex; align-items:center;">
          <span class="feed-bid-amt">$${item.amt.toLocaleString()}</span>
          <span class="feed-time">${item.time}</span>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // COUNTDOWN & HAMMER ENGINE
  // ==========================================================================

  function startCountdownTimer() {
    if (STATE.timerInterval) clearInterval(STATE.timerInterval);

    STATE.timerInterval = setInterval(() => {
      const lot = STATE.lots[STATE.activeLotIndex];
      if (!lot.timerActive || lot.status === 'sold') return;

      lot.timeLeft--;

      // Update Radial SVG Progress
      const totalTime = lot.initialTime;
      const progress = Math.max(0, lot.timeLeft) / totalTime;
      const circumference = 2 * Math.PI * 42; // r=42 -> ~263.89
      const offset = circumference * (1 - progress);
      DOM.timerProgressCircle.style.strokeDashoffset = offset;

      DOM.countdownSeconds.textContent = Math.max(0, lot.timeLeft);

      // Warning color shifts
      if (lot.timeLeft <= 5) {
        DOM.timerProgressCircle.className = 'radial-progress urgent';
        DOM.gavelStageText.textContent = 'GOING TWICE...';
        DOM.gavelStageText.style.background = 'rgba(239, 68, 68, 0.2)';
        DOM.gavelStageText.style.color = 'var(--accent-crimson)';
        DOM.hammerStatusNotice.textContent = 'Fair Warning!';
        AudioEngine.playTick();
      } else if (lot.timeLeft <= 12) {
        DOM.timerProgressCircle.className = 'radial-progress warning';
        DOM.gavelStageText.textContent = 'GOING ONCE';
        DOM.gavelStageText.style.background = 'rgba(245, 158, 11, 0.2)';
        DOM.gavelStageText.style.color = 'var(--accent-amber)';
        DOM.hammerStatusNotice.textContent = 'Clock Ticking';
      } else {
        DOM.timerProgressCircle.className = 'radial-progress';
        DOM.gavelStageText.textContent = 'ACTIVE FLOOR';
        DOM.gavelStageText.style.background = 'rgba(16, 185, 129, 0.15)';
        DOM.gavelStageText.style.color = 'var(--accent-emerald)';
        DOM.hammerStatusNotice.textContent = 'Bidding Open';
      }

      // Hammer Strike at 0
      if (lot.timeLeft <= 0) {
        executeHammerDown(lot);
      }
    }, 1000);
  }

  function triggerGavelAnimation() {
    const icon = DOM.hammerIndicator.querySelector('.hammer-icon');
    if (icon) {
      icon.classList.remove('hammer-strike');
      void icon.offsetWidth; // trigger reflow
      icon.classList.add('hammer-strike');
    }
  }

  function executeHammerDown(lot) {
    lot.timerActive = false;
    lot.status = 'sold';
    triggerGavelAnimation();
    AudioEngine.playGavel();

    if (lot.highBidder.isUser) {
      // USER WON!
      lot.winner = STATE.user;
      STATE.user.wonLots.push(lot);
      STATE.user.balance -= lot.currentBid;
      updateWalletDisplay();
      updateWonLotsBadge();

      AudioEngine.playVictory();
      triggerConfetti();

      VoiceEngine.speak(`Hammer down! Sold to Paddle ${STATE.user.paddle} for ${lot.currentBid.toLocaleString()} dollars! Congratulations!`);

      appendBotMessage(`
        🎉 **HAMMER DOWN! SOLD TO YOU!**
        
        Tremendous congratulations, Sasikumar! You have successfully acquired **Lot #${lot.id}: ${lot.title}** for **$${lot.currentBid.toLocaleString()} USD**.
      `, {
        type: 'receipt',
        lot: lot,
        price: lot.currentBid
      });

    } else {
      // Competitor won
      VoiceEngine.speak(`Hammer down! Sold to ${lot.highBidder.name} for ${lot.currentBid.toLocaleString()} dollars.`);
      appendBotMessage(`
        🔨 **HAMMER DOWN: LOT CLOSED**
        
        Lot #${lot.id} is officially hammered down and sold to **${lot.highBidder.name}** at **$${lot.currentBid.toLocaleString()} USD**.
        
        Would you like to advance to the next lot in the catalog?
      `, {
        type: 'sold',
        lot: lot
      });
    }

    renderLotCarousel();
    renderActiveLot();
  }

  // Soft-close anti-sniping extension
  function applySoftCloseExtension(lot) {
    if (lot.timeLeft <= 10) {
      lot.timeLeft += 15;
      DOM.hammerStatusNotice.textContent = '+15s Extension!';
    }
  }

  // ==========================================================================
  // BIDDING LOGIC (USER & PROXY & RIVALS)
  // ==========================================================================

  function placeUserBid(amount) {
    const lot = STATE.lots[STATE.activeLotIndex];

    if (lot.status === 'sold') {
      appendBotMessage(`Bidding is already closed for **Lot #${lot.id}**. Would you like to switch to an upcoming lot?`);
      return false;
    }

    const minRequired = lot.currentBid + lot.increment;

    if (amount < minRequired) {
      appendBotMessage(`A bid of **$${amount.toLocaleString()}** is beneath the minimum requirement. The next valid bid must be at least **$${minRequired.toLocaleString()} USD** (+ $${lot.increment.toLocaleString()} increment).`);
      return false;
    }

    if (amount > STATE.user.balance) {
      appendBotMessage(`Insufficient credit line. Your verified balance is **$${STATE.user.balance.toLocaleString()}**, but this bid requires **$${amount.toLocaleString()}**. Click the **+ Deposit** button in the header to increase your credit.`);
      return false;
    }

    // Process valid user bid
    lot.currentBid = amount;
    lot.bidsCount++;
    lot.highBidder = { name: `${STATE.user.name} • Paddle ${STATE.user.paddle}`, isUser: true };
    applySoftCloseExtension(lot);

    AudioEngine.playBidChime();
    triggerGavelAnimation();
    addFeedItem('YOU (Winning!)', STATE.user.paddle, amount, true);
    renderActiveLot();
    SupabaseSync.recordBid(lot.id, STATE.user.name, STATE.user.paddle, amount, true);

    appendBotMessage(`
      ✨ **BID CONFIRMED: $${amount.toLocaleString()} USD**
      
      Your paddle **${STATE.user.paddle}** holds the floor! Current high bidder on **Lot #${lot.id}**.
    `, {
      type: 'bidSuccess',
      amount: amount,
      lot: lot
    });

    VoiceEngine.speak(`We have ${amount.toLocaleString()} dollars from Paddle ${STATE.user.paddle} on the floor!`);

    // Schedule simulated rival counter-bid
    scheduleRivalResponse(lot, amount);

    return true;
  }

  function scheduleRivalResponse(lot, userBidAmount) {
    // 70% chance a rival challenges if under estimated top tier
    if (userBidAmount > lot.estimateMax * 1.35) return;

    const delay = Math.floor(Math.random() * 2500) + 2000; // 2.0s - 4.5s
    setTimeout(() => {
      if (lot.status === 'sold' || !lot.highBidder.isUser) return;

      const rival = STATE.rivalBidders[Math.floor(Math.random() * STATE.rivalBidders.length)];
      const counterBid = userBidAmount + lot.increment;

      // Check if user has an AI proxy auto-bid configured
      if (STATE.user.activeAutoBidMax && STATE.user.activeAutoBidMax >= counterBid + lot.increment) {
        // Rival bids
        executeRivalBid(lot, rival, counterBid);

        // Immediate proxy response for user
        setTimeout(() => {
          if (lot.status === 'sold') return;
          const proxyBid = counterBid + lot.increment;
          if (proxyBid <= STATE.user.activeAutoBidMax && proxyBid <= STATE.user.balance) {
            lot.currentBid = proxyBid;
            lot.bidsCount++;
            lot.highBidder = { name: `${STATE.user.name} • Paddle ${STATE.user.paddle}`, isUser: true };
            applySoftCloseExtension(lot);

            AudioEngine.playBidChime();
            addFeedItem('YOU (Auto-Proxy)', STATE.user.paddle, proxyBid, true);
            renderActiveLot();

            appendBotMessage(`
              🤖 **AUTO-BID DEFENSE TRIGGERED**
              
              Rival ${rival.name} challenged at $${counterBid.toLocaleString()}, but your proxy automatically countered at **$${proxyBid.toLocaleString()} USD**! You remain in the lead.
            `);
            VoiceEngine.speak(`Auto-proxy counter-bid to ${proxyBid.toLocaleString()} dollars for Paddle ${STATE.user.paddle}!`);
          }
        }, 1200);

      } else {
        // Rival outbids user
        executeRivalBid(lot, rival, counterBid);
        AudioEngine.playOutbidWarning();

        appendBotMessage(`
          ⚠️ **OUTBID ON THE FLOOR!**
          
          **${rival.name}** (${rival.paddle}) just countered at **$${counterBid.toLocaleString()} USD**.
          
          The next required increment is **$${(counterBid + lot.increment).toLocaleString()} USD**. Would you like to raise your paddle?
        `, {
          type: 'outbid',
          rival: rival,
          nextBid: counterBid + lot.increment
        });

        VoiceEngine.speak(`Counter bid of ${counterBid.toLocaleString()} dollars received from ${rival.name}!`);
      }
    }, delay);
  }

  function executeRivalBid(lot, rival, amount) {
    lot.currentBid = amount;
    lot.bidsCount++;
    lot.highBidder = { name: `${rival.name} • Paddle ${rival.paddle}`, isUser: false };
    applySoftCloseExtension(lot);
    triggerGavelAnimation();
    AudioEngine.playGavel();
    addFeedItem(rival.name, rival.paddle, amount, false);
    renderActiveLot();
    SupabaseSync.recordBid(lot.id, rival.name, rival.paddle, amount, false);
  }

  // ==========================================================================
  // AUTO-BID PROXY TOGGLE
  // ==========================================================================

  function toggleAutoProxy() {
    if (STATE.user.activeAutoBidMax) {
      STATE.user.activeAutoBidMax = null;
      updateProxyDisplay();
      appendBotMessage(`🛡️ AI Auto-Proxy bidding has been **deactivated**. You have resumed manual paddle bidding.`);
    } else {
      const maxVal = parseFloat(DOM.proxyMaxInput.value);
      const lot = STATE.lots[STATE.activeLotIndex];
      const minRequired = lot.currentBid + lot.increment;

      if (!maxVal || maxVal < minRequired) {
        appendBotMessage(`Please enter a valid ceiling higher than **$${minRequired.toLocaleString()} USD** to activate Auto-Bid.`);
        return;
      }

      if (maxVal > STATE.user.balance) {
        appendBotMessage(`Your auto-bid limit cannot exceed your available credit line ($${STATE.user.balance.toLocaleString()}). Please deposit more funds or lower your limit.`);
        return;
      }

      STATE.user.activeAutoBidMax = maxVal;
      updateProxyDisplay();

      appendBotMessage(`
        🤖 **AI AUTO-BID ACTIVATED**
        
        Ceiling locked at **$${maxVal.toLocaleString()} USD** for Lot #${lot.id}. I will automatically defend your position in minimum increments whenever a rival raises against you.
      `);

      // If user isn't high bidder, immediately place minimum bid
      if (!lot.highBidder.isUser) {
        placeUserBid(minRequired);
      }
    }
  }

  function updateProxyDisplay() {
    if (STATE.user.activeAutoBidMax) {
      DOM.proxyStatusText.textContent = `Active: Up to $${STATE.user.activeAutoBidMax.toLocaleString()}`;
      DOM.proxyToggleBtn.textContent = 'Cancel Auto-Bid';
      DOM.proxyToggleBtn.classList.add('active');
    } else {
      DOM.proxyStatusText.textContent = 'Inactive (Max Limit: None)';
      DOM.proxyToggleBtn.textContent = 'Enable Auto-Bid';
      DOM.proxyToggleBtn.classList.remove('active');
    }
  }

  // ==========================================================================
  // WALLET & MODALS
  // ==========================================================================

  function updateWalletDisplay() {
    DOM.userBalanceDisplay.textContent = `$${STATE.user.balance.toLocaleString()}`;
  }

  function updateWonLotsBadge() {
    DOM.wonLotsCount.textContent = STATE.user.wonLots.length;
  }

  function renderWonLotsModal() {
    if (STATE.user.wonLots.length === 0) {
      DOM.wonLotsModalBody.innerHTML = `
        <div class="won-lots-empty">
          <p style="font-size:1.5rem; margin-bottom:8px;">🏛️</p>
          <p>No lots acquired yet this session.</p>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Place a bid and hold the floor until the hammer falls!</p>
        </div>
      `;
    } else {
      DOM.wonLotsModalBody.innerHTML = STATE.user.wonLots.map(lot => `
        <div class="won-lot-card">
          <img src="${lot.image}" alt="${lot.title}" class="won-lot-thumb">
          <div class="won-lot-details">
            <span style="font-size:0.65rem; color:var(--gold-light); font-weight:700">LOT #${lot.id}</span>
            <h4>${lot.title}</h4>
            <div class="won-lot-price">Hammer Price: $${lot.currentBid.toLocaleString()} USD</div>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">Certificate: ${lot.specs.authenticity}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // ==========================================================================
  // NATURAL LANGUAGE CHATBOT PROCESSING (AURELIUS)
  // ==========================================================================

  function renderWelcomeMessage() {
    const lot = STATE.lots[STATE.activeLotIndex];
    appendBotMessage(`
      Greetings, honored guest. I am **Aurelius**, your AI Master Auctioneer and Valuation Concierge.
      
      We are currently presiding over **Lot #${lot.id}: ${lot.title}**.
      
      You may issue commands such as:
      • *"Place next bid"* or *"Bid $55k"*
      • *"Set auto-bid to $75,000"*
      • *"Appraise this lot"* or *"Is it authentic?"*
      • *"Advise bidding strategy"*
      • *"Show buyer's premium and rules"*
      
      How may I direct your paddle today?
    `);
  }

  async function handleUserInput(userText) {
    if (!userText.trim()) return;

    appendUserMessage(userText);
    showTypingIndicator();

    // Persist user message to Supabase
    const activeLot = STATE.lots[STATE.activeLotIndex];
    SupabaseSync.recordChatMessage(activeLot.id, 'user', userText, STATE.settings.currentPersona);

    // If Gemini is active, consult Gemini AI!
    if (STATE.config.isGeminiConnected && STATE.config.geminiApiKey) {
      if (DOM.botStatusActivity) DOM.botStatusActivity.textContent = `Consulting Gemini AI (${STATE.config.geminiModel || '1.5-flash'})...`;
      
      const result = await GeminiChatEngine.queryGemini(userText.trim());
      removeTypingIndicator();
      if (DOM.botStatusActivity) DOM.botStatusActivity.textContent = 'Analyzing live market valuations...';

      if (result.success && result.reply) {
        let reply = result.reply;

        // Execute action tokens if returned by Gemini
        const bidMatch = reply.match(/\[ACTION:BID:(\d+)\]/i);
        if (bidMatch) {
          const amt = parseFloat(bidMatch[1]);
          reply = reply.replace(/\[ACTION:BID:\d+\]/gi, '').trim();
          if (amt > 0) placeUserBid(amt);
        }

        const autoMatch = reply.match(/\[ACTION:AUTOBID:(\d+)\]/i);
        if (autoMatch) {
          const cap = parseFloat(autoMatch[1]);
          reply = reply.replace(/\[ACTION:AUTOBID:\d+\]/gi, '').trim();
          if (DOM.proxyMaxInput) DOM.proxyMaxInput.value = cap;
          toggleAutoProxy();
        }

        const switchMatch = reply.match(/\[ACTION:SWITCH:(\w+)\]/i);
        if (switchMatch) {
          const lotId = switchMatch[1];
          reply = reply.replace(/\[ACTION:SWITCH:\w+\]/gi, '').trim();
          const targetIdx = STATE.lots.findIndex(l => l.id == lotId);
          if (targetIdx !== -1) switchLot(targetIdx);
        }

        appendBotMessage(reply);
        VoiceEngine.speak(reply.replace(/[*_#•]/g, '').slice(0, 160));
        SupabaseSync.recordChatMessage(activeLot.id, 'assistant', reply, STATE.settings.currentPersona);
        return;
      } else {
        console.warn('Gemini query fell back to local engine:', result.error);
      }
    }

    // Local heuristic engine fallback
    setTimeout(() => {
      removeTypingIndicator();
      processBotResponse(userText.trim());
    }, 600);
  }

  function processBotResponse(query) {
    const text = query.toLowerCase();
    const lot = STATE.lots[STATE.activeLotIndex];

    // 1. Natural Bidding Commands (e.g. "bid $55k", "place bid 60000", "+3k", "bid")
    if (text.startsWith('bid') || text.includes('place bid') || text.includes('raise') || text.includes('+')) {
      // Check for explicit amount in query
      const amountMatch = text.match(/\$?(\d+[\d,]*)\s*(k|thousand)?/i);
      if (amountMatch) {
        let rawNum = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (amountMatch[2] && amountMatch[2].toLowerCase().startsWith('k')) {
          rawNum *= 1000;
        }
        if (rawNum > 0) {
          placeUserBid(rawNum);
          return;
        }
      }

      // Default next bid
      const nextBid = lot.currentBid + lot.increment;
      placeUserBid(nextBid);
      return;
    }

    // 2. Auto-Bid / Proxy Commands
    if (text.includes('auto') || text.includes('proxy') || text.includes('cap') || text.includes('ceiling')) {
      if (text.includes('stop') || text.includes('cancel') || text.includes('off') || text.includes('disable')) {
        STATE.user.activeAutoBidMax = null;
        updateProxyDisplay();
        appendBotMessage(`🛡️ Auto-proxy has been disabled. You now control your paddle manually.`);
        return;
      }

      const numMatch = text.match(/\$?(\d+[\d,]*)\s*(k|thousand)?/i);
      if (numMatch) {
        let cap = parseFloat(numMatch[1].replace(/,/g, ''));
        if (numMatch[2] && numMatch[2].toLowerCase().startsWith('k')) cap *= 1000;
        DOM.proxyMaxInput.value = cap;
        toggleAutoProxy();
        return;
      }

      appendBotMessage(`To configure AI proxy bidding, specify your maximum ceiling. For instance: *"Set auto-bid to $80k"* or input your limit in the cockpit below.`);
      return;
    }

    // 3. Appraisal & Provenance & Authenticity
    if (text.includes('apprais') || text.includes('provenance') || text.includes('authentic') || text.includes('worth') || text.includes('estimate') || text.includes('condition')) {
      deliverAppraisalResponse(lot);
      return;
    }

    // 4. Strategic Advice & Competitor Intelligence
    if (text.includes('strateg') || text.includes('should i') || text.includes('who is winning') || text.includes('advice') || text.includes('competitor')) {
      deliverStrategyResponse(lot);
      return;
    }

    // 5. Lot Switching & Comparison
    if (text.includes('compare') || text.includes('all lots') || text.includes('catalog')) {
      deliverComparisonResponse();
      return;
    }

    if (text.includes('next lot') || text.includes('lot 2') || text.includes('emerald') || text.includes('102')) {
      switchLot(1);
      return;
    }
    if (text.includes('lot 3') || text.includes('hypercar') || text.includes('titanium') || text.includes('103')) {
      switchLot(2);
      return;
    }
    if (text.includes('lot 1') || text.includes('watch') || text.includes('patek') || text.includes('101')) {
      switchLot(0);
      return;
    }

    // 6. Balance / Wallet / Credit Line
    if (text.includes('balance') || text.includes('wallet') || text.includes('credit') || text.includes('money') || text.includes('deposit')) {
      appendBotMessage(`
        💳 **FINANCIAL PORTFOLIO STATUS**
        
        • **Verified Credit Line:** $${STATE.user.balance.toLocaleString()} USD
        • **Active Paddle:** ${STATE.user.paddle}
        • **Acquired Masterpieces:** ${STATE.user.wonLots.length} Lots
        
        Click the **+** icon beside your balance in the header or use the preset buttons to expand your credit line at any time.
      `);
      return;
    }

    // 7. Rules, Buyer's Premium, Logistics
    if (text.includes('rule') || text.includes('premium') || text.includes('fee') || text.includes('shipping') || text.includes('how does') || text.includes('sniping')) {
      appendBotMessage(`
        📜 **AURELIUS SALON GOVERNING TERMS**
        
        1. **Buyer’s Premium:** A standard 12% auction premium applies to the final hammer price upon closing.
        2. **Soft-Close Protocol:** To eliminate sniping, any bid lodged within the final 10 seconds automatically extends the countdown by +15 seconds.
        3. **Proxy Bidding:** Aurelius AI incrementally defends your position up to your specified ceiling, never overbidding the necessary increment.
        4. **Logistics:** Secure climate-controlled armored custody provided globally upon wire settlement.
      `);
      return;
    }

    // 8. Greetings & General Inquiries
    if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('who are you')) {
      appendBotMessage(`A pleasure to greet you, esteemed guest. I am **Aurelius**, presiding over today's high-stakes salon. Would you like me to appraise **Lot #${lot.id}**, or are you prepared to place the winning bid?`);
      return;
    }

    if (text.includes('thank') || text.includes('great') || text.includes('awesome') || text.includes('cool')) {
      appendBotMessage(`The pleasure is entirely mine. Discerning collectors deserve flawless execution. Let me know when you wish to strike next.`);
      return;
    }

    // Fallback: Smart context-aware response
    appendBotMessage(`
      Understood. We are actively focused on **Lot #${lot.id}: ${lot.title}** (current high bid: **$${lot.currentBid.toLocaleString()}**).
      
      You can command me to:
      • *"Place next bid ($${(lot.currentBid + lot.increment).toLocaleString()})"*
      • *"Appraise this piece"*
      • *"Advise strategy"*
      • *"Switch to Lot #102"*
    `);
  }

  function deliverAppraisalResponse(lot) {
    const persona = STATE.settings.currentPersona;
    let personaFlavor = '';

    if (persona === 'advisor') {
      personaFlavor = `**Advisory Perspective:** This asset displays strong capital preservation characteristics with a historical 3-year yield of ${lot.specs.historicalTrend}. Its low correlation to public equity makes it an exceptional physical hedge.`;
    } else if (persona === 'aggressive') {
      personaFlavor = `**Trader Alert:** Heavy interest building on the floor! Once this crosses $${(lot.estimateMin*1.1).toLocaleString()}, secondary market scarcity will drive rapid premium expansion. Don't hesitate!`;
    } else {
      personaFlavor = `**Auctioneer Note:** An extraordinary artifact of rare pedigree. ${lot.specs.curatorNote}`;
    }

    appendBotMessage(`
      🔍 **CURATORIAL APPRAISAL DOSSIER: LOT #${lot.id}**
      
      • **Title:** ${lot.title}
      • **Category:** ${lot.category}
      • **Estimate Range:** $${lot.estimateMin.toLocaleString()} – $${lot.estimateMax.toLocaleString()} USD
      • **Certification:** ${lot.specs.authenticity}
      • **Condition Rating:** ${lot.specs.condition}
      • **Appreciation Trend:** ${lot.specs.historicalTrend}
      
      ${personaFlavor}
    `, {
      type: 'appraisal',
      lot: lot
    });

    VoiceEngine.speak(`Appraisal report for Lot ${lot.id}. Estimate between ${lot.estimateMin.toLocaleString()} and ${lot.estimateMax.toLocaleString()} dollars. Certified authentic.`);
  }

  function deliverStrategyResponse(lot) {
    const leader = lot.highBidder;
    const nextBid = lot.currentBid + lot.increment;

    if (leader.isUser) {
      appendBotMessage(`
        🎯 **TACTICAL ADVISORY: YOU HOLD THE HIGH GROUND**
        
        You currently possess the leading bid at **$${lot.currentBid.toLocaleString()}**.
        
        **Recommendations:**
        1. **Hold Paddle:** Refrain from bidding against yourself.
        2. **Prepare Counter:** If challenged, immediately return with a fast counter-bid (+1 increment) to project absolute conviction and dissuade rival bidders.
        3. **Set Proxy Shield:** Alternatively, activate Auto-Bid with a limit around $${(lot.currentBid + lot.increment * 3).toLocaleString()}.
      `);
    } else {
      appendBotMessage(`
        🎯 **TACTICAL ADVISORY: INITIATIVE REQUIRED**
        
        Floor rival **${leader.name}** holds the hammer at **$${lot.currentBid.toLocaleString()}**.
        
        **Recommendations:**
        1. **Pacing:** A brisk raise to **$${nextBid.toLocaleString()}** demonstrates momentum and challenges their psychological ceiling.
        2. **Market Position:** Current price remains well within the fair valuation band ($${lot.estimateMin.toLocaleString()} – $${lot.estimateMax.toLocaleString()}).
        3. **Execution:** Click *"Place Next Bid"* now or type *"bid ${nextBid}"*.
      `, {
        type: 'action',
        actionCmd: `bid ${nextBid}`,
        actionLabel: `Place Next Bid ($${nextBid.toLocaleString()})`
      });
    }
  }

  function deliverComparisonResponse() {
    appendBotMessage(`
      ⚖️ **SALON LOT COMPARISON MATRIX**
      
      1. **Lot #101: 1968 Patek Celestial Tourbillon**
         • Bid: $${STATE.lots[0].currentBid.toLocaleString()} • Status: ${STATE.lots[0].status.toUpperCase()}
         • Appeal: Blue-chip vintage horology with archival pedigree.
      
      2. **Lot #102: Imperial Muzo Emerald Pendant (42.6ct)**
         • Bid: $${STATE.lots[1].currentBid.toLocaleString()} • Status: ${STATE.lots[1].status.toUpperCase()}
         • Appeal: Ultra-rare royal Colombian gemstone with dual Swiss certifications.
      
      3. **Lot #103: Apex Chiron 1:8 Titanium Hypercar**
         • Bid: $${STATE.lots[2].currentBid.toLocaleString()} • Status: ${STATE.lots[2].status.toUpperCase()}
         • Appeal: One-off aerodynamic prototype for concept motoring connoisseurs.
      
      Say *"switch to lot [1/2/3]"* to navigate directly.
    `);
  }

  // ==========================================================================
  // CHAT RENDERING HELPERS
  // ==========================================================================

  function appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg user';
    msg.innerHTML = `
      <div class="msg-header">
        <span>YOU (Paddle ${STATE.user.paddle})</span>
      </div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
    DOM.chatMessagesContainer.appendChild(msg);
    scrollChatToBottom();
  }

  function appendBotMessage(markdownText, extraCard = null) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg bot';

    let cardHtml = '';
    if (extraCard) {
      if (extraCard.type === 'receipt') {
        cardHtml = `
          <div class="chat-card">
            <div class="chat-card-title">🏆 OFFICIAL ACQUISITION INVOICE</div>
            <div class="chat-card-row">
              <span class="chat-card-label">Item:</span>
              <span class="chat-card-value">${extraCard.lot.title}</span>
            </div>
            <div class="chat-card-row">
              <span class="chat-card-label">Hammer Price:</span>
              <span class="chat-card-value text-gold">$${extraCard.price.toLocaleString()} USD</span>
            </div>
            <div class="chat-card-row">
              <span class="chat-card-label">Acquired By:</span>
              <span class="chat-card-value">Sasikumar (${STATE.user.paddle})</span>
            </div>
            <div class="chat-card-actions">
              <button class="card-action-btn" onclick="document.getElementById('wonLotsBtn').click()">View Inventory</button>
            </div>
          </div>
        `;
      } else if (extraCard.type === 'bidSuccess') {
        cardHtml = `
          <div class="chat-card">
            <div class="chat-card-title">⚡ OFFICIAL BID REGISTRY</div>
            <div class="chat-card-row">
              <span class="chat-card-label">Registered Amount:</span>
              <span class="chat-card-value text-emerald" style="color:var(--accent-emerald)">$${extraCard.amount.toLocaleString()} USD</span>
            </div>
            <div class="chat-card-row">
              <span class="chat-card-label">Status:</span>
              <span class="chat-card-value">LEADING ON THE FLOOR ✓</span>
            </div>
          </div>
        `;
      } else if (extraCard.type === 'outbid') {
        cardHtml = `
          <div class="chat-card">
            <div class="chat-card-title">⚡ QUICK RETALIATION</div>
            <div class="chat-card-actions">
              <button class="card-action-btn" onclick="window.AureliusApp.placeBid(${extraCard.nextBid})">
                Raise to $${extraCard.nextBid.toLocaleString()}
              </button>
            </div>
          </div>
        `;
      } else if (extraCard.type === 'action') {
        cardHtml = `
          <div class="chat-card">
            <div class="chat-card-actions">
              <button class="card-action-btn" onclick="window.AureliusApp.executeCmd('${extraCard.actionCmd}')">
                ${extraCard.actionLabel}
              </button>
            </div>
          </div>
        `;
      } else if (extraCard.type === 'appraisal') {
        cardHtml = `
          <div class="chat-card">
            <div class="chat-card-actions">
              <button class="card-action-btn" onclick="window.AureliusApp.placeBid(${extraCard.lot.currentBid + extraCard.lot.increment})">
                Bid $${(extraCard.lot.currentBid + extraCard.lot.increment).toLocaleString()}
              </button>
              <button class="card-action-btn" style="background:rgba(255,255,255,0.1); color:#fff;" onclick="window.AureliusApp.executeCmd('strategy')">
                Strategy
              </button>
            </div>
          </div>
        `;
      }
    }

    msg.innerHTML = `
      <div class="msg-header">
        <span>AURELIUS • AI CONCIERGE</span>
      </div>
      <div class="msg-bubble">
        ${formatMarkdown(markdownText)}
        ${cardHtml}
      </div>
    `;

    DOM.chatMessagesContainer.appendChild(msg);
    scrollChatToBottom();
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    const ind = document.createElement('div');
    ind.id = 'typingIndicator';
    ind.className = 'chat-msg bot';
    ind.innerHTML = `
      <div class="typing-indicator-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    DOM.chatMessagesContainer.appendChild(ind);
    scrollChatToBottom();
  }

  function removeTypingIndicator() {
    const ind = document.getElementById('typingIndicator');
    if (ind) ind.remove();
  }

  function scrollChatToBottom() {
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatMarkdown(text) {
    // Basic format: bold, lists, code
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n•\s*(.*?)(?=\n|$)/g, '<br>• $1');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  // ==========================================================================
  // CONFETTI CELEBRATION EFFECT
  // ==========================================================================

  function triggerConfetti() {
    const canvas = DOM.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#d4af37', '#f5e296', '#00e5ff', '#ffffff', '#10b981'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.8) * 16,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      frame++;
      if (alive && frame < 180) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    requestAnimationFrame(animate);
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  function bindEvents() {
    // Quick bid button
    DOM.quickBidBtn.addEventListener('click', () => {
      const lot = STATE.lots[STATE.activeLotIndex];
      const nextBid = lot.currentBid + lot.increment;
      placeUserBid(nextBid);
    });

    // Custom bid submission
    DOM.customBidBtn.addEventListener('click', () => {
      const val = parseFloat(DOM.customBidInput.value);
      if (val) {
        if (placeUserBid(val)) {
          DOM.customBidInput.value = '';
        }
      }
    });

    DOM.customBidInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        DOM.customBidBtn.click();
      }
    });

    // Auto-Proxy Button
    DOM.proxyToggleBtn.addEventListener('click', toggleAutoProxy);

    // Supplementary tabs switching
    DOM.subTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.subTabBtns.forEach(b => b.classList.remove('active'));
        DOM.tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.add('active');
      });
    });

    // Chat submit
    DOM.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = DOM.chatInput.value.trim();
      if (val) {
        DOM.chatInput.value = '';
        handleUserInput(val);
      }
    });

    // Chat suggestions clicks
    DOM.chatSuggestionsBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (chip) {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) {
          handleUserInput(cmd);
        }
      }
    });

    // Voice Input Toggle (Web Speech Recognition)
    DOM.voiceInputBtn.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        appendBotMessage(`Voice recognition is not supported in this browser. Please type your command into the prompt.`);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      DOM.voiceInputBtn.classList.add('listening');
      DOM.botStatusActivity.textContent = 'Listening to your voice command...';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        DOM.chatInput.value = transcript;
        DOM.voiceInputBtn.classList.remove('listening');
        DOM.botStatusActivity.textContent = 'Analyzing live market valuations...';
        handleUserInput(transcript);
      };

      recognition.onerror = () => {
        DOM.voiceInputBtn.classList.remove('listening');
        DOM.botStatusActivity.textContent = 'Analyzing live market valuations...';
      };

      recognition.onend = () => {
        DOM.voiceInputBtn.classList.remove('listening');
        DOM.botStatusActivity.textContent = 'Analyzing live market valuations...';
      };

      recognition.start();
    });

    // Persona switch
    DOM.personaSelect.addEventListener('change', (e) => {
      STATE.settings.currentPersona = e.target.value;
      const titles = {
        auctioneer: '🎩 Grand Auctioneer',
        advisor: '💼 Wealth & Art Advisor',
        aggressive: '⚡ Aggressive Floor Trader'
      };
      appendBotMessage(`Persona adjusted to **${titles[e.target.value]}**. Dialogue and guidance will reflect this disposition.`);
    });

    // Sound FX Toggle
    DOM.sfxToggleBtn.addEventListener('click', () => {
      STATE.settings.sfxEnabled = !STATE.settings.sfxEnabled;
      DOM.sfxToggleBtn.classList.toggle('active', STATE.settings.sfxEnabled);
      if (STATE.settings.sfxEnabled) AudioEngine.playBidChime();
    });

    // TTS Voice Toggle
    DOM.ttsToggleBtn.addEventListener('click', () => {
      STATE.settings.ttsEnabled = !STATE.settings.ttsEnabled;
      DOM.ttsToggleBtn.classList.toggle('active', STATE.settings.ttsEnabled);
      if (STATE.settings.ttsEnabled) VoiceEngine.speak("Auctioneer voice enabled.");
    });

    // Won Lots Modal
    DOM.wonLotsBtn.addEventListener('click', () => {
      renderWonLotsModal();
      DOM.wonLotsModal.hidden = false;
    });
    DOM.closeWonLotsBtn.addEventListener('click', () => {
      DOM.wonLotsModal.hidden = true;
    });

    // Add Funds Modal
    DOM.addFundsBtn.addEventListener('click', () => {
      DOM.fundsModal.hidden = false;
    });
    DOM.closeFundsBtn.addEventListener('click', () => {
      DOM.fundsModal.hidden = true;
    });
    DOM.presetFundBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = parseFloat(btn.getAttribute('data-amt'));
        STATE.user.balance += amt;
        updateWalletDisplay();
        AudioEngine.playBidChime();
        DOM.fundsModal.hidden = true;
        appendBotMessage(`💳 Deposited **+$${amt.toLocaleString()} USD** to your verified bidding credit line. Current balance: **$${STATE.user.balance.toLocaleString()} USD**.`);
      });
    });

    // Cloud Settings Modal Toggles
    const openSettings = (tab = 'geminiTab') => {
      if (DOM.settingsModal) DOM.settingsModal.hidden = false;
      switchSettingsTab(tab);
    };

    DOM.settingsToggleBtn?.addEventListener('click', () => openSettings());
    DOM.geminiPillBtn?.addEventListener('click', () => openSettings('geminiTab'));
    DOM.supabasePillBtn?.addEventListener('click', () => openSettings('supabaseTab'));
    DOM.closeSettingsBtn?.addEventListener('click', () => { if (DOM.settingsModal) DOM.settingsModal.hidden = true; });
    DOM.cancelSettingsBtn?.addEventListener('click', () => { if (DOM.settingsModal) DOM.settingsModal.hidden = true; });

    function switchSettingsTab(tabId) {
      if (!DOM.settingsNavBtns || !DOM.settingsTabPanes) return;
      DOM.settingsNavBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      });
      DOM.settingsTabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
      });
    }

    DOM.settingsNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchSettingsTab(btn.getAttribute('data-tab'));
      });
    });

    // Toggle key visibility
    DOM.toggleGeminiKeyVis?.addEventListener('click', () => {
      if (DOM.geminiApiKeyInput) {
        DOM.geminiApiKeyInput.type = DOM.geminiApiKeyInput.type === 'password' ? 'text' : 'password';
      }
    });

    DOM.toggleSupabaseKeyVis?.addEventListener('click', () => {
      if (DOM.supabaseAnonKeyInput) {
        DOM.supabaseAnonKeyInput.type = DOM.supabaseAnonKeyInput.type === 'password' ? 'text' : 'password';
      }
    });

    // Test Gemini Connection
    DOM.testGeminiBtn?.addEventListener('click', () => {
      const key = DOM.geminiApiKeyInput ? DOM.geminiApiKeyInput.value.trim() : '';
      const model = DOM.geminiModelSelect ? DOM.geminiModelSelect.value : 'gemini-1.5-flash';
      CloudManager.testGemini(key, model);
    });

    // Test Supabase Connection
    DOM.testSupabaseBtn?.addEventListener('click', () => {
      const url = DOM.supabaseUrlInput ? DOM.supabaseUrlInput.value.trim() : '';
      const key = DOM.supabaseAnonKeyInput ? DOM.supabaseAnonKeyInput.value.trim() : '';
      CloudManager.testSupabase(url, key);
    });

    // Copy SQL Schema
    DOM.copySchemaBtn?.addEventListener('click', async () => {
      try {
        const res = await fetch('supabase_schema.sql');
        const sqlText = res.ok ? await res.text() : '-- Run supabase_schema.sql from project root';
        await navigator.clipboard.writeText(sqlText);
        if (DOM.supabaseTestFeedback) {
          DOM.supabaseTestFeedback.textContent = '📋 SQL Schema copied to clipboard! Paste it into Supabase Dashboard -> SQL Editor.';
          DOM.supabaseTestFeedback.className = 'test-feedback success';
        }
      } catch (err) {
        if (DOM.supabaseTestFeedback) {
          DOM.supabaseTestFeedback.textContent = 'Please view and copy supabase_schema.sql from your project folder.';
          DOM.supabaseTestFeedback.className = 'test-feedback';
        }
      }
    });

    // Sync Lots to Supabase
    DOM.syncLotsToSupabaseBtn?.addEventListener('click', () => {
      SupabaseSync.syncAllLotsToSupabase();
    });

    // Save and Clear Settings
    DOM.saveSettingsBtn?.addEventListener('click', () => {
      CloudManager.saveSettings();
    });

    DOM.clearConfigBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your stored Gemini and Supabase keys?')) {
        CloudManager.clearSettings();
      }
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
      if (e.target === DOM.wonLotsModal) DOM.wonLotsModal.hidden = true;
      if (e.target === DOM.fundsModal) DOM.fundsModal.hidden = true;
      if (e.target === DOM.settingsModal) DOM.settingsModal.hidden = true;
    });

    // Resize canvas on window resize
    window.addEventListener('resize', () => {
      DOM.confettiCanvas.width = window.innerWidth;
      DOM.confettiCanvas.height = window.innerHeight;
    });
  }

  // Expose global methods for inline card action handlers
  window.AureliusApp = {
    placeBid: placeUserBid,
    executeCmd: handleUserInput,
    switchLot: switchLot
  };

  // Launch application
  document.addEventListener('DOMContentLoaded', init);
})();
