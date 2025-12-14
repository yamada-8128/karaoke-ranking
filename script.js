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
        songs.sort((a, b) => b.maxScore - a.maxScore);

        // 描画
        listContainer.innerHTML = '';
        let rank = 1;
        
        songs.forEach(song => {
            if (song.maxScore <= 0) {
                const li = document.createElement('li');
                li.textContent = `${song.name} / ${song.artist}`;
                missingList.appendChild(li);
                missingContainer.style.display = 'block';
                return;
            }

            const card = document.createElement('div');
            card.className = 'card';
            // アニメーション用に遅延を設定（ふわっと表示）
            card.style.animation = `fadeIn 0.5s ease forwards ${rank * 0.05}s`;
            card.style.opacity = '0'; // 初期状態は透明

            card.innerHTML = `
                <div class="rank">${rank}</div>
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
            rank++;
        });

        // 検索機能の初期化
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
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
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
}

loadKaraokeData();