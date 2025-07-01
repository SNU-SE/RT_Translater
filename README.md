# RT Translator - 실시간 음성 번역 웹앱

한국어, 중국어, 러시아어를 지원하는 실시간 음성 번역 웹 애플리케이션입니다.

## 🌟 주요 기능

- **실시간 음성 인식**: Web Speech API를 사용한 실시간 음성 인식
- **다국어 번역**: OpenAI API를 통한 고품질 번역 (한국어 ↔ 중국어 ↔ 러시아어)
- **음성 합성**: 번역된 텍스트의 자동 음성 재생
- **번역 기록**: 로컬 스토리지를 활용한 번역 기록 관리
- **반응형 디자인**: 모바일과 데스크톱 환경 모두 지원
- **다크/라이트 테마**: 사용자 선호도에 따른 테마 선택
- **PWA 지원**: 앱처럼 설치하여 사용 가능

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/username/RT_Translater.git
cd RT_Translater
```

### 2. 환경 설정

```bash
# 환경변수 파일 생성
cp env.example .env

# .env 파일에서 OpenAI API 키 설정
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 로컬 서버 실행

```bash
# Python 3을 사용하는 경우
python -m http.server 3000

# Node.js를 사용하는 경우
npx serve -p 3000

# 또는 Live Server (VS Code Extension) 사용
```

### 4. 브라우저에서 확인

`http://localhost:3000`에서 애플리케이션을 확인할 수 있습니다.

## 📱 사용 방법

1. **언어 선택**: 원본 언어와 번역할 언어를 선택합니다
2. **마이크 권한**: 브라우저에서 마이크 사용 권한을 허용합니다
3. **음성 입력**: 마이크 버튼을 클릭하고 말을 시작합니다
4. **번역 확인**: 실시간으로 번역된 결과를 확인합니다
5. **음성 재생**: 번역 결과를 음성으로 들을 수 있습니다

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **APIs**: 
  - Web Speech API (음성 인식)
  - Speech Synthesis API (음성 합성)
  - OpenAI API (번역)
- **Styling**: CSS Variables, Flexbox, Grid
- **Storage**: Local Storage
- **PWA**: Web App Manifest, Service Worker (예정)

## 📁 프로젝트 구조

```
RT_Translater/
├── index.html              # 메인 HTML 파일
├── manifest.json           # PWA 매니페스트
├── env.example             # 환경변수 예제
├── README.md               # 프로젝트 문서
├── assets/
│   ├── css/
│   │   └── style.css       # 메인 스타일시트
│   ├── js/
│   │   └── script.js       # 메인 JavaScript
│   └── images/             # 이미지 리소스
└── .taskmaster/            # 작업 관리 (Taskmaster)
    ├── docs/
    │   └── prd.txt         # 제품 요구사항 문서
    └── tasks/
        └── tasks.json      # 작업 관리 파일
```

## 🌐 지원 브라우저

- Chrome 60+ (권장)
- Firefox 55+
- Safari 14+
- Edge 79+

**참고**: 음성 인식 기능은 Chrome에서 가장 안정적으로 작동합니다.

## ⚙️ 설정

### OpenAI API 키 설정

1. [OpenAI 플랫폼](https://platform.openai.com/api-keys)에서 API 키를 발급받습니다
2. 웹앱의 설정 메뉴에서 API 키를 입력합니다
3. API 키는 브라우저의 로컬 스토리지에만 저장되며 외부로 전송되지 않습니다

### 음성 설정

- **음성 속도**: 0.5x ~ 2.0x 범위에서 조정 가능
- **음성 볼륨**: 0% ~ 100% 범위에서 조정 가능
- **연속 인식 모드**: 지속적인 음성 인식 또는 Push-to-Talk 모드 선택

## 🔐 보안 및 프라이버시

- **로컬 저장**: 모든 데이터는 사용자의 브라우저에만 저장됩니다
- **API 키 보안**: OpenAI API 키는 클라이언트 사이드에서만 사용됩니다
- **데이터 전송**: 번역을 위한 텍스트만 OpenAI API로 전송됩니다
- **기록 관리**: 번역 기록은 사용자가 직접 관리할 수 있습니다

## 🚧 개발 상태

### ✅ 완료된 기능
- [x] 기본 프로젝트 구조
- [x] HTML/CSS 레이아웃 및 반응형 디자인
- [x] JavaScript 애플리케이션 구조
- [x] 테마 토글 기능 (다크/라이트)
- [x] 언어 선택 UI (한국어/중국어/러시아어)
- [x] **Web Speech API 음성 인식**: 실시간 음성-텍스트 변환
- [x] **OpenAI API 번역 연동**: 
  - GPT-3.5-turbo 기반 고품질 번역
  - API 키 검증 및 테스트 기능
  - 번역 캐시 시스템 (성능 최적화)
  - 자동 재시도 로직 및 오류 처리
  - 번역 품질 신뢰도 평가
- [x] PWA 기본 구조 (매니페스트, 서비스 워커)

### 🔄 진행 중인 기능
- [x] ~~음성 합성 기능~~ (기본 구현 완료, 고도화 필요)
- [x] ~~번역 기록 관리~~ (기본 구현 완료, UX 개선 필요)

### 📋 예정된 기능
- [ ] 번역 기록 고도화 (검색, 필터링, 즐겨찾기)
- [ ] 텍스트-음성 변환 고도화 (다양한 음성, 설정)
- [ ] 사용자 설정 개선 (언어별 음성 선택 등)
- [ ] 성능 최적화 및 UI/UX 개선
- [ ] GitHub Pages 배포 및 프로덕션 환경 설정
- [ ] 추가 언어 지원 확장

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의 및 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/username/RT_Translater/issues)
- **기능 요청**: [GitHub Discussions](https://github.com/username/RT_Translater/discussions)

## 🙏 감사의 말

- OpenAI의 강력한 번역 API
- 웹 표준을 지원하는 모든 브라우저 개발팀
- 오픈소스 커뮤니티의 지속적인 기여

---

**RT Translator**로 언어의 장벽을 허물어보세요! 🌍✨ 