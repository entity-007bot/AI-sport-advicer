import { GoogleGenAI } from "@google/genai";

const app = {
    currentUser: null,
    teams: [],
    history: [],
    currentMatch: { home: null, away: null },
    editingTeamId: null,

    // --- Initialization ---
    init() {
        this.auth.checkSession();
        this.ui.init();
    },

    // --- Authentication System ---
    auth: {
        register() {
            const user = (document.getElementById('reg-username') as HTMLInputElement).value.trim();
            const pass = (document.getElementById('reg-password') as HTMLInputElement).value.trim();

            if (!user || !pass) return (app.ui as any).toast('Please fill all fields');

            const users = JSON.parse(localStorage.getItem('elite_users') || '[]');
            if (users.find((u: any) => u.username === user)) return (app.ui as any).toast('Username already exists');

            users.push({ username: user, password: pass });
            localStorage.setItem('elite_users', JSON.stringify(users));
            (app.ui as any).toast('Account created! Please login.');
            (app.ui as any).toggleAuth(true);
        },

        login() {
            const user = (document.getElementById('login-username') as HTMLInputElement).value.trim();
            const pass = (document.getElementById('login-password') as HTMLInputElement).value.trim();

            if (!user || !pass) return (app.ui as any).toast('Please fill all fields');

            const users = JSON.parse(localStorage.getItem('elite_users') || '[]');
            const found = users.find((u: any) => u.username === user && u.password === pass);

            if (!found) return (app.ui as any).toast('Invalid credentials');

            localStorage.setItem('elite_session', user);
            app.auth.checkSession();
            (app.ui as any).toast('Welcome back, ' + user);
        },

        logout() {
            localStorage.removeItem('elite_session');
            location.reload();
        },

        deleteAccount() {
            if (!confirm('Are you sure? This will delete all your data.')) return;
            const users = JSON.parse(localStorage.getItem('elite_users') || '[]');
            const filtered = users.filter((u: any) => u.username !== app.currentUser);
            localStorage.setItem('elite_users', JSON.stringify(filtered));
            
            // Clear user data
            localStorage.removeItem(`elite_teams_${app.currentUser}`);
            localStorage.removeItem(`elite_history_${app.currentUser}`);
            
            this.logout();
        },

        checkSession() {
            const session = localStorage.getItem('elite_session');
            if (session) {
                app.currentUser = session as any;
                document.getElementById('auth-container')!.classList.add('hidden');
                document.getElementById('dashboard-container')!.classList.remove('hidden');
                document.getElementById('current-user-display')!.textContent = session;
                document.getElementById('settings-username')!.textContent = session;
                app.db.loadData();
            } else {
                document.getElementById('auth-container')!.classList.remove('hidden');
                document.getElementById('dashboard-container')!.classList.add('hidden');
            }
        }
    },

    // --- Database Management ---
    db: {
        loadData() {
            app.teams = JSON.parse(localStorage.getItem(`elite_teams_${app.currentUser}`) || '[]');
            app.history = JSON.parse(localStorage.getItem(`elite_history_${app.currentUser}`) || '[]');
            app.ui.renderTeams();
            app.ui.updateSelectors();
            app.ui.renderHistory();
            app.ui.updateStats();
        },

        saveTeam() {
            const name = (document.getElementById('team-name') as HTMLInputElement).value.trim();
            if (!name) return (app.ui as any).toast('Team name is required');

            const teamData = {
                name,
                played: parseInt((document.getElementById('team-played') as HTMLInputElement).value) || 0,
                wins: parseInt((document.getElementById('team-wins') as HTMLInputElement).value) || 0,
                draws: parseInt((document.getElementById('team-draws') as HTMLInputElement).value) || 0,
                losses: parseInt((document.getElementById('team-losses') as HTMLInputElement).value) || 0,
                scored: parseInt((document.getElementById('team-scored') as HTMLInputElement).value) || 0,
                conceded: parseInt((document.getElementById('team-conceded') as HTMLInputElement).value) || 0,
                homeAvg: parseFloat((document.getElementById('team-home-avg') as HTMLInputElement).value) || 0,
                awayAvg: parseFloat((document.getElementById('team-away-avg') as HTMLInputElement).value) || 0,
                clean: parseInt((document.getElementById('team-clean') as HTMLInputElement).value) || 0,
                btts: parseInt((document.getElementById('team-btts') as HTMLInputElement).value) || 0
            };

            if (app.editingTeamId) {
                const index = app.teams.findIndex((t: any) => t.id === app.editingTeamId);
                if (index !== -1) {
                    app.teams[index] = { ...app.teams[index], ...teamData };
                    (app.ui as any).toast('Team updated successfully');
                }
                app.editingTeamId = null;
            } else {
                const team = {
                    id: Date.now(),
                    ...teamData
                };
                (app.teams as any).push(team);
                (app.ui as any).toast('Team saved to database');
            }

            localStorage.setItem(`elite_teams_${app.currentUser}`, JSON.stringify(app.teams));
            this.loadData();
            this.cancelEdit();
        },

        editTeam(id: number) {
            const team = app.teams.find((t: any) => t.id === id);
            if (!team) return;

            app.editingTeamId = id as any;
            document.getElementById('team-form-title')!.textContent = 'Edit Team: ' + (team as any).name;
            document.getElementById('save-team-btn')!.textContent = 'Update Team Data';
            document.getElementById('cancel-edit-btn')!.classList.remove('hidden');

            (document.getElementById('team-name') as HTMLInputElement).value = (team as any).name;
            (document.getElementById('team-played') as HTMLInputElement).value = (team as any).played;
            (document.getElementById('team-wins') as HTMLInputElement).value = (team as any).wins;
            (document.getElementById('team-draws') as HTMLInputElement).value = (team as any).draws;
            (document.getElementById('team-losses') as HTMLInputElement).value = (team as any).losses;
            (document.getElementById('team-scored') as HTMLInputElement).value = (team as any).scored;
            (document.getElementById('team-conceded') as HTMLInputElement).value = (team as any).conceded;
            (document.getElementById('team-home-avg') as HTMLInputElement).value = (team as any).homeAvg;
            (document.getElementById('team-away-avg') as HTMLInputElement).value = (team as any).awayAvg;
            (document.getElementById('team-clean') as HTMLInputElement).value = (team as any).clean;
            (document.getElementById('team-btts') as HTMLInputElement).value = (team as any).btts;

            app.ui.switchTab('teams');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        cancelEdit() {
            app.editingTeamId = null;
            document.getElementById('team-form-title')!.textContent = 'Add New Team';
            document.getElementById('save-team-btn')!.textContent = 'Save Team to Database';
            document.getElementById('cancel-edit-btn')!.classList.add('hidden');
            
            // Reset form
            document.querySelectorAll('#tab-teams input').forEach(i => (i as HTMLInputElement).value = (i as HTMLInputElement).type === 'number' ? '0' : '');
        },

        handleFileUpload(event: any) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e: any) => this.processImportData(e.target.result);
            reader.readAsText(file);
        },

        importFromPaste() {
            const data = (document.getElementById('import-paste') as HTMLTextAreaElement).value.trim();
            if (!data) return (app.ui as any).toast('Please paste some data first');
            this.processImportData(data);
        },

        processImportData(rawText: string) {
            try {
                // Clean brackets if they wrap the whole content or individual lines
                let cleanText = rawText.trim();
                if (cleanText.startsWith('(') && cleanText.endsWith(')')) {
                    cleanText = cleanText.substring(1, cleanText.length - 1).trim();
                }
                
                // Also handle cases where each line might have brackets or the header is weird
                const lines = cleanText.split(/\r?\n/)
                    .map(l => l.trim().replace(/^\(|\)$/g, ''))
                    .filter(l => l.length > 0);

                if (lines.length < 1) throw new Error('No data found');

                const firstLine = lines[0];
                let delimiter = ',';
                if (firstLine.includes('\t')) delimiter = '\t';
                else if (firstLine.includes(';')) delimiter = ';';

                const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
                
                const mapping: any = {
                    'team': ['team', 'club', 'name'],
                    'played': ['mp', 'p', 'played', 'matches'],
                    'wins': ['w', 'wins', 'won'],
                    'draws': ['d', 'draws', 'drawn'],
                    'losses': ['l', 'losses', 'lost'],
                    'scored': ['gf', 'scored', 'goals for', 'goals scored'],
                    'conceded': ['ga', 'conceded', 'goals against']
                };

                const findIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

                const colMap = {
                    name: findIndex(mapping.team),
                    played: findIndex(mapping.played),
                    wins: findIndex(mapping.wins),
                    draws: findIndex(mapping.draws),
                    losses: findIndex(mapping.losses),
                    scored: findIndex(mapping.scored),
                    conceded: findIndex(mapping.conceded)
                };

                if (colMap.name === -1) throw new Error('Could not find "Team" column');

                let importedCount = 0;
                const startIndex = headers.includes('team') || headers.includes('mp') ? 1 : 0;

                for (let i = startIndex; i < lines.length; i++) {
                    const cols = lines[i].split(delimiter).map(c => c.trim());
                    if (cols.length < 2) continue;

                    const name = cols[colMap.name];
                    if (!name) continue;

                    if (app.teams.find((t: any) => t.name.toLowerCase() === name.toLowerCase())) continue;

                    const played = parseInt(cols[colMap.played]) || 0;
                    const scored = parseInt(cols[colMap.scored]) || 0;
                    const conceded = parseInt(cols[colMap.conceded]) || 0;

                    const team = {
                        id: Date.now() + i,
                        name: name,
                        played: played,
                        wins: parseInt(cols[colMap.wins]) || 0,
                        draws: parseInt(cols[colMap.draws]) || 0,
                        losses: parseInt(cols[colMap.losses]) || 0,
                        scored: scored,
                        conceded: conceded,
                        homeAvg: played > 0 ? parseFloat((scored / played).toFixed(1)) : 0,
                        awayAvg: played > 0 ? parseFloat((scored / played).toFixed(1)) : 0,
                        clean: 0,
                        btts: 50
                    };

                    (app.teams as any).push(team);
                    importedCount++;
                }

                if (importedCount > 0) {
                    localStorage.setItem(`elite_teams_${app.currentUser}`, JSON.stringify(app.teams));
                    app.db.loadData();
                    (app.ui as any).toast(`Successfully imported ${importedCount} teams`);
                    (document.getElementById('import-paste') as HTMLTextAreaElement).value = '';
                } else {
                    (app.ui as any).toast('No new teams were imported');
                }

            } catch (err: any) {
                console.error(err);
                (app.ui as any).toast('Import failed: ' + err.message);
            }
        },

        deleteTeam(id: number) {
            app.teams = app.teams.filter((t: any) => t.id !== id);
            localStorage.setItem(`elite_teams_${app.currentUser}`, JSON.stringify(app.teams));
            this.loadData();
        },

        savePrediction(type: string, result: string) {
            if (!app.currentMatch.home || !app.currentMatch.away) return;
            const entry = {
                id: Date.now(),
                match: `${(app.currentMatch.home as any).name} vs ${(app.currentMatch.away as any).name}`,
                type,
                result,
                date: new Date().toLocaleDateString()
            };
            app.history.unshift(entry as any);
            localStorage.setItem(`elite_history_${app.currentUser}`, JSON.stringify(app.history));
            app.ui.renderHistory();
        },

        clearHistory() {
            if (!confirm('Clear all history?')) return;
            app.history = [];
            localStorage.setItem(`elite_history_${app.currentUser}`, JSON.stringify(app.history));
            app.ui.renderHistory();
        }
    },

    // --- Analytics Engine ---
    analytics: {
        poisson(k: number, lambda: number) {
            const factorial = (n: number): number => {
                let res = 1;
                for (let i = 2; i <= n; i++) res *= i;
                return res;
            };
            return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
        },

        calculateRatings(team: any) {
            const played = team.played || 1;
            const atk = (team.scored / played) * 20; // Scale to 100
            const def = 100 - ((team.conceded / played) * 20);
            const winRate = (team.wins / played) * 100;
            
            let form = 'C';
            if (winRate > 70) form = 'A+';
            else if (winRate > 60) form = 'A';
            else if (winRate > 50) form = 'B';
            else if (winRate > 40) form = 'B-';

            return { 
                atk: Math.min(100, Math.max(10, parseFloat(atk.toFixed(1)))), 
                def: Math.min(100, Math.max(10, parseFloat(def.toFixed(1)))), 
                form 
            };
        },

        getWinProbabilities(h: any, a: any) {
            const xgH = parseFloat(h.homeAvg) + (a.conceded / (a.played || 1));
            const xgA = parseFloat(a.awayAvg) + (h.conceded / (h.played || 1));

            let hProb = 0, aProb = 0, dProb = 0;
            const maxGoals = 8;

            for (let i = 0; i <= maxGoals; i++) {
                for (let j = 0; j <= maxGoals; j++) {
                    const pI = this.poisson(i, xgH);
                    const pJ = this.poisson(j, xgA);
                    const pScore = pI * pJ;

                    if (i > j) hProb += pScore;
                    else if (i < j) aProb += pScore;
                    else dProb += pScore;
                }
            }

            const total = hProb + aProb + dProb || 1;
            return {
                h: Math.round((hProb / total) * 100),
                d: Math.round((dProb / total) * 100),
                a: Math.round((aProb / total) * 100)
            };
        },

        getOverUnder(h: any, a: any) {
            const xgTotal = (parseFloat(h.homeAvg) + (a.conceded / (a.played || 1))) + 
                            (parseFloat(a.awayAvg) + (h.conceded / (h.played || 1)));
            
            const results = [];
            for (let line = 0.5; line <= 5.5; line++) {
                let probUnder = 0;
                for (let k = 0; k < line; k++) {
                    probUnder += this.poisson(k, xgTotal);
                }
                results.push({
                    line: line.toFixed(1),
                    over: Math.round((1 - probUnder) * 100),
                    under: Math.round(probUnder * 100)
                });
            }
            return results;
        },

        getGGProb(h: any, a: any) {
            const xgH = parseFloat(h.homeAvg) + (a.conceded / (a.played || 1));
            const xgA = parseFloat(a.awayAvg) + (h.conceded / (h.played || 1));
            
            const probHScoring = 1 - this.poisson(0, xgH);
            const probAScoring = 1 - this.poisson(0, xgA);
            
            const gg = Math.round((probHScoring * probAScoring) * 100);
            return { gg: gg, ng: 100 - gg };
        },

        getScores(h: any, a: any) {
            const xgH = (parseFloat(h.homeAvg) + (a.conceded / (a.played || 1))) / 2;
            const xgA = (parseFloat(a.awayAvg) + (h.conceded / (h.played || 1))) / 2;
            
            const scores = [];
            for (let i = 0; i <= 5; i++) {
                for (let j = 0; j <= 5; j++) {
                    const prob = this.poisson(i, xgH) * this.poisson(j, xgA);
                    scores.push({ s: `${i}-${j}`, p: parseFloat((prob * 100).toFixed(2)) });
                }
            }
            return scores.sort((a, b) => b.p - a.p).slice(0, 5);
        },

        async getAIInsights(h: any, a: any) {
            const prompt = `Perform a high-precision tactical analysis for ${h.name} (Home) vs ${a.name} (Away). 
            1. Use the search tool to verify the LATEST team news, including confirmed injuries, suspensions, and recent match results from the last 48 hours.
            2. Analyze head-to-head history and tactical matchups (e.g., high press vs counter-attack).
            3. Provide 3 factual tactical insights.
            4. State the calculated probability for Home Win, Draw, and Away Win based on your findings.
            5. Provide a final expert verdict.
            
            Return ONLY a JSON object with this structure:
            {
                "insights": ["insight 1", "insight 2", "insight 3"],
                "probabilities": {"home": "XX%", "draw": "XX%", "away": "XX%"},
                "verdict": "Detailed verdict here"
            }`;

            try {
                const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: prompt,
                    config: {
                        systemInstruction: "You are a professional football analyst and data scientist. Your goal is to provide 100% factually accurate insights based on real-time data.",
                        tools: [{ googleSearch: {} }],
                        responseMimeType: "application/json"
                    }
                });
                return JSON.parse(response.text!);
            } catch (err) {
                console.error("AI Insight Error:", err);
                return { 
                    insights: ["Unable to fetch real-time news. Analysis based on database stats only."], 
                    probabilities: {"home": "N/A", "draw": "N/A", "away": "N/A"},
                    verdict: "Manual verification of team news is recommended." 
                };
            }
        }
    },

    // --- UI Manager ---
    ui: {
        init() {
            // Global click listeners for navigation
        },

        toggleAuth(isLogin: boolean) {
            document.getElementById('login-form')!.classList.toggle('hidden', !isLogin);
            document.getElementById('register-form')!.classList.toggle('hidden', isLogin);
        },

        switchTab(tabId: string) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
            document.getElementById(`tab-${tabId}`)!.classList.remove('hidden');
            
            document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(n => n.classList.remove('active'));
            const navs = document.querySelectorAll('.nav-item, .mobile-nav-item');
            navs.forEach(n => {
                if (n.getAttribute('onclick')!.includes(`'${tabId}'`)) n.classList.add('active');
            });

            const titles: any = {
                'teams': 'Team Database',
                'comparison': 'Stat Comparison',
                'analyzer': 'Match Analyzer',
                'win-prob': 'Win Probability Engine',
                'over-under': 'Over / Under Engine',
                'gg-ng': 'GG / NG Engine',
                'score-predictor': 'Exact Score Predictor',
                'simulator': 'League Table Simulator',
                'history': 'Prediction History',
                'settings': 'Account Settings'
            };
            document.getElementById('tab-title')!.textContent = titles[tabId];

            if (tabId === 'simulator') this.renderSimulator();
        },

        toast(msg: string) {
            const t = document.getElementById('toast')!;
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        },

        renderTeams() {
            const list = document.getElementById('teams-list')!;
            list.innerHTML = '';
            app.teams.forEach((t: any) => {
                const ratings = app.analytics.calculateRatings(t);
                const card = document.createElement('div');
                card.className = 'team-card';
                card.innerHTML = `
                    <div class="delete-btn">
                        <div class="edit-btn" onclick="app.db.editTeam(${t.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div class="del-icon" onclick="app.db.deleteTeam(${t.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </div>
                    </div>
                    <h4 style="font-weight: 700; margin-bottom: 12px;">${t.name}</h4>
                    <div class="stat-row"><span>Played</span><span>${t.played}</span></div>
                    <div class="stat-row"><span>W/D/L</span><span>${t.wins}/${t.draws}/${t.losses}</span></div>
                    <div class="stat-row"><span>Goals</span><span>${t.scored}:${t.conceded}</span></div>
                    <div class="flex justify-between items-center mt-4">
                        <span class="rating-badge rating-high">ATK: ${ratings.atk}</span>
                        <span class="rating-badge rating-mid">DEF: ${ratings.def}</span>
                        <span class="rating-badge rating-low">FORM: ${ratings.form}</span>
                    </div>
                `;
                list.appendChild(card);
            });
        },

        updateSelectors() {
            const hSel = document.getElementById('match-home')!;
            const aSel = document.getElementById('match-away')!;
            const cASel = document.getElementById('comp-team-a')!;
            const cBSel = document.getElementById('comp-team-b')!;
            
            const options = '<option value="">Select Team...</option>' + 
                app.teams.map((t: any) => `<option value="${t.id}">${t.name}</option>`).join('');
            
            hSel.innerHTML = options;
            aSel.innerHTML = options;
            cASel.innerHTML = options;
            cBSel.innerHTML = options;
        },

        renderComparison() {
            const idA = (document.getElementById('comp-team-a') as HTMLSelectElement).value;
            const idB = (document.getElementById('comp-team-b') as HTMLSelectElement).value;

            if (!idA || !idB || idA === idB) {
                document.getElementById('comparison-results')!.classList.add('hidden');
                document.getElementById('comparison-empty')!.classList.remove('hidden');
                return;
            }

            const a = app.teams.find((t: any) => t.id == idA) as any;
            const b = app.teams.find((t: any) => t.id == idB) as any;

            document.getElementById('comparison-results')!.classList.remove('hidden');
            document.getElementById('comparison-empty')!.classList.add('hidden');

            document.getElementById('comp-name-a')!.textContent = a.name;
            document.getElementById('comp-name-b')!.textContent = b.name;

            const stats = [
                { label: 'Played', valA: a.played, valB: b.played, higherBetter: true },
                { label: 'Wins', valA: a.wins, valB: b.wins, higherBetter: true },
                { label: 'Draws', valA: a.draws, valB: b.draws, higherBetter: false },
                { label: 'Losses', valA: a.losses, valB: b.losses, higherBetter: false },
                { label: 'Goals Scored', valA: a.scored, valB: b.scored, higherBetter: true },
                { label: 'Goals Conceded', valA: a.conceded, valB: b.conceded, higherBetter: false },
                { label: 'Clean Sheets', valA: a.clean, valB: b.clean, higherBetter: true },
                { label: 'BTTS %', valA: a.btts, valB: b.btts, higherBetter: true },
                { label: 'Home Avg', valA: a.homeAvg, valB: b.homeAvg, higherBetter: true },
                { label: 'Away Avg', valA: a.awayAvg, valB: b.awayAvg, higherBetter: true }
            ];

            const body = document.getElementById('comparison-body')!;
            body.innerHTML = stats.map(s => {
                let classA = '', classB = '';
                if (s.valA !== s.valB) {
                    if (s.higherBetter) {
                        if (s.valA > s.valB) classA = 'winner-stat'; else classB = 'winner-stat';
                    } else {
                        if (s.valA < s.valB) classA = 'winner-stat'; else classB = 'winner-stat';
                    }
                }
                return `
                    <tr>
                        <td class="${classA}">${s.valA}</td>
                        <td class="stat-label">${s.label}</td>
                        <td class="${classB}">${s.valB}</td>
                    </tr>
                `;
            }).join('');
        },

        updateAnalyzer() {
            const hId = (document.getElementById('match-home') as HTMLSelectElement).value;
            const aId = (document.getElementById('match-away') as HTMLSelectElement).value;

            if (!hId || !aId || hId === aId) {
                document.getElementById('analyzer-results')!.classList.add('hidden');
                document.getElementById('analyzer-empty')!.classList.remove('hidden');
                app.currentMatch = { home: null, away: null };
                return;
            }

            const h = app.teams.find((t: any) => t.id == hId) as any;
            const a = app.teams.find((t: any) => t.id == aId) as any;
            app.currentMatch = { home: h, away: a };

            document.getElementById('analyzer-results')!.classList.remove('hidden');
            document.getElementById('analyzer-empty')!.classList.add('hidden');

            const hRatings = app.analytics.calculateRatings(h);
            const aRatings = app.analytics.calculateRatings(a);

            document.getElementById('home-name-display')!.textContent = h.name;
            document.getElementById('away-name-display')!.textContent = a.name;
            document.getElementById('home-atk-val')!.textContent = hRatings.atk.toString();
            (document.getElementById('home-atk-bar') as HTMLElement).style.width = hRatings.atk + '%';
            document.getElementById('away-def-val')!.textContent = aRatings.def.toString();
            (document.getElementById('away-def-bar') as HTMLElement).style.width = aRatings.def + '%';
            
            document.getElementById('home-form-badge')!.textContent = hRatings.form;
            document.getElementById('away-form-badge')!.textContent = aRatings.form;

            const xgH = (parseFloat(h.homeAvg) + (a.conceded / (a.played || 1))).toFixed(1);
            const xgA = (parseFloat(a.awayAvg) + (h.conceded / (h.played || 1))).toFixed(1);
            document.getElementById('match-xg')!.textContent = `${xgH} - ${xgA}`;

            // Detailed VS Comparison
            const hAvgScored = (h.scored / (h.played || 1)).toFixed(2);
            const aAvgScored = (a.scored / (a.played || 1)).toFixed(2);
            const hAvgConc = (h.conceded / (h.played || 1)).toFixed(2);
            const aAvgConc = (a.conceded / (a.played || 1)).toFixed(2);
            
            const hPower = ((parseFloat(hRatings.atk.toString()) + parseFloat(hRatings.def.toString())) / 2).toFixed(1);
            const aPower = ((parseFloat(aRatings.atk.toString()) + parseFloat(aRatings.def.toString())) / 2).toFixed(1);

            document.getElementById('vs-home-goals')!.textContent = hAvgScored;
            document.getElementById('vs-away-goals')!.textContent = aAvgScored;
            document.getElementById('vs-home-conc')!.textContent = hAvgConc;
            document.getElementById('vs-away-goals-conc')!.textContent = aAvgConc;
            document.getElementById('vs-home-rating')!.textContent = hPower;
            document.getElementById('vs-away-rating')!.textContent = aPower;

            const calcWidth = (val1: string, val2: string) => {
                const total = parseFloat(val1) + parseFloat(val2) || 1;
                return (parseFloat(val1) / total * 100).toFixed(1) + '%';
            };

            (document.getElementById('vs-bar-home-goals') as HTMLElement).style.width = calcWidth(hAvgScored, aAvgScored);
            (document.getElementById('vs-bar-away-goals') as HTMLElement).style.width = calcWidth(aAvgScored, hAvgScored);
            (document.getElementById('vs-bar-home-conc') as HTMLElement).style.width = calcWidth(hAvgConc, aAvgConc);
            (document.getElementById('vs-bar-away-conc') as HTMLElement).style.width = calcWidth(aAvgConc, hAvgConc);
            (document.getElementById('vs-bar-home-rating') as HTMLElement).style.width = calcWidth(hPower, aPower);
            (document.getElementById('vs-bar-away-rating') as HTMLElement).style.width = calcWidth(aPower, hPower);

            this.runEngines(h, a);
        },

        async generateAIInsights() {
            if (!app.currentMatch.home || !app.currentMatch.away) return;
            
            const btn = document.getElementById('ai-btn') as HTMLButtonElement;
            const container = document.getElementById('ai-insights-container')!;
            
            btn.disabled = true;
            btn.textContent = 'Analyzing...';
            container.innerHTML = '<div class="flex items-center justify-center py-4"><div class="rating-badge rating-mid animate-pulse">Fetching Live Data...</div></div>';

            const data = await app.analytics.getAIInsights(app.currentMatch.home, app.currentMatch.away);
            
            let html = '';
            if (data.probabilities && data.probabilities.home !== 'N/A') {
                html += `
                    <div class="grid-3 mb-4" style="gap: 8px;">
                        <div class="card" style="padding: 10px; text-align: center; border: 1px solid var(--border);">
                            <div class="text-dim" style="font-size: 10px;">HOME</div>
                            <div class="text-accent" style="font-weight: 800;">${data.probabilities.home}</div>
                        </div>
                        <div class="card" style="padding: 10px; text-align: center; border: 1px solid var(--border);">
                            <div class="text-dim" style="font-size: 10px;">DRAW</div>
                            <div class="text-accent" style="font-weight: 800;">${data.probabilities.draw}</div>
                        </div>
                        <div class="card" style="padding: 10px; text-align: center; border: 1px solid var(--border);">
                            <div class="text-dim" style="font-size: 10px;">AWAY</div>
                            <div class="text-accent" style="font-weight: 800;">${data.probabilities.away}</div>
                        </div>
                    </div>
                `;
            }
            
            html += '<ul style="list-style: disc; padding-left: 20px; margin-bottom: 16px;">';
            data.insights.forEach((i: string) => html += `<li class="mb-2">${i}</li>`);
            html += '</ul>';
            html += `<div class="card" style="background: rgba(0, 255, 136, 0.1); border: 1px solid var(--accent);"><div class="text-accent font-bold mb-1">AI VERDICT</div>${data.verdict}</div>`;
            
            container.innerHTML = html;
            btn.disabled = false;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg> Refresh Insights';
        },

        runEngines(h: any, a: any) {
            // Win Prob
            const wp = app.analytics.getWinProbabilities(h, a);
            document.getElementById('prob-home')!.textContent = wp.h + '%';
            (document.getElementById('bar-home') as HTMLElement).style.width = wp.h + '%';
            document.getElementById('prob-draw')!.textContent = wp.d + '%';
            (document.getElementById('bar-draw') as HTMLElement).style.width = wp.d + '%';
            document.getElementById('prob-away')!.textContent = wp.a + '%';
            (document.getElementById('bar-away') as HTMLElement).style.width = wp.a + '%';
            
            document.getElementById('win-reasoning')!.innerHTML = `
                Analysis suggests a <strong>${wp.h}%</strong> chance for ${h.name} to win. 
                ${h.name}'s attack rating of ${app.analytics.calculateRatings(h).atk} faces 
                ${a.name}'s defense of ${app.analytics.calculateRatings(a).def}.
            `;
            app.db.savePrediction('Win Prob', `${wp.h}/${wp.d}/${wp.a}`);

            // Over Under
            const ou = app.analytics.getOverUnder(h, a);
            const ouGrid = document.getElementById('ou-grid')!;
            ouGrid.innerHTML = ou.map(o => `
                <div class="card prob-card">
                    <h4 class="mb-4">Line: ${o.line}</h4>
                    <div class="flex justify-between mb-2"><span>Over</span><span>${o.over}%</span></div>
                    <div class="progress-container mb-4"><div class="progress-bar" style="width: ${o.over}%"></div></div>
                    <div class="flex justify-between mb-2"><span>Under</span><span>${o.under}%</span></div>
                    <div class="progress-container"><div class="progress-bar" style="width: ${o.under}%; background: #ffa500;"></div></div>
                </div>
            `).join('');

            // GG NG
            const gg = app.analytics.getGGProb(h, a);
            document.getElementById('prob-gg')!.textContent = gg.gg + '%';
            (document.getElementById('bar-gg') as HTMLElement).style.width = gg.gg + '%';
            document.getElementById('prob-ng')!.textContent = gg.ng + '%';
            (document.getElementById('bar-ng') as HTMLElement).style.width = gg.ng + '%';

            // Scores
            const scores = app.analytics.getScores(h, a);
            const scoreGrid = document.getElementById('score-grid')!;
            scoreGrid.innerHTML = scores.map((s, i) => `
                <div class="card">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <span class="text-dim" style="font-size: 11px; text-transform: uppercase;">Rank #${i+1}</span>
                            <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -1px;">${s.s}</h2>
                        </div>
                        <div class="text-right">
                            <div class="text-accent" style="font-size: 20px; font-weight: 800;">${s.p}%</div>
                            <div class="text-dim" style="font-size: 10px;">PROBABILITY</div>
                        </div>
                    </div>
                    <div class="progress-container" style="height: 6px;">
                        <div class="progress-bar" style="width: ${Math.min(100, s.p * 4)}%; height: 100%;"></div>
                    </div>
                </div>
            `).join('');
        },

        renderSimulator() {
            const body = document.getElementById('sim-table-body')!;
            body.innerHTML = '';
            const sorted = [...app.teams].sort((a: any, b: any) => {
                const ptsA = (a.wins * 3) + a.draws;
                const ptsB = (b.wins * 3) + b.draws;
                return ptsB - ptsA;
            });

            sorted.forEach((t: any, i) => {
                const pts = (t.wins * 3) + t.draws;
                const gd = t.scored - t.conceded;
                const ratings = app.analytics.calculateRatings(t);
                const index = ((parseFloat(ratings.atk.toString()) + parseFloat(ratings.def.toString())) / 2).toFixed(1);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${i + 1}</td>
                    <td style="font-weight: 600;">${t.name}</td>
                    <td>${t.played}</td>
                    <td class="${gd >= 0 ? 'text-accent' : ''}">${gd > 0 ? '+' : ''}${gd}</td>
                    <td style="font-weight: 700;">${pts}</td>
                    <td><span class="rating-badge rating-high">${index}</span></td>
                `;
                body.appendChild(row);
            });
        },

        renderHistory() {
            const list = document.getElementById('history-list')!;
            list.innerHTML = app.history.length ? '' : '<p class="text-dim" style="text-align: center; padding: 20px;">No predictions yet.</p>';
            app.history.forEach((h: any) => {
                const item = document.createElement('div');
                item.className = 'card mb-4';
                item.style.padding = '16px';
                item.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <div style="font-size: 12px; color: var(--text-dim);">${h.date} • ${h.type}</div>
                            <div style="font-weight: 700;">${h.match}</div>
                        </div>
                        <div class="text-accent" style="font-weight: 600;">${h.result}</div>
                    </div>
                `;
                list.appendChild(item);
            });
        },

        updateStats() {
            document.getElementById('settings-preds')!.textContent = app.history.length.toString();
            document.getElementById('settings-teams')!.textContent = app.teams.length + ' Teams';
        }
    }
};

(window as any).app = app;

// Start the app
window.onload = () => app.init();
