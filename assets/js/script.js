/**
 * RT Translator - 실시간 음성 번역 웹앱
 * JavaScript 메인 스크립트
 */

console.log('RT Translator Script Loading...');

// 앱 상태 관리
class RTTranslator {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.synthesis = null;
        this.currentLanguages = {
            source: 'ko',
            target: 'zh-CN'
        };
        this.settings = {
            voiceSpeed: 1.0,
            voiceVolume: 1.0,
            apiKey: '',
            continuousMode: true
        };
        this.history = [];
        
        this.init();
    }

    // 초기화
    init() {
        this.initElements();
        this.loadSettings();
        this.initSpeechRecognition();
        this.initSpeechSynthesis();
        this.bindEvents();
        this.loadHistory();
        
        // 캐시 정리 (일주일 이상 된 캐시 삭제)
        setTimeout(() => {
            this.cleanupCache();
        }, 2000);
        
        console.log('RT Translator 초기화 완료');
        
        // 통계 로그
        const stats = this.getTranslationStats();
        console.log('번역 통계:', stats);
        
        this.showToast('RT Translator가 준비되었습니다!', 'success');
    }

    // DOM 요소 초기화
    initElements() {
        this.elements = {
            // 언어 선택
            sourceLanguageButtons: document.querySelectorAll('#sourceLanguage .lang-btn'),
            targetLanguageButtons: document.querySelectorAll('#targetLanguage .lang-btn'),
            swapBtn: document.getElementById('swapLanguages'),
            
            // 음성 입력
            microphoneBtn: document.getElementById('microphoneBtn'),
            recordingIndicator: document.getElementById('recordingIndicator'),
            pushToTalkBtn: document.getElementById('pushToTalkBtn'),
            continuousBtn: document.getElementById('continuousBtn'),
            voiceStatus: document.getElementById('voiceStatus'),
            
            // 텍스트 표시
            originalText: document.getElementById('originalText'),
            translatedText: document.getElementById('translatedText'),
            originalCharCount: document.getElementById('originalCharCount'),
            translatedCharCount: document.getElementById('translatedCharCount'),
            originalConfidence: document.getElementById('originalConfidence'),
            translationConfidence: document.getElementById('translationConfidence'),
            
            // 컨트롤 버튼
            copyOriginal: document.getElementById('copyOriginal'),
            copyTranslated: document.getElementById('copyTranslated'),
            playOriginal: document.getElementById('playOriginal'),
            playTranslated: document.getElementById('playTranslated'),
            saveTranslation: document.getElementById('saveTranslation'),
            
            // 기록
            historyList: document.getElementById('historyList'),
            searchToggle: document.getElementById('searchToggle'),
            searchBar: document.getElementById('searchBar'),
            historySearch: document.getElementById('historySearch'),
            exportHistory: document.getElementById('exportHistory'),
            clearHistory: document.getElementById('clearHistory'),
            
            // 설정 및 테마
            themeToggle: document.getElementById('themeToggle'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettingsModal: document.getElementById('closeSettingsModal'),
            saveSettings: document.getElementById('saveSettings'),
            cancelSettings: document.getElementById('cancelSettings'),
            
                    // 설정 입력
        voiceSpeed: document.getElementById('voiceSpeed'),
        voiceSpeedValue: document.getElementById('voiceSpeedValue'),
        voiceVolume: document.getElementById('voiceVolume'),
        voiceVolumeValue: document.getElementById('voiceVolumeValue'),
        apiKey: document.getElementById('apiKey'),
        testApiKey: document.getElementById('testApiKey'),
            
            // 기타
            loadingOverlay: document.getElementById('loadingOverlay'),
            toastContainer: document.getElementById('toastContainer'),
            errorModal: document.getElementById('errorModal'),
            closeErrorModal: document.getElementById('closeErrorModal'),
            retryBtn: document.getElementById('retryBtn'),
            dismissErrorBtn: document.getElementById('dismissErrorBtn'),
            errorMessage: document.getElementById('errorMessage')
        };
    }

    // 음성 인식 초기화
    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari 등에서 이용하세요.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.getSpeechLang(this.currentLanguages.source);

        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateRecordingUI(true);
            this.updateVoiceStatus('음성을 듣고 있습니다...');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const confidence = event.results[i][0].confidence;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    this.handleSpeechResult(finalTranscript, confidence);
                } else {
                    interimTranscript += transcript;
                }
            }

            // 중간 결과 표시
            if (interimTranscript) {
                this.updateOriginalText(interimTranscript, false);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            this.handleSpeechError(event.error);
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateRecordingUI(false);
            
            if (this.settings.continuousMode) {
                this.updateVoiceStatus('음성 입력 대기 중...');
            } else {
                this.updateVoiceStatus('마이크 버튼을 클릭하여 음성 입력을 시작하세요');
            }
        };
    }

    // 음성 합성 초기화
    initSpeechSynthesis() {
        if (!('speechSynthesis' in window)) {
            console.warn('이 브라우저는 음성 합성을 지원하지 않습니다.');
            return;
        }

        this.synthesis = window.speechSynthesis;
    }

    // 이벤트 바인딩
    bindEvents() {
        // 언어 선택
        this.elements.sourceLanguageButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectSourceLanguage(btn.dataset.lang));
        });

        this.elements.targetLanguageButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectTargetLanguage(btn.dataset.lang));
        });

        this.elements.swapBtn.addEventListener('click', () => this.swapLanguages());

        // 음성 입력
        this.elements.microphoneBtn.addEventListener('click', () => this.toggleRecording());
        this.elements.pushToTalkBtn.addEventListener('click', () => this.setContinuousMode(false));
        this.elements.continuousBtn.addEventListener('click', () => this.setContinuousMode(true));

        // 텍스트 컨트롤
        this.elements.copyOriginal.addEventListener('click', () => this.copyText('original'));
        this.elements.copyTranslated.addEventListener('click', () => this.copyText('translated'));
        this.elements.playOriginal.addEventListener('click', () => this.playText('original'));
        this.elements.playTranslated.addEventListener('click', () => this.playText('translated'));
        this.elements.saveTranslation.addEventListener('click', () => this.saveCurrentTranslation());

        // 기록
        this.elements.searchToggle.addEventListener('click', () => this.toggleSearch());
        this.elements.historySearch.addEventListener('input', (e) => this.searchHistory(e.target.value));
        this.elements.exportHistory.addEventListener('click', () => this.exportHistory());
        this.elements.clearHistory.addEventListener('click', () => this.clearAllHistory());

        // 설정 및 테마
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                console.log('설정 버튼이 클릭되었습니다!');
                this.openSettings();
            });
            console.log('설정 버튼 이벤트 리스너가 등록되었습니다.');
        } else {
            console.error('설정 버튼 요소를 찾을 수 없습니다!');
        }
        this.elements.closeSettingsModal.addEventListener('click', () => this.closeSettings());
        this.elements.saveSettings.addEventListener('click', () => this.saveSettingsData());
        this.elements.cancelSettings.addEventListener('click', () => this.closeSettings());
        this.elements.testApiKey.addEventListener('click', () => this.testApiKey());

        // 설정 슬라이더
        this.elements.voiceSpeed.addEventListener('input', (e) => {
            this.elements.voiceSpeedValue.textContent = e.target.value + 'x';
        });

        this.elements.voiceVolume.addEventListener('input', (e) => {
            this.elements.voiceVolumeValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        // 에러 모달
        this.elements.closeErrorModal.addEventListener('click', () => this.closeErrorModal());
        this.elements.dismissErrorBtn.addEventListener('click', () => this.closeErrorModal());
        this.elements.retryBtn.addEventListener('click', () => this.retryLastAction());

        // 키보드 단축키
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // 모달 배경 클릭으로 닫기
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });

        this.elements.errorModal.addEventListener('click', (e) => {
            if (e.target === this.elements.errorModal) {
                this.closeErrorModal();
            }
        });
    }

    // 언어 선택
    selectSourceLanguage(lang) {
        if (lang === 'auto') {
            this.currentLanguages.source = 'auto';
        } else {
            this.currentLanguages.source = lang;
            if (this.recognition) {
                this.recognition.lang = this.getSpeechLang(lang);
            }
        }

        this.updateLanguageButtons('source', lang);
        this.updateVoiceStatus(`원본 언어: ${this.getLanguageName(lang)}`);
    }

    selectTargetLanguage(lang) {
        this.currentLanguages.target = lang;
        this.updateLanguageButtons('target', lang);
        this.updateVoiceStatus(`번역 언어: ${this.getLanguageName(lang)}`);
    }

    swapLanguages() {
        if (this.currentLanguages.source === 'auto') {
            this.showToast('자동감지 모드에서는 언어를 교체할 수 없습니다.', 'warning');
            return;
        }

        const temp = this.currentLanguages.source;
        this.currentLanguages.source = this.currentLanguages.target;
        this.currentLanguages.target = temp;

        this.updateLanguageButtons('source', this.currentLanguages.source);
        this.updateLanguageButtons('target', this.currentLanguages.target);

        if (this.recognition) {
            this.recognition.lang = this.getSpeechLang(this.currentLanguages.source);
        }

        this.showToast('언어가 교체되었습니다.', 'success');
    }

    // 언어 버튼 업데이트
    updateLanguageButtons(type, lang) {
        const buttons = type === 'source' ? this.elements.sourceLanguageButtons : this.elements.targetLanguageButtons;
        
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
            }
        });
    }

    // 언어 이름 반환
    getLanguageName(lang) {
        const languages = {
            'ko': '한국어',
            'zh-CN': '중국어',
            'ru': '러시아어',
            'auto': '자동감지'
        };
        return languages[lang] || lang;
    }

    // 음성 인식용 언어 코드 반환
    getSpeechLang(lang) {
        const speechLangs = {
            'ko': 'ko-KR',
            'zh-CN': 'zh-CN',
            'ru': 'ru-RU',
            'auto': 'ko-KR' // 기본값
        };
        return speechLangs[lang] || 'ko-KR';
    }

    // 음성 합성용 언어 코드 반환
    getSynthesisLang(lang) {
        const synthesisLangs = {
            'ko': 'ko-KR',
            'zh-CN': 'zh-CN',
            'ru': 'ru-RU'
        };
        return synthesisLangs[lang] || 'ko-KR';
    }

    // 녹음 토글
    toggleRecording() {
        if (!this.recognition) {
            this.showError('음성 인식이 지원되지 않습니다.');
            return;
        }

        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    // 마이크 권한 요청
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('마이크 권한 오류:', error);
            let message = '마이크 접근 권한이 필요합니다.';
            
            switch (error.name) {
                case 'NotAllowedError':
                    message = '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
                    break;
                case 'NotFoundError':
                    message = '마이크 장치를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
                    break;
                case 'NotReadableError':
                    message = '마이크 장치를 사용할 수 없습니다. 다른 앱에서 사용 중인지 확인해주세요.';
                    break;
            }
            
            this.showError(message);
            return false;
        }
    }

    // 녹음 시작
    async startRecording() {
        // 마이크 권한 확인
        const hasPermission = await this.requestMicrophonePermission();
        if (!hasPermission) {
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('녹음 시작 오류:', error);
            this.showError('음성 인식을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
    }

    // 녹음 중지
    stopRecording() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    // 연속 모드 설정
    setContinuousMode(continuous) {
        this.settings.continuousMode = continuous;
        
        this.elements.pushToTalkBtn.classList.toggle('active', !continuous);
        this.elements.continuousBtn.classList.toggle('active', continuous);
        
        if (this.recognition) {
            this.recognition.continuous = continuous;
        }

        const mode = continuous ? '연속 인식' : 'Push to Talk';
        this.showToast(`${mode} 모드로 변경되었습니다.`, 'info');
    }

    // 음성 인식 결과 처리
    async handleSpeechResult(text, confidence) {
        this.updateOriginalText(text, true, confidence);
        
        if (text.trim().length > 0) {
            await this.translateText(text);
        }
    }

    // 음성 인식 오류 처리
    handleSpeechError(error) {
        let message = '음성 인식 중 오류가 발생했습니다.';
        
        switch (error) {
            case 'no-speech':
                message = '음성이 감지되지 않았습니다.';
                break;
            case 'audio-capture':
                message = '마이크에 접근할 수 없습니다.';
                break;
            case 'not-allowed':
                message = '마이크 사용 권한이 필요합니다.';
                break;
            case 'network':
                message = '네트워크 연결을 확인해주세요.';
                break;
        }
        
        this.showError(message);
        this.updateVoiceStatus(message);
    }

    // API 키 검증
    validateApiKey(apiKey) {
        if (!apiKey || apiKey.trim().length === 0) {
            return { valid: false, message: 'API 키가 비어있습니다.' };
        }
        
        if (!apiKey.startsWith('sk-')) {
            return { valid: false, message: 'OpenAI API 키는 "sk-"로 시작해야 합니다.' };
        }
        
        if (apiKey.length < 20) {
            return { valid: false, message: 'API 키가 너무 짧습니다.' };
        }
        
        return { valid: true, message: '유효한 API 키입니다.' };
    }

    // 번역 캐시 확인
    getCachedTranslation(originalText, sourceLang, targetLang) {
        const cacheKey = `${sourceLang}-${targetLang}-${originalText}`;
        const cached = localStorage.getItem(`translation_cache_${cacheKey}`);
        
        if (cached) {
            const data = JSON.parse(cached);
            const ageInHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
            
            // 24시간 이내의 캐시만 사용
            if (ageInHours < 24) {
                return data.translation;
            } else {
                localStorage.removeItem(`translation_cache_${cacheKey}`);
            }
        }
        
        return null;
    }

    // 번역 캐시 저장
    setCachedTranslation(originalText, sourceLang, targetLang, translation) {
        const cacheKey = `${sourceLang}-${targetLang}-${originalText}`;
        const data = {
            translation,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(`translation_cache_${cacheKey}`, JSON.stringify(data));
        } catch (e) {
            console.warn('번역 캐시 저장 실패:', e);
        }
    }

    // 언어 코드를 OpenAI가 이해할 수 있는 형태로 변환
    getOpenAILanguageName(lang) {
        const languageMap = {
            'ko': 'Korean',
            'zh-CN': 'Chinese (Simplified)',
            'ru': 'Russian',
            'auto': 'auto-detected language'
        };
        return languageMap[lang] || 'unknown language';
    }

    // 텍스트 번역 (개선된 버전)
    async translateText(text, retryCount = 0) {
        // 입력 검증
        if (!text || text.trim().length === 0) {
            this.showToast('번역할 텍스트가 없습니다.', 'warning');
            return;
        }

        if (text.length > 5000) {
            this.showError('텍스트가 너무 깁니다. 5000자 이하로 입력해주세요.');
            return;
        }

        // API 키 검증
        const keyValidation = this.validateApiKey(this.settings.apiKey);
        if (!keyValidation.valid) {
            this.showError(`API 키 오류: ${keyValidation.message}\n설정에서 올바른 OpenAI API 키를 입력해주세요.`);
            return;
        }

        // 캐시 확인
        const cachedTranslation = this.getCachedTranslation(text, this.currentLanguages.source, this.currentLanguages.target);
        if (cachedTranslation) {
            this.updateTranslatedText(cachedTranslation, true, 0.95); // 캐시된 번역은 95% 신뢰도로 표시
            this.addToHistory(text, cachedTranslation);
            this.showToast('캐시된 번역을 사용했습니다.', 'info', 2000);
            return;
        }

        this.showLoading(true);
        this.updateVoiceStatus('번역 중...');
        
        try {
            // 번역 요청 구성
            const sourceLang = this.getOpenAILanguageName(this.currentLanguages.source);
            const targetLang = this.getOpenAILanguageName(this.currentLanguages.target);
            
            const systemPrompt = this.currentLanguages.source === 'auto' 
                ? `You are a professional translator. Detect the source language of the given text and translate it to ${targetLang}. Provide only the direct translation without any additional text, explanations, or language detection notes.`
                : `You are a professional translator. Translate the given text from ${sourceLang} to ${targetLang}. Provide only the direct translation without any additional text or explanations. Maintain the original tone and context.`;

            const requestBody = {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                max_tokens: Math.min(Math.ceil(text.length * 2), 1500),
                temperature: 0.1,
                top_p: 0.9,
                frequency_penalty: 0,
                presence_penalty: 0
            };

            console.log('번역 요청:', { sourceLang, targetLang, textLength: text.length });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey.trim()}`
                },
                body: JSON.stringify(requestBody)
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(this.handleApiError(response.status, responseData));
            }

            if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
                throw new Error('번역 응답 형식이 올바르지 않습니다.');
            }

            const translatedText = responseData.choices[0].message.content.trim();
            
            if (!translatedText) {
                throw new Error('번역 결과가 비어있습니다.');
            }

            // 번역 품질 평가 (간단한 휴리스틱)
            const confidence = this.calculateTranslationConfidence(text, translatedText);
            
            this.updateTranslatedText(translatedText, true, confidence);
            this.addToHistory(text, translatedText);
            
            // 캐시에 저장
            this.setCachedTranslation(text, this.currentLanguages.source, this.currentLanguages.target, translatedText);
            
            // 사용량 정보 표시
            if (responseData.usage) {
                console.log('API 사용량:', responseData.usage);
            }

            this.updateVoiceStatus('번역 완료');
            this.showToast('번역이 완료되었습니다!', 'success');
            
        } catch (error) {
            console.error('번역 오류:', error);
            
            // 재시도 로직 (최대 2회)
            if (retryCount < 2 && this.shouldRetry(error)) {
                console.log(`번역 재시도 ${retryCount + 1}/2`);
                this.showToast(`번역 재시도 중... (${retryCount + 1}/2)`, 'info');
                
                // 지수 백오프로 재시도
                setTimeout(() => {
                    this.translateText(text, retryCount + 1);
                }, Math.pow(2, retryCount) * 1000);
                return;
            }
            
            this.showError(`번역 오류: ${error.message}`);
            this.updateVoiceStatus('번역 실패');
            
        } finally {
            this.showLoading(false);
        }
    }

    // API 오류 처리
    handleApiError(status, responseData) {
        switch (status) {
            case 401:
                return 'API 키가 유효하지 않습니다. 설정에서 올바른 API 키를 입력해주세요.';
            case 402:
                return 'API 사용량 한도를 초과했습니다. OpenAI 계정을 확인해주세요.';
            case 429:
                return 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
            case 500:
            case 502:
            case 503:
                return 'OpenAI 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
            default:
                const errorMessage = responseData?.error?.message || '알 수 없는 오류가 발생했습니다.';
                return `API 오류 (${status}): ${errorMessage}`;
        }
    }

    // 재시도 여부 결정
    shouldRetry(error) {
        // 네트워크 오류나 일시적인 서버 오류인 경우 재시도
        return error.message.includes('fetch') || 
               error.message.includes('503') || 
               error.message.includes('502') ||
               error.message.includes('timeout');
    }

    // 번역 품질 신뢰도 계산 (간단한 휴리스틱)
    calculateTranslationConfidence(original, translated) {
        let confidence = 0.8; // 기본 신뢰도
        
        // 길이 비율 체크 (너무 크거나 작으면 신뢰도 감소)
        const lengthRatio = translated.length / original.length;
        if (lengthRatio > 0.3 && lengthRatio < 3) {
            confidence += 0.1;
        } else {
            confidence -= 0.2;
        }
        
        // 원본과 동일한 경우 (번역이 안 된 경우)
        if (original === translated) {
            confidence = 0.3;
        }
        
        // 특수문자만 있는 경우
        if (/^[^\w\s]+$/.test(translated)) {
            confidence = 0.4;
        }
        
        return Math.max(0.1, Math.min(1.0, confidence));
    }

    // 원본 텍스트 업데이트
    updateOriginalText(text, isFinal = false, confidence = null) {
        const element = this.elements.originalText;
        
        if (isFinal) {
            element.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        } else {
            element.innerHTML = `<p class="interim">${this.escapeHtml(text)}</p>`;
        }
        
        this.elements.originalCharCount.textContent = `${text.length}자`;
        
        if (confidence !== null) {
            const percentage = Math.round(confidence * 100);
            this.elements.originalConfidence.innerHTML = `
                <i class="fas fa-microphone"></i>
                신뢰도: ${percentage}%
            `;
        }
    }

    // 번역된 텍스트 업데이트
    updateTranslatedText(text, isFinal = false, confidence = null) {
        const element = this.elements.translatedText;
        element.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        
        this.elements.translatedCharCount.textContent = `${text.length}자`;
        
        if (confidence !== null) {
            const percentage = Math.round(confidence * 100);
            this.elements.translationConfidence.innerHTML = `
                <i class="fas fa-language"></i>
                신뢰도: ${percentage}%
            `;
        }

        // 자동 재생
        if (isFinal) {
            setTimeout(() => {
                this.playText('translated');
            }, 500);
        }
    }

    // HTML 이스케이프
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 텍스트 복사
    async copyText(type) {
        const element = type === 'original' ? this.elements.originalText : this.elements.translatedText;
        const text = element.textContent.trim();
        
        if (!text || text === '여기에 음성 인식 결과가 표시됩니다' || text === '번역 결과가 여기에 표시됩니다') {
            this.showToast('복사할 텍스트가 없습니다.', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('텍스트가 복사되었습니다!', 'success');
        } catch (error) {
            console.error('복사 오류:', error);
            this.showToast('복사에 실패했습니다.', 'error');
        }
    }

    // 텍스트 음성 재생
    playText(type) {
        if (!this.synthesis) {
            this.showToast('음성 합성이 지원되지 않습니다.', 'warning');
            return;
        }

        const element = type === 'original' ? this.elements.originalText : this.elements.translatedText;
        const text = element.textContent.trim();
        
        if (!text || text === '여기에 음성 인식 결과가 표시됩니다' || text === '번역 결과가 여기에 표시됩니다') {
            this.showToast('재생할 텍스트가 없습니다.', 'warning');
            return;
        }

        // 기존 재생 중지
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = type === 'original' ? this.currentLanguages.source : this.currentLanguages.target;
        utterance.lang = this.getSynthesisLang(targetLang);
        utterance.rate = this.settings.voiceSpeed;
        utterance.volume = this.settings.voiceVolume;

        // 음성 선택
        const voices = this.synthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(utterance.lang));
        if (voice) {
            utterance.voice = voice;
        }

        utterance.onstart = () => {
            const btn = type === 'original' ? this.elements.playOriginal : this.elements.playTranslated;
            btn.innerHTML = '<i class="fas fa-stop"></i>';
        };

        utterance.onend = () => {
            const btn = type === 'original' ? this.elements.playOriginal : this.elements.playTranslated;
            btn.innerHTML = '<i class="fas fa-play"></i>';
        };

        utterance.onerror = () => {
            this.showToast('음성 재생에 실패했습니다.', 'error');
        };

        this.synthesis.speak(utterance);
    }

    // 현재 번역 저장
    saveCurrentTranslation() {
        const originalText = this.elements.originalText.textContent.trim();
        const translatedText = this.elements.translatedText.textContent.trim();
        
        if (!originalText || !translatedText || 
            originalText === '여기에 음성 인식 결과가 표시됩니다' || 
            translatedText === '번역 결과가 여기에 표시됩니다') {
            this.showToast('저장할 번역이 없습니다.', 'warning');
            return;
        }

        this.addToHistory(originalText, translatedText, true);
        this.showToast('번역이 즐겨찾기에 저장되었습니다!', 'success');
    }

    // 기록에 추가
    addToHistory(originalText, translatedText, isFavorite = false) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date(),
            originalText,
            translatedText,
            sourceLanguage: this.currentLanguages.source,
            targetLanguage: this.currentLanguages.target,
            isFavorite
        };

        this.history.unshift(historyItem);
        
        // 최대 100개 항목 유지
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        this.saveHistory();
        this.renderHistory();
    }

    // 기록 렌더링
    renderHistory(filteredHistory = null) {
        const historyToRender = filteredHistory || this.history;
        
        if (historyToRender.length === 0) {
            this.elements.historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>번역 기록이 없습니다</p>
                </div>
            `;
            return;
        }

        this.elements.historyList.innerHTML = historyToRender.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <div class="history-item-meta">
                        <span>${this.formatDate(item.timestamp)}</span>
                        <span>${this.getLanguageName(item.sourceLanguage)} → ${this.getLanguageName(item.targetLanguage)}</span>
                        ${item.isFavorite ? '<i class="fas fa-star" style="color: #f59e0b;"></i>' : ''}
                    </div>
                    <div class="history-item-controls">
                        <button class="copy-btn" onclick="app.copyHistoryItem('${item.id}')" title="복사">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="play-btn" onclick="app.playHistoryItem('${item.id}')" title="재생">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="save-btn" onclick="app.toggleFavorite('${item.id}')" title="${item.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}">
                            <i class="fas fa-${item.isFavorite ? 'star' : 'star'}"></i>
                        </button>
                        <button class="copy-btn" onclick="app.deleteHistoryItem('${item.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="history-item-text">
                    <div class="history-text">${this.escapeHtml(item.originalText)}</div>
                    <div class="translation-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    <div class="history-text">${this.escapeHtml(item.translatedText)}</div>
                </div>
            </div>
        `).join('');
    }

    // 날짜 포맷
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        
        return date.toLocaleDateString('ko-KR');
    }

    // 기록 검색 토글
    toggleSearch() {
        const isVisible = this.elements.searchBar.style.display !== 'none';
        this.elements.searchBar.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.elements.historySearch.focus();
        } else {
            this.elements.historySearch.value = '';
            this.renderHistory();
        }
    }

    // 기록 검색
    searchHistory(query) {
        if (!query.trim()) {
            this.renderHistory();
            return;
        }

        const filtered = this.history.filter(item => 
            item.originalText.toLowerCase().includes(query.toLowerCase()) ||
            item.translatedText.toLowerCase().includes(query.toLowerCase())
        );

        this.renderHistory(filtered);
    }

    // 기록 내보내기
    exportHistory() {
        if (this.history.length === 0) {
            this.showToast('내보낼 기록이 없습니다.', 'warning');
            return;
        }

        const data = {
            exportDate: new Date().toISOString(),
            totalItems: this.history.length,
            history: this.history
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rt-translator-history-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('기록이 내보내졌습니다!', 'success');
    }

    // 전체 기록 삭제
    clearAllHistory() {
        if (this.history.length === 0) {
            this.showToast('삭제할 기록이 없습니다.', 'warning');
            return;
        }

        if (confirm('모든 번역 기록을 삭제하시겠습니까?')) {
            this.history = [];
            this.saveHistory();
            this.renderHistory();
            this.showToast('모든 기록이 삭제되었습니다.', 'success');
        }
    }

    // 기록 항목별 액션
    copyHistoryItem(id) {
        const item = this.history.find(h => h.id == id);
        if (item) {
            const text = `${item.originalText}\n→ ${item.translatedText}`;
            navigator.clipboard.writeText(text);
            this.showToast('기록이 복사되었습니다!', 'success');
        }
    }

    playHistoryItem(id) {
        const item = this.history.find(h => h.id == id);
        if (item && this.synthesis) {
            const utterance = new SpeechSynthesisUtterance(item.translatedText);
            utterance.lang = this.getSynthesisLang(item.targetLanguage);
            utterance.rate = this.settings.voiceSpeed;
            utterance.volume = this.settings.voiceVolume;
            this.synthesis.speak(utterance);
        }
    }

    toggleFavorite(id) {
        const item = this.history.find(h => h.id == id);
        if (item) {
            item.isFavorite = !item.isFavorite;
            this.saveHistory();
            this.renderHistory();
            this.showToast(item.isFavorite ? '즐겨찾기에 추가되었습니다!' : '즐겨찾기에서 제거되었습니다!', 'success');
        }
    }

    deleteHistoryItem(id) {
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            this.history = this.history.filter(h => h.id != id);
            this.saveHistory();
            this.renderHistory();
            this.showToast('기록이 삭제되었습니다.', 'success');
        }
    }

    // 테마 토글
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark-theme');
        
        if (isDark) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
            this.showToast('라이트 테마로 변경되었습니다.', 'success');
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
            this.showToast('다크 테마로 변경되었습니다.', 'success');
        }
    }

    // 설정 관리
    openSettings() {
        console.log('설정 모달 열기 시도...');
        console.log('settingsModal 요소:', this.elements.settingsModal);
        
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.add('active');
            this.loadSettingsToUI();
            console.log('설정 모달이 열렸습니다.');
        } else {
            console.error('settingsModal 요소를 찾을 수 없습니다!');
            this.showError('설정 화면을 열 수 없습니다. 페이지를 새로고침 해주세요.');
        }
    }

    closeSettings() {
        this.elements.settingsModal.classList.remove('active');
    }

    loadSettingsToUI() {
        this.elements.voiceSpeed.value = this.settings.voiceSpeed;
        this.elements.voiceSpeedValue.textContent = this.settings.voiceSpeed + 'x';
        this.elements.voiceVolume.value = this.settings.voiceVolume;
        this.elements.voiceVolumeValue.textContent = Math.round(this.settings.voiceVolume * 100) + '%';
        this.elements.apiKey.value = this.settings.apiKey;
    }

    async saveSettingsData() {
        this.settings.voiceSpeed = parseFloat(this.elements.voiceSpeed.value);
        this.settings.voiceVolume = parseFloat(this.elements.voiceVolume.value);
        const newApiKey = this.elements.apiKey.value.trim();

        // API 키가 변경된 경우 검증
        if (newApiKey !== this.settings.apiKey) {
            const validation = this.validateApiKey(newApiKey);
            if (newApiKey && !validation.valid) {
                this.showError(`API 키 오류: ${validation.message}`);
                return;
            }
            
            // 번역 캐시 초기화 (새로운 API 키)
            if (newApiKey !== this.settings.apiKey) {
                this.clearTranslationCache();
            }
        }

        this.settings.apiKey = newApiKey;
        this.saveSettings();
        this.closeSettings();
        this.showToast('설정이 저장되었습니다!', 'success');
    }

    // 번역 캐시 초기화
    clearTranslationCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('translation_cache_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('번역 캐시가 초기화되었습니다.');
    }

    // API 키 테스트
    async testApiKey() {
        const apiKey = this.elements.apiKey.value.trim();
        
        if (!apiKey) {
            this.showError('테스트할 API 키를 입력해주세요.');
            return;
        }

        const validation = this.validateApiKey(apiKey);
        if (!validation.valid) {
            this.showError(`API 키 오류: ${validation.message}`);
            return;
        }

        this.showLoading(true);
        this.showToast('API 키를 테스트하고 있습니다...', 'info');

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'user',
                            content: 'Hello'
                        }
                    ],
                    max_tokens: 5
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('✅ API 키가 정상적으로 작동합니다!', 'success', 4000);
                
                // 사용량 정보 표시
                if (data.usage) {
                    console.log('API 테스트 사용량:', data.usage);
                }
            } else {
                throw new Error(this.handleApiError(response.status, data));
            }

        } catch (error) {
            console.error('API 키 테스트 실패:', error);
            this.showError(`API 키 테스트 실패: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    // 번역 통계 조회
    getTranslationStats() {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith('translation_cache_'));
        const cacheSize = cacheKeys.reduce((size, key) => {
            return size + localStorage.getItem(key).length;
        }, 0);
        
        return {
            cachedTranslations: cacheKeys.length,
            cacheSize: (cacheSize / 1024).toFixed(2) + ' KB',
            totalHistory: this.history.length
        };
    }

    // 캐시 정리 (오래된 캐시 삭제)
    cleanupCache() {
        const keys = Object.keys(localStorage);
        let removedCount = 0;
        
        keys.forEach(key => {
            if (key.startsWith('translation_cache_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const ageInHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
                    
                    // 7일 이상 된 캐시 삭제
                    if (ageInHours > 168) {
                        localStorage.removeItem(key);
                        removedCount++;
                    }
                } catch (e) {
                    // 잘못된 형식의 캐시 삭제
                    localStorage.removeItem(key);
                    removedCount++;
                }
            }
        });
        
        if (removedCount > 0) {
            console.log(`${removedCount}개의 오래된 캐시가 정리되었습니다.`);
            this.showToast(`${removedCount}개의 오래된 캐시가 정리되었습니다.`, 'info');
        }
        
        return removedCount;
    }

    // 로컬 스토리지 관리
    saveSettings() {
        localStorage.setItem('rtTranslatorSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('rtTranslatorSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }

        // 테마 로드
        const theme = localStorage.getItem('theme') || 'light';
        document.body.className = theme + '-theme';
        this.elements.themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    saveHistory() {
        localStorage.setItem('rtTranslatorHistory', JSON.stringify(this.history));
    }

    loadHistory() {
        const saved = localStorage.getItem('rtTranslatorHistory');
        if (saved) {
            this.history = JSON.parse(saved).map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
            }));
        }
        this.renderHistory();
    }

    // UI 업데이트
    updateRecordingUI(isRecording) {
        this.elements.microphoneBtn.classList.toggle('recording', isRecording);
        this.elements.recordingIndicator.classList.toggle('active', isRecording);
        
        const icon = this.elements.microphoneBtn.querySelector('i');
        icon.className = isRecording ? 'fas fa-stop' : 'fas fa-microphone';
    }

    updateVoiceStatus(message) {
        this.elements.voiceStatus.innerHTML = `<p>${message}</p>`;
    }

    // 로딩 표시
    showLoading(show) {
        this.elements.loadingOverlay.classList.toggle('active', show);
    }

    // 토스트 알림
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div>${message}</div>
            <button class="toast-close">&times;</button>
        `;

        this.elements.toastContainer.appendChild(toast);

        // 애니메이션 효과
        setTimeout(() => toast.classList.add('show'), 100);

        // 닫기 버튼
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        // 자동 제거
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }

    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // 에러 표시
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorModal.classList.add('active');
        this.lastError = message;
    }

    closeErrorModal() {
        this.elements.errorModal.classList.remove('active');
    }

    retryLastAction() {
        this.closeErrorModal();
        // 마지막 액션 재시도 로직 (구현 필요)
        this.showToast('다시 시도합니다...', 'info');
    }

    // 키보드 단축키
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + 키 조합
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.toggleRecording();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveCurrentTranslation();
                    break;
                case 'e':
                    e.preventDefault();
                    this.swapLanguages();
                    break;
            }
        }

        // Escape 키로 모달 닫기
        if (e.key === 'Escape') {
            this.closeSettings();
            this.closeErrorModal();
        }
    }
}

// 앱 초기화
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new RTTranslator();
});

// 서비스 워커 등록 (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW 등록 성공:', registration);
            })
            .catch(error => {
                console.log('SW 등록 실패:', error);
            });
    });
}

console.log('RT Translator Script Loaded Successfully'); 