// 設定：JSONファイルのパス
const DATA_FILE = 'karaoke_data.json';

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

async function loadKaraokeData() {
    const listContainer = document.getElementById('rankingList');
    const missingContainer = document.getElementById('missingListContainer');
    const missingList = document.getElementById('missingList');

    try {
        // ★ここが最大のポイント！★
        // URLの末尾に「?t=現在時刻」をつけることで、強制的に最新データを取得する
        const bustCache = '?t=' + new Date().getTime();
        const response = await fetch(DATA_FILE + bustCache);
        
        if (!response.ok) throw new Error("ファイルが見つかりません");
        const json = await response.json();

        // オブジェクトを配列に変換 & スコア計算
        let songs = Object.values(json).map(song => {
            const chestScore = calculateScore(song.chest);
            const falsettoScore = calculateScore(song.falsetto);
            
            let maxScore, displayPitch, type;
            if (falsettoScore > chestScore) {
                maxScore = falsettoScore;
                displayPitch = song.falsetto;
                type = "Falsetto"; // デザインに合わせて英語表記
            } else {
                maxScore = chestScore;
                displayPitch = song.chest;
                type = "Chest"; // デザインに合わせて英語表記
            }

            return { ...song, maxScore, displayPitch, type };
        });

        // ソート
        // 2. ソート
        songs.sort((a, b) => b.maxScore - a.maxScore);

        // 3. 描画（★同率順位ロジックの実装★）
        listContainer.innerHTML = '';
        
        let displayRank = 1; // 画面に表示する順位
        let actualRank = 1;  // 実際の件数カウント（1, 2, 3...）

        songs.forEach((song, index) => {
        if (song.maxScore <= 0) return; // データなしはスキップ

        // (同率順位ロジックなどはそのまま...)
        if (index > 0) {
             const prevSong = songs[index - 1];
             if (song.maxScore < prevSong.maxScore) displayRank = actualRank;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.animation = `fadeIn 0.5s ease forwards ${actualRank * 0.05}s`;
        card.style.opacity = '0';
        
        // ★クリックイベントを追加！
        card.addEventListener('click', () => openModal(song));
        card.style.cursor = "pointer"; // クリックできる感すソルにする

        card.innerHTML = `
            <div class="rank">${displayRank}</div>
            <div class="info">
                <div class="title">${song.name}</div>
                <div class="artist">${song.artist}</div>
            </div>
            <div class="pitch-badge">
                <span class="pitch-val">${song.displayPitch}</span>
                <span class="pitch-type">${song.type}</span>
            </div>
        `;
        listContainer.appendChild(card);
        actualRank++;
    });

        setupSearch();
        
        // CSSアニメーション用のキーフレームを動的に追加
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
        document.head.appendChild(styleSheet);

    } catch (error) {
        listContainer.innerHTML = `<p style="color:#ff5555; text-align:center;">エラー: ${error.message}</p>`;
    }
}

function setupSearch() {
    const input = document.getElementById('searchInput');
	const clearBtn = document.getElementById('clearBtn');
    // 入力イベント
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        // ★文字があればクリアボタンを表示
        clearBtn.style.display = term.length > 0 ? 'flex' : 'none';

        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const title = card.querySelector('.title').textContent.toLowerCase();
            const artist = card.querySelector('.artist').textContent.toLowerCase();
            if (title.includes(term) || artist.includes(term)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // ★クリアボタンのクリックイベント
    clearBtn.addEventListener('click', () => {
        input.value = ''; // 文字を消す
        input.dispatchEvent(new Event('input')); // 入力イベントを強制発火させてリストを全表示に戻す
        input.focus(); // 入力欄にフォーカスを戻す
    });
}

// モーダル要素の取得
const modal = document.getElementById("songModal");
const closeBtn = document.querySelector(".close-btn");

// 閉じるボタン
closeBtn.onclick = () => modal.style.display = "none";
// 外側クリックで閉じる
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
}

function openModal(song) {
    // テキスト情報をセット
    document.getElementById("modalTitle").textContent = song.name;
    document.getElementById("modalArtist").textContent = song.artist;
    document.getElementById("modalDuration").textContent = song.duration || "--:--";
    
    document.getElementById("modalChest").textContent = song.chest;
    document.getElementById("modalFalsetto").textContent = song.falsetto;
    document.getElementById("modalLow").textContent = song.low || "---";

    // --- 音域バーの計算 ---
    // 基準：lowG(下限) ～ hihiC(上限) くらいを全体の幅(100%)とする
    // 音階スコア: lowG=-5, mid1C=12, hiC=36, hihiC=60 くらい
    
    // スコア計算
    const lowScore = calculateScore(song.low); // 最低音
    const highScore = song.maxScore;           // 最高音(地声/裏声の高い方)

    // データが不十分な場合のフォールバック
    if (lowScore === -1 || highScore === -1) {
        document.getElementById("rangeBar").style.width = "0%";
        modal.style.display = "flex";
        return;
    }

    // 表示用の全体スケール設定 (lowG ～ hihiC)
    const scaleMin = -5; // lowGあたり
    const scaleMax = 60; // hihiCあたり
    const totalRange = scaleMax - scaleMin;

    // 左端の位置 (%) = (曲の最低音 - スケール最低音) / 全体幅
    let leftPercent = ((lowScore - scaleMin) / totalRange) * 100;
    
    // バーの長さ (%) = (曲の最高音 - 曲の最低音) / 全体幅
    let widthPercent = ((highScore - lowScore) / totalRange) * 100;

    // はみ出し防止
    if (leftPercent < 0) leftPercent = 0;
    if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

    // スタイル適用
    const bar = document.getElementById("rangeBar");
    bar.style.left = `${leftPercent}%`;
    bar.style.width = `${widthPercent}%`;
    
    // 裏声が最高音の場合は色を変える演出（オプション）
    if (song.type === "Falsetto") {
        bar.style.background = "linear-gradient(90deg, #1DB954 60%, #4facfe 100%)"; // 青っぽく
    } else {
        bar.style.background = "linear-gradient(90deg, #1DB954, #1ed760)"; // 緑
    }

    // 表示
    modal.style.display = "flex";
}

loadKaraokeData();