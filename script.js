// 設定：JSONファイルのパス
const DATA_FILE = 'karaoke_data.json';

// 全楽曲データを保持するグローバル変数（検索高速化のため）
let allSongs = [];

// 音階計算ロジック
function calculateScore(pitchText) {
    if (!pitchText || pitchText === "---") return -1;
    const prefixMap = {'low': 0, 'mid1': 12, 'mid2': 24, 'hi': 36, 'hihi': 48};
    const noteOrder = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const match = pitchText.match(/(low|mid1|mid2|hihi|hi)([A-G]#?)/);
    if (match) {
        const prefixScore = prefixMap[match[1]] || 0;
        const noteScore = noteOrder.indexOf(match[2]);
        return prefixScore + (noteScore !== -1 ? noteScore : 0);
    }
    return -1;
}

// データの読み込みと初期化
async function loadKaraokeData() {
    try {
        const bustCache = '?t=' + new Date().getTime();
        const response = await fetch(DATA_FILE + bustCache);
        if (!response.ok) throw new Error("ファイルが見つかりません");
        const json = await response.json();

        // 1. データの整形とスコア計算
        let songs = Object.values(json).map(song => {
            const chestScore = calculateScore(song.chest);
            const falsettoScore = calculateScore(song.falsetto);
            
            let maxScore, displayPitch, type;
            if (falsettoScore > chestScore) {
                maxScore = falsettoScore;
                displayPitch = song.falsetto;
                type = "Falsetto"; 
            } else {
                maxScore = chestScore;
                displayPitch = song.chest;
                type = "Chest"; 
            }
            return { ...song, maxScore, displayPitch, type };
        });

        // 2. 総合ランキング順にソート
        songs.sort((a, b) => b.maxScore - a.maxScore);

        // 3. 順位の計算（同率順位対応）
        let displayRank = 1;
        let actualRank = 1;
        songs.forEach((song, index) => {
            if (song.maxScore > 0) {
                if (index > 0 && song.maxScore < songs[index - 1].maxScore) {
                    displayRank = actualRank;
                }
                song.displayRank = displayRank;
                actualRank++;
            }
        });

        // 検索用に全データを保存
        allSongs = songs;

        // 4. 初回描画と検索機能のセットアップ
        renderSongs(allSongs);
        setupSearch();

    } catch (error) {
        document.getElementById('rankingList').innerHTML = `<p style="color:#ff5555; text-align:center;">エラー: ${error.message}</p>`;
    }
}

// --- 画面への描画処理（爆速化） ---
function renderSongs(songsToRender) {
    const listContainer = document.getElementById('rankingList');
    const missingContainer = document.getElementById('missingListContainer');
    const missingList = document.getElementById('missingList');
    
    listContainer.innerHTML = '';
    missingList.innerHTML = '';
    
    let hasMissing = false;
    
    // まとめてDOMに追加するためのFragment（描画負荷を最小限にする裏技）
    const fragment = document.createDocumentFragment();

    songsToRender.forEach((song) => {
        // データなしの曲
        if (song.maxScore <= 0) {
            const li = document.createElement('li');
            li.textContent = `${song.name} / ${song.artist}`;
            missingList.appendChild(li);
            hasMissing = true;
            return;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = "pointer";
        card.addEventListener('click', () => openModal(song));

        // BPMのHTML（0の場合は表示しない）
        const bpmHtml = (song.bpm && song.bpm > 0) 
            ? `<div class="bpm-badge"><span class="bpm-label">BPM</span><span class="bpm-val">${song.bpm}</span></div>` 
            : '';

        card.innerHTML = `
            <div class="rank">${song.displayRank}</div>
            <div class="info">
                <div class="title">${song.name}</div>
                <div class="artist">${song.artist}</div>
            </div>
            <div class="badges">
                ${bpmHtml}
                <div class="pitch-badge">
                    <span class="pitch-val">${song.displayPitch}</span>
                    <span class="pitch-type">${song.type}</span>
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    listContainer.appendChild(fragment);
    missingContainer.style.display = hasMissing ? 'block' : 'none';
}


// --- 検索機能（日本語入力対応・カクつき防止） ---
function setupSearch() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    
    let searchTimeout = null;

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        clearBtn.style.display = term.length > 0 ? 'flex' : 'none';

        // ★デバウンス処理: 連続入力中は検索を待機し、入力が止まってから0.3秒後に検索する
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (term === '') {
                renderSongs(allSongs);
            } else {
                // DOMではなく、データ配列から直接フィルタリングするから超高速
                const filtered = allSongs.filter(song => {
                    const title = (song.name || '').toLowerCase();
                    const artist = (song.artist || '').toLowerCase();
                    return title.includes(term) || artist.includes(term);
                });
                renderSongs(filtered);
            }
        }, 300); // 300ミリ秒待機
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        renderSongs(allSongs);
        input.focus();
    });
}


// --- モーダル（詳細画面）制御 ---
const modal = document.getElementById("songModal");
const closeBtn = document.querySelector(".close-btn");

closeBtn.onclick = () => {
    modal.style.display = "none";
    document.body.style.overflow = '';
};
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
        document.body.style.overflow = '';
    }
};

function openModal(song) {
    document.getElementById("modalTitle").textContent = song.name;
    document.getElementById("modalArtist").textContent = song.artist;
    document.getElementById("modalDuration").textContent = song.duration || "--:--";
    
    document.getElementById("modalChest").textContent = song.chest;
    document.getElementById("modalFalsetto").textContent = song.falsetto;
    document.getElementById("modalLow").textContent = song.low || "---";

    const lowScore = calculateScore(song.low);
    const highScore = song.maxScore;

    if (lowScore === -1 || highScore === -1) {
        document.getElementById("rangeBar").style.width = "0%";
        modal.style.display = "flex";
        document.body.style.overflow = 'hidden';
        return;
    }

    const scaleMin = 0;
    const scaleMax = 48;
    const totalRange = scaleMax - scaleMin;

    let leftPercent = ((lowScore - scaleMin) / totalRange) * 100;
    let widthPercent = ((highScore - lowScore) / totalRange) * 100;

    if (leftPercent < 0) leftPercent = 0;
    if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

    const bar = document.getElementById("rangeBar");
    bar.style.left = `${leftPercent}%`;
    bar.style.width = `${widthPercent}%`;
    
    if (song.type === "Falsetto") {
        bar.style.background = "linear-gradient(90deg, #1DB954 60%, #4facfe 100%)";
    } else {
        bar.style.background = "linear-gradient(90deg, #1DB954, #1ed760)";
    }

    modal.style.display = "flex";
    document.body.style.overflow = 'hidden';
}

// 実行
loadKaraokeData();