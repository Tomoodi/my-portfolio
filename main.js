// 画面が読み込まれた時の処理
document.addEventListener('DOMContentLoaded', () => {
    console.warn("The system is crying. Please update love.exe");

    // スムーズスクロールの設定
    const links = document.querySelectorAll('nav a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    initializeLikeCount();
    initializeSectionCloseButtons();
    initializeGirlWindow();
});

// ログインボタンを押した時の処理
function login() {
    const loginUI = document.getElementById('loginLayout');
    const loadingUI = document.getElementById('loadingLayout');
    const portfolioUI = document.getElementById('portfolioLayout');

    // 1. ログイン画面を隠して、ロード画面を出す
    if (loginUI) loginUI.style.display = 'none';
    if (loadingUI) loadingUI.style.display = 'flex';

    // 2. 2秒後にロード画面を隠して、本編を出す
    setTimeout(() => {
        if (loadingUI) loadingUI.style.display = 'none';
        if (portfolioUI) portfolioUI.style.display = 'flex';

        // ログイン後のクラスを付与
        document.body.classList.add('logged-in');
    }, 2000); // 2000ミリ秒 = 2秒
}

function initializeSectionCloseButtons() {
    document.querySelectorAll('.close-btn').forEach(btn => {
        if (btn.classList.contains('close-btn-girl')) return;

        btn.addEventListener('click', () => {
            const targetSection = btn.closest('section');
            if (!targetSection) return;

            // ボタンの親要素（section）を非表示にする
            targetSection.style.display = 'none';
            console.log("ウィンドウを閉じました。");
        });
    });
}

/*女の子*/
let girlWindowTimerId = null;
const girlImages = [
    'smile.png',
    'sad.png',
    'love.png',
    'kiss.png',
    'angry.png',
    'surprise.png'
];

function getRandomGirlImage() {
    const randomIndex = Math.floor(Math.random() * girlImages.length);
    return girlImages[randomIndex];
}

function changeGirlImage() {
    const girlImgElement = document.querySelector('.breathing-girl');
    if (!girlImgElement) return;

    girlImgElement.src = getRandomGirlImage();
}

function initializeGirlWindow() {
    const girlSection = document.getElementById('girl');
    const girlCloseButton = girlSection?.querySelector('.close-btn-girl');
    if (!girlSection || !girlCloseButton) return;

    changeGirlImage();

    girlCloseButton.addEventListener('click', () => {
        girlSection.style.display = 'none';
        console.log("女の子はまだそこにいますよ。");

        if (girlWindowTimerId) {
            clearTimeout(girlWindowTimerId);
        }

        girlWindowTimerId = setTimeout(() => {
            changeGirlImage();
            girlSection.style.display = 'block';
            girlWindowTimerId = null;
        }, 3000);
    });
}

let count = 0;

function initializeLikeCount() {
    const savedCount = localStorage.getItem('likeCount');
    count = savedCount ? Number(savedCount) : 0;

    const likeDisplay = document.getElementById('likeCount');
    if (likeDisplay) {
        likeDisplay.innerText = count;
    }
}


// 画像を入れ替える関数（second はミリ秒）
function glitchImage(second) {
    const girlImgElement = document.querySelector('.breathing-girl');
    if (!girlImgElement) return;

    const originalSrc = girlImgElement.src; 
    
    // 画像のリスト（名前を統一しました！）
    const glitchList = ['crazy.png', 'crazy2.png']; 
    
    // ランダムに選ぶ
    const selectedSrc = Math.random() < 0.5 ? glitchList[0] : glitchList[1];

    // 画像を差し替え
    girlImgElement.src = selectedSrc;

    // 指定された秒数後に元に戻す
    setTimeout(() => {
        girlImgElement.src = originalSrc;
    }, second); 
}

/* いいね連打ゲーム */
function addLike() {
    count++;
    localStorage.setItem('likeCount', String(count));
    const likeDisplay = document.getElementById('likeCount');
    if (likeDisplay) {
        likeDisplay.innerText = count;
    }
    
    const screen = document.getElementById('monitorScreen');
    if (!screen) return;

    if (count === 100) {
        // 100回目の特別演出
        screen.style.filter = 'invert(1)';
        glitchImage(3000); // 3秒間変える

        girlWindowTimerId = setTimeout(() => {
            screen.style.filter = 'none';
        }, 3000);

    } else if (count % 10 === 0) {
        // 10回ごとの通常演出
        screen.style.filter = 'invert(1)';
        glitchImage(100); // 0.1秒間変える

        girlWindowTimerId = setTimeout(() => {
            screen.style.filter = 'none';
        }, 100);
    }
}

/*隠しコマンド PIEN*/
let inputKeys = "";
document.addEventListener('keydown', (e) => {
    inputKeys += e.key.toUpperCase();
    inputKeys = inputKeys.slice(-4); 

    if (inputKeys === "PIEN") {
        document.body.style.backgroundColor = "red";
        document.body.style.backgroundImage = "none";
        alert("ぴえん……");
        changegirlImagesc();
        const screen = document.getElementById('monitorScreen');
        screen.style.filter = 'invert(1)';
    }
});

/* エラーギミック*/
function failLogin() {
    for (let i = 0; i < 10; i++) {
        girlWindowTimerId = setTimeout(() => {
            const error = document.createElement('div');
            error.innerHTML = '⚠️ エラー！<br>かわいくありません！';
            error.style.cssText = `
                position: fixed;
                top: ${Math.random() * 80}%;
                left: ${Math.random() * 80}%;
                background: white;
                border: 3px solid black;
                padding: 20px;
                color: red;
                z-index: 10000;
                box-shadow: 5px 5px 0px red;
            `;
            error.onclick = () => error.remove();
            document.body.appendChild(error);
        }, i * 100);
    }
}
const girlImagesc = [
    'crazy.png',
    'crazy2.png'
];

function changegirlImagesc() {
    const girlImgcElement = document.querySelector('.breathing-girl');
    if (!girlImgcElement) return;

    // 2. リストの中からランダムに1つ選ぶ
    const randomIndex = Math.floor(Math.random() * girlImagesc.length);
    const newSrc = girlImagesc[randomIndex];

    // 3. 画像のソースを書き換える
    girlImgcElement.src = newSrc;
}






