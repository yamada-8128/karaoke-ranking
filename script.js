// 設定：JSONファイルのパス
const DATA_FILE = 'karaoke_data.json';

// 音階計算ロジック (Pythonと同じもの)
function calculateScore(pitchText) {
    if (!pitchText || pitchText === "---") return -1;
    
    const prefixMap = {'low': 0, 'mid1': 12, 'mid2': 24, 'hi': 36, 'hihi': 48};
    const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // 正規表現で分解 (例: hiA# -> prefix:hi, note:A#)
    const match = pitchText.match(/(low|mid1|mid2|hihi|hi)([A-G]#?)/);
    
    if (match) {
        const prefixScore = prefixMap[match[1]] || 0;
        const noteScore = noteOrder.indexOf(match[2]);
        return prefixScore + (noteScore !== -1 ? noteScore : 0);
    }
    return -1;
}

// データを取得して表示するメイン関数
async function loadKaraokeData() {
    const listContainer = document.getElementById('rankingList');
    const missingContainer = document.getElementById('missingListContainer');
    const missingList = document.getElementById('missingList');

    try {
        const response = await fetch(DATA_FILE);
        if (!response.ok) throw new Error("ファイルが見つかりません");
        const json = await response.json();

        // 1. オブジェクトを配列に変換 & スコア計算
        let songs = Object.values(json).map(song => {
            const chestScore = calculateScore(song.chest);
            const falsettoScore = calculateScore(song.falsetto);
            
            // 地声と裏声、高い方を採用
            let maxScore, displayPitch, type;
            if (falsettoScore > chestScore) {
                maxScore = falsettoScore;
                displayPitch = song.falsetto;
                type = "裏声";
            } else {
                maxScore = chestScore;
                displayPitch = song.chest;
                type = "地声";
            }

            return {
                ...song,
                maxScore: maxScore,
                displayPitch: displayPitch,
                type: type
            };
        });

        // 2. ランキング順（降順）に並び替え
        songs.sort((a, b) => b.maxScore - a.maxScore);

        // 3. 画面に描画
        listContainer.innerHTML = ''; // ロード中表示を消す
        
        let rank = 1;
        songs.forEach(song => {
            if (song.maxScore <= 0) {
                // データなしの曲
                const li = document.createElement('li');
                li.textContent = `${song.name} / ${song.artist}`;
                missingList.appendChild(li);
                missingContainer.style.display = 'block';
                return;
            }

            // カードHTMLを作成
            const card = document.createElement('div');
            card.className = 'card';
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

        // 検索機能の有効化
        setupSearch();

    } catch (error) {
        listContainer.innerHTML = `<p style="color:red">エラー: ${error.message}</p>`;
    }
}

// 検索機能
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

// 実行
loadKaraokeData();