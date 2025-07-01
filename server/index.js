const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 세션 저장소 (메모리 기반)
const sessions = new Map();

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API 라우트
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '실시간 번역 서버가 정상적으로 실행 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// 세션 생성 API
app.post('/api/session', (req, res) => {
  const sessionId = generateSessionCode();
  const session = {
    id: sessionId,
    teacherId: null,
    participants: [],
    createdAt: new Date(),
    isActive: true
  };
  
  sessions.set(sessionId, session);
  
  res.json({ 
    sessionId,
    message: '세션이 성공적으로 생성되었습니다.'
  });
});

// 세션 조회 API
app.get('/api/session/:id', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);
  
  if (!session) {
    return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
  }
  
  res.json(session);
});

// Socket.io 연결 처리
io.on('connection', (socket) => {
  console.log(`새로운 연결: ${socket.id}`);
  
  // 세션 참여
  socket.on('join-session', (data) => {
    const { sessionId, role, language } = data;
    const session = sessions.get(sessionId);
    
    if (!session) {
      socket.emit('error', { message: '세션을 찾을 수 없습니다.' });
      return;
    }
    
    // 세션 룸에 참여
    socket.join(sessionId);
    
    // 참가자 정보 저장
    const participant = {
      socketId: socket.id,
      role, // 'teacher' 또는 'student'
      language: language || 'ko',
      joinedAt: new Date(),
      isConnected: true
    };
    
    if (role === 'teacher') {
      session.teacherId = socket.id;
    }
    
    session.participants.push(participant);
    
    // 세션 참여 알림
    socket.emit('session-joined', { sessionId, participant });
    socket.to(sessionId).emit('participant-joined', participant);
    
    console.log(`${role}이 세션 ${sessionId}에 참여했습니다.`);
  });
  
  // 음성 인식 결과 수신 및 브로드캐스트
  socket.on('speech-result', (data) => {
    const { sessionId, text, isFinal } = data;
    
    // 세션의 모든 학생들에게 전송
    socket.to(sessionId).emit('speech-received', {
      text,
      isFinal,
      timestamp: new Date()
    });
    
    console.log(`음성 인식 결과: ${text} (최종: ${isFinal})`);
  });
  
  // 번역 요청
  socket.on('translate-request', (data) => {
    const { sessionId, text, targetLanguage } = data;
    
    // 실제 번역은 추후 OpenAI API 연동 시 구현
    // 현재는 더미 응답
    const translatedText = `[번역됨-${targetLanguage}] ${text}`;
    
    socket.emit('translation-result', {
      originalText: text,
      translatedText,
      targetLanguage,
      timestamp: new Date()
    });
  });
  
  // 연결 해제 처리
  socket.on('disconnect', () => {
    console.log(`연결 해제: ${socket.id}`);
    
    // 모든 세션에서 해당 참가자 제거
    sessions.forEach((session, sessionId) => {
      const participantIndex = session.participants.findIndex(p => p.socketId === socket.id);
      if (participantIndex !== -1) {
        session.participants.splice(participantIndex, 1);
        
        // 교사가 나간 경우
        if (session.teacherId === socket.id) {
          session.teacherId = null;
        }
        
        // 다른 참가자들에게 알림
        socket.to(sessionId).emit('participant-left', { socketId: socket.id });
      }
    });
  });
});

// 유틸리티 함수
function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 서버 시작
server.listen(PORT, () => {
  console.log(`
🚀 실시간 번역 서버가 시작되었습니다!
📍 포트: ${PORT}
🌐 URL: http://localhost:${PORT}
📊 상태 확인: http://localhost:${PORT}/api/health
  `);
});

// 에러 핸들링
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 