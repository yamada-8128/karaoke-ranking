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
            if (song.maxScore <= 0) {
                // (データなし処理はそのまま)
                return;
            }

            // ★前の曲とスコアを比較
            if (index > 0) {
                const prevSong = songs[index - 1];
                if (song.maxScore < prevSong.maxScore) {
                    // スコアが下がったら、現在の件数カウントを表示順位にする
                    // 例: 1位, 1位 の次は 3位
                    displayRank = actualRank;
                }
                // スコアが同じなら displayRank は更新しない（同じ順位のまま）
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.style.animation = `fadeIn 0.5s ease forwards ${actualRank * 0.05}s`;
            card.style.opacity = '0';

            // 最低音があれば表示に追加しても良いですが、今回はレイアウト維持のため最高音のみ表示
            // title属性などでこっそり最低音を表示するのもアリです
            card.setAttribute('title', `Low: ${song.low || '---'}`);

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
            
            actualRank++; // 次の曲のためにカウントを進める
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

loadKaraokeData();