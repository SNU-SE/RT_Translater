// 전역 변수
let socket;
let currentRole = null;
let currentSessionId = null;
let selectedLanguage = 'en';
let recognition = null;
let isRecording = false;
let translationHistory = [];

// DOM 요소
const elements = {
    roleSelection: document.getElementById('roleSelection'),
    teacherInterface: document.getElementById('teacherInterface'),
    studentInterface: document.getElementById('studentInterface'),
    teacherBtn: document.getElementById('teacherBtn'),
    studentBtn: document.getElementById('studentBtn'),
    connectionStatus: document.getElementById('connectionStatus'),
    sessionCode: document.getElementById('sessionCode'),
    copySessionCode: document.getElementById('copySessionCode'),
    microphoneBtn: document.getElementById('microphoneBtn'),
    micStatus: document.getElementById('micStatus'),
    participantCount: document.getElementById('participantCount'),
    participantsList: document.getElementById('participantsList'),
    speechOutput: document.getElementById('speechOutput'),
    sessionCodeInput: document.getElementById('sessionCodeInput'),
    joinSessionBtn: document.getElementById('joinSessionBtn'),
    translationOutput: document.getElementById('translationOutput'),
    playAudioBtn: document.getElementById('playAudioBtn'),
    historyList: document.getElementById('historyList'),
    toast: document.getElementById('toast')
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    initializeEventListeners();
    initializeSpeechRecognition();
});

// Socket.io 초기화
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('서버에 연결되었습니다.');
        updateConnectionStatus('connected');
    });
    
    socket.on('disconnect', () => {
        console.log('서버 연결이 끊어졌습니다.');
        updateConnectionStatus('disconnected');
    });
    
    socket.on('reconnect', () => {
        console.log('서버에 재연결되었습니다.');
        updateConnectionStatus('connected');
    });
    
    // 세션 참여 성공
    socket.on('session-joined', (data) => {
        console.log('세션 참여 성공:', data);
        showToast('세션에 성공적으로 참여했습니다!', 'success');
        
        if (currentRole === 'student') {
            // 학생 인터페이스 업데이트
            elements.translationOutput.textContent = '교사의 음성을 기다리는 중...';
        }
    });
    
    // 참가자 참여 알림
    socket.on('participant-joined', (participant) => {
        console.log('새 참가자:', participant);
        updateParticipantsList();
        
        if (currentRole === 'teacher') {
            const role = participant.role === 'teacher' ? '교사' : '학생';
            const lang = getLanguageName(participant.language);
            showToast(`새 ${role}가 참여했습니다 (언어: ${lang})`, 'success');
        }
    });
    
    // 참가자 퇴장 알림
    socket.on('participant-left', (data) => {
        console.log('참가자 퇴장:', data);
        updateParticipantsList();
        
        if (currentRole === 'teacher') {
            showToast('참가자가 나갔습니다.', 'warning');
        }
    });
    
    // 음성 인식 결과 수신 (학생용)
    socket.on('speech-received', (data) => {
        console.log('음성 수신:', data);
        
        if (currentRole === 'student') {
            if (data.isFinal) {
                // 최종 텍스트 번역 요청
                requestTranslation(data.text);
            } else {
                // 임시 텍스트 표시
                elements.translationOutput.textContent = `[인식 중] ${data.text}`;
            }
        }
    });
    
    // 번역 결과 수신
    socket.on('translation-result', (data) => {
        console.log('번역 결과:', data);
        
        if (currentRole === 'student') {
            displayTranslation(data);
            addToHistory(data);
            enableAudioPlayback(data.translatedText, selectedLanguage);
        }
    });
    
    // 에러 처리
    socket.on('error', (error) => {
        console.error('Socket 에러:', error);
        showToast(error.message || '연결 오류가 발생했습니다.', 'error');
    });
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 역할 선택
    elements.teacherBtn.addEventListener('click', () => selectRole('teacher'));
    elements.studentBtn.addEventListener('click', () => selectRole('student'));
    
    // 세션 코드 복사
    elements.copySessionCode.addEventListener('click', copySessionCode);
    
    // 마이크 버튼
    elements.microphoneBtn.addEventListener('click', toggleRecording);
    
    // 세션 참여
    elements.joinSessionBtn.addEventListener('click', joinSession);
    elements.sessionCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinSession();
    });
    
    // 언어 선택
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => selectLanguage(btn.dataset.lang));
    });
    
    // 음성 재생
    elements.playAudioBtn.addEventListener('click', playLastAudio);
}

// 음성 인식 초기화
function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('이 브라우저는 음성 인식을 지원하지 않습니다.');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';
    
    recognition.onstart = () => {
        console.log('음성 인식 시작');
        isRecording = true;
        updateMicrophoneUI();
        elements.micStatus.textContent = '음성을 인식하고 있습니다...';
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // 화면에 표시
        const displayText = finalTranscript + (interimTranscript ? `[${interimTranscript}]` : '');
        elements.speechOutput.textContent = displayText;
        
        // 최종 결과를 서버로 전송
        if (finalTranscript) {
            socket.emit('speech-result', {
                sessionId: currentSessionId,
                text: finalTranscript.trim(),
                isFinal: true
            });
        }
        
        // 임시 결과도 전송
        if (interimTranscript) {
            socket.emit('speech-result', {
                sessionId: currentSessionId,
                text: interimTranscript.trim(),
                isFinal: false
            });
        }
    };
    
    recognition.onerror = (event) => {
        console.error('음성 인식 오류:', event.error);
        showToast(`음성 인식 오류: ${event.error}`, 'error');
        isRecording = false;
        updateMicrophoneUI();
        elements.micStatus.textContent = '음성 인식 오류가 발생했습니다.';
    };
    
    recognition.onend = () => {
        console.log('음성 인식 종료');
        isRecording = false;
        updateMicrophoneUI();
        elements.micStatus.textContent = '마이크 버튼을 눌러 시작하세요';
    };
}

// 역할 선택
function selectRole(role) {
    currentRole = role;
    elements.roleSelection.classList.add('hidden');
    
    if (role === 'teacher') {
        showTeacherInterface();
        createSession();
    } else {
        showStudentInterface();
    }
}

// 교사 인터페이스 표시
function showTeacherInterface() {
    elements.teacherInterface.classList.remove('hidden');
    
    // 마이크 권한 요청
    requestMicrophonePermission();
}

// 학생 인터페이스 표시
function showStudentInterface() {
    elements.studentInterface.classList.remove('hidden');
}

// 세션 생성 (교사용)
async function createSession() {
    try {
        const response = await fetch('/api/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentSessionId = data.sessionId;
            elements.sessionCode.textContent = data.sessionId;
            
            // 소켓으로 세션 참여
            socket.emit('join-session', {
                sessionId: currentSessionId,
                role: 'teacher',
                language: 'ko'
            });
            
            showToast('세션이 생성되었습니다!', 'success');
        } else {
            throw new Error(data.error || '세션 생성에 실패했습니다.');
        }
    } catch (error) {
        console.error('세션 생성 오류:', error);
        showToast(error.message, 'error');
    }
}

// 세션 참여 (학생용)
function joinSession() {
    const sessionCode = elements.sessionCodeInput.value.trim().toUpperCase();
    
    if (!sessionCode) {
        showToast('세션 코드를 입력해주세요.', 'warning');
        return;
    }
    
    currentSessionId = sessionCode;
    
    // 소켓으로 세션 참여
    socket.emit('join-session', {
        sessionId: currentSessionId,
        role: 'student',
        language: selectedLanguage
    });
}

// 언어 선택
function selectLanguage(langCode) {
    selectedLanguage = langCode;
    
    // UI 업데이트
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelector(`[data-lang="${langCode}"]`).classList.add('selected');
    
    showToast(`언어가 ${getLanguageName(langCode)}로 설정되었습니다.`, 'success');
}

// 마이크 권한 요청
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('마이크 권한 허용됨');
        stream.getTracks().forEach(track => track.stop()); // 스트림 정리
        elements.micStatus.textContent = '마이크 버튼을 눌러 시작하세요';
    } catch (error) {
        console.error('마이크 권한 거부:', error);
        showToast('마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.', 'error');
        elements.micStatus.textContent = '마이크 권한이 필요합니다';
    }
}

// 녹음 토글
function toggleRecording() {
    if (!recognition) {
        showToast('음성 인식이 지원되지 않습니다.', 'error');
        return;
    }
    
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// 마이크 UI 업데이트
function updateMicrophoneUI() {
    if (isRecording) {
        elements.microphoneBtn.classList.add('recording');
        elements.microphoneBtn.innerHTML = '<i class="fas fa-stop"></i>';
    } else {
        elements.microphoneBtn.classList.remove('recording');
        elements.microphoneBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

// 번역 요청
function requestTranslation(text) {
    socket.emit('translate-request', {
        sessionId: currentSessionId,
        text: text,
        targetLanguage: selectedLanguage
    });
    
    elements.translationOutput.textContent = '번역 중...';
}

// 번역 결과 표시
function displayTranslation(data) {
    elements.translationOutput.textContent = data.translatedText;
}

// 히스토리 추가
function addToHistory(data) {
    translationHistory.unshift(data);
    
    if (translationHistory.length > 50) {
        translationHistory = translationHistory.slice(0, 50);
    }
    
    updateHistoryUI();
}

// 히스토리 UI 업데이트
function updateHistoryUI() {
    elements.historyList.innerHTML = '';
    
    translationHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        historyItem.innerHTML = `
            <div class="original">원문: ${item.originalText}</div>
            <div class="translated">번역: ${item.translatedText}</div>
            <div class="timestamp">${new Date(item.timestamp).toLocaleTimeString()}</div>
        `;
        
        elements.historyList.appendChild(historyItem);
    });
}

// 음성 재생 활성화
function enableAudioPlayback(text, language) {
    elements.playAudioBtn.disabled = false;
    elements.playAudioBtn.dataset.text = text;
    elements.playAudioBtn.dataset.lang = language;
}

// 마지막 음성 재생
function playLastAudio() {
    const text = elements.playAudioBtn.dataset.text;
    const lang = elements.playAudioBtn.dataset.lang;
    
    if (!text) return;
    
    playTextToSpeech(text, lang);
}

// 텍스트 음성 변환
function playTextToSpeech(text, language) {
    if (!('speechSynthesis' in window)) {
        showToast('음성 합성이 지원되지 않습니다.', 'error');
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLanguageCode(language);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    speechSynthesis.speak(utterance);
}

// 참가자 목록 업데이트
function updateParticipantsList() {
    // 실제 구현에서는 서버에서 참가자 정보를 받아와야 함
    // 현재는 더미 구현
}

// 세션 코드 복사
function copySessionCode() {
    const sessionCode = elements.sessionCode.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(sessionCode).then(() => {
            showToast('세션 코드가 복사되었습니다!', 'success');
        });
    } else {
        // 폴백 방법
        const textArea = document.createElement('textarea');
        textArea.value = sessionCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('세션 코드가 복사되었습니다!', 'success');
    }
}

// 연결 상태 업데이트
function updateConnectionStatus(status) {
    elements.connectionStatus.className = `status-${status}`;
    
    const statusText = {
        connected: '연결됨',
        disconnected: '연결 끊김',
        connecting: '연결 중...'
    };
    
    elements.connectionStatus.innerHTML = `<i class="fas fa-circle"></i> ${statusText[status]}`;
}

// 토스트 알림 표시
function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');
    
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

// 유틸리티 함수들
function getLanguageName(langCode) {
    const languages = {
        'ko': '한국어',
        'en': '영어',
        'zh': '중국어',
        'ja': '일본어',
        'ru': '러시아어'
    };
    
    return languages[langCode] || langCode;
}

function getSpeechLanguageCode(langCode) {
    const speechCodes = {
        'ko': 'ko-KR',
        'en': 'en-US',
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ru': 'ru-RU'
    };
    
    return speechCodes[langCode] || 'en-US';
} 