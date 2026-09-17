const OWNER = 'westlifetc';
const REPO = 'westlifetc.github.io';
const BRANCH = 'main';

const tokenInput = document.getElementById('tokenInput');
const rememberToken = document.getElementById('rememberToken');
const connectBtn = document.getElementById('connectBtn');
const loginMsg = document.getElementById('loginMsg');

function setMessage(message, isError = false) {
  loginMsg.textContent = message;
  loginMsg.style.color = isError ? '#b34343' : '';
}

function clearSavedToken() {
  localStorage.removeItem('weraGhToken');
  sessionStorage.removeItem('weraGhToken');
}

async function verifyToken(token) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/settings.json?ref=${BRANCH}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (response.ok) return true;

  if (response.status === 401) {
    throw new Error('TOKEN_INVALID');
  }
  if (response.status === 403) {
    throw new Error('TOKEN_FORBIDDEN');
  }
  if (response.status === 404) {
    throw new Error('REPO_NOT_ALLOWED');
  }
  throw new Error(`HTTP_${response.status}`);
}

async function connect() {
  const token = tokenInput.value.trim();
  if (!token) {
    setMessage('토큰을 입력해 주세요.', true);
    return;
  }

  connectBtn.disabled = true;
  setMessage('GitHub 권한을 확인하는 중...');

  try {
    await verifyToken(token);
    clearSavedToken();

    if (rememberToken.checked) localStorage.setItem('weraGhToken', token);
    else sessionStorage.setItem('weraGhToken', token);

    setMessage('연결되었습니다. 관리자 화면으로 이동합니다.');
    window.location.replace('dashboard.html');
  } catch (error) {
    clearSavedToken();
    console.error(error);

    if (error.message === 'TOKEN_INVALID') {
      setMessage('토큰이 올바르지 않거나 만료되었습니다. 새 토큰을 만들어 다시 입력해 주세요.', true);
    } else if (error.message === 'TOKEN_FORBIDDEN') {
      setMessage('토큰 권한이 부족합니다. Contents 권한을 Read and write로 설정해 주세요.', true);
    } else if (error.message === 'REPO_NOT_ALLOWED') {
      setMessage('이 토큰에 westlifetc.github.io 저장소 접근 권한이 없습니다. 저장소 선택을 확인해 주세요.', true);
    } else {
      setMessage('GitHub 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', true);
    }
  } finally {
    connectBtn.disabled = false;
  }
}

const savedToken = localStorage.getItem('weraGhToken') || sessionStorage.getItem('weraGhToken');
if (savedToken) {
  verifyToken(savedToken)
    .then(() => window.location.replace('dashboard.html'))
    .catch(() => clearSavedToken());
}

connectBtn.addEventListener('click', connect);
tokenInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') connect();
});
