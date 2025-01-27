import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [numbers, setNumbers] = useState([]);
  const [nextNumbers, setNextNumbers] = useState([]);
  const [current, setCurrent] = useState(1);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [rankings, setRankings] = useState([]);
  const [showRankings, setShowRankings] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const buttonSound = useRef(new Audio('button.mp3'));
  const bgMusic = useRef(new Audio('/bg_sound.mp3'));

  // 랭킹 데이터 가져오기
  const fetchRankings = async () => {
    const { data, error } = await supabase
      .from('rankings')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) console.error('Error fetching rankings:', error);
    else setRankings(data);
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  // 게임 초기화
  const initializeGame = () => {
    const firstNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
    const secondNumbers = Array.from({ length: 25 }, (_, i) => i + 26);
    
    const shuffledFirst = firstNumbers.sort(() => Math.random() - 0.5);
    const shuffledSecond = secondNumbers.sort(() => Math.random() - 0.5);
    
    setNumbers(shuffledFirst);
    setNextNumbers(shuffledSecond);
    setCurrent(1);
    setTime(0);
    setIsPlaying(true);
    setScore(0);
    setShowComplete(false);
    setShowRankings(false);
    
    // 게임 시작 시 음악 재생
    bgMusic.current.play();
    setIsMusicPlaying(true);
  };

  // 점수 저장
  const saveScore = async () => {
    if (!playerName.trim()) {
      setNotification({
        show: true,
        message: '닉네임을 입력해주세요!'
      });
      setTimeout(() => setNotification({ show: false, message: '' }), 2000);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('rankings')
        .insert([{ 
          player_name: playerName.trim(), 
          score, 
          time 
        }]);
      
      if (error) throw error;
      
      fetchRankings();
      setShowRankings(true);
    } catch (error) {
      console.error('Error saving score:', error);
      setNotification({
        show: true,
        message: '점수 저장에 실패했습니다. 다시 시도해주세요.'
      });
      setTimeout(() => setNotification({ show: false, message: '' }), 2000);
    }
  };

  // 숫자 클릭 처리
  const handleClick = (num, index) => {
    const cell = document.querySelectorAll('.number-cell')[index];
    
    if (num === current) {
      buttonSound.current.currentTime = 0;
      buttonSound.current.play();
      
      // 맞았을 때의 애니메이션
      cell.classList.add('clicked');
      setTimeout(() => {
        cell.classList.remove('clicked');
      }, 300);

      if (current <= 25) {
        const newNumbers = [...numbers];
        newNumbers[index] = nextNumbers[index];
        setNumbers(newNumbers);
      } else {
        const newNumbers = [...numbers];
        newNumbers[index] = 0;
        setNumbers(newNumbers);
      }
      
      const timeBonus = Math.max(1000 - time, 0);
      setScore(prev => prev + timeBonus);
      
      if (current === 50) {
        setIsPlaying(false);
        setShowComplete(true);
        // 게임 종료 시 음악 정지
        bgMusic.current.pause();
        bgMusic.current.currentTime = 0;
        setIsMusicPlaying(false);
      }
      
      setCurrent(prev => prev + 1);
    } else if (num !== 0) {
      // 틀렸을 때의 애니메이션과 알림
      cell.classList.add('wrong');
      setTimeout(() => {
        cell.classList.remove('wrong');
      }, 500);

      setNotification({
        show: true,
        message: `${current}를 찾아주세요!`,
      });
      setTimeout(() => setNotification({ show: false, message: '' }), 1500);
    }
  };

  // 타이머
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 팝업 상태에 따라 클래스 추가
  useEffect(() => {
    const appElement = document.querySelector('.App');
    if (showRankings || showComplete) {
      appElement.classList.add('popup-open');
    } else {
      appElement.classList.remove('popup-open');
    }
  }, [showRankings, showComplete]);

  // 컴포넌트 마운트 시 배경음악 설정
  useEffect(() => {
    bgMusic.current.loop = true;
    bgMusic.current.volume = 0.3;  // 배경음악 볼륨을 30%로 설정
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      bgMusic.current.pause();
      bgMusic.current.currentTime = 0;
    };
  }, []);

  // 효과음 볼륨 설정 추가
  useEffect(() => {
    buttonSound.current.volume = 0.7;  // 효과음 볼륨을 70%로 설정
  }, []);

  // 음악 재생/정지 토글 함수
  const toggleMusic = () => {
    if (isMusicPlaying) {
      bgMusic.current.pause();
    } else {
      bgMusic.current.play();
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  const playButtonSound = () => {
    buttonSound.current.currentTime = 0;
    buttonSound.current.play();
  };

  return (
    <div className="App">
      <div className="game-container">
        <div className="game-info">
          <h1>1 to 50</h1>
          {isPlaying && (
            <>
              <div className="game-stats">
                <div className="stat-item">
                  <span className="stat-label">현재 숫자</span>
                  <span className="stat-value">{current}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">시간</span>
                  <span className="stat-value">{time}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">점수</span>
                  <span className="stat-value">{score.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <button 
                    className={`music-button ${isMusicPlaying ? 'playing' : ''}`}
                    onClick={toggleMusic}
                    aria-label={isMusicPlaying ? '음악 끄기' : '음악 켜기'}
                  >
                    {isMusicPlaying ? '🔊' : '🔈'}
                  </button>
                </div>
              </div>
            </>
          )}
          {!isPlaying && !showComplete && (
            <>
              <p className="game-description">
                1부터 50까지 순서대로 빠르게 클릭하세요!<br/>
                <small>빠를수록 더 높은 점수를 획득할 수 있습니다</small>
              </p>
              <div className="main-buttons">
                <motion.button 
                  className="start-button" 
                  onClick={() => {
                    playButtonSound();
                    initializeGame();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  게임 시작
                </motion.button>
                <motion.button 
                  className="ranking-button"
                  onClick={() => {
                    playButtonSound();
                    setShowRankings(true);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  랭킹 보기
                </motion.button>
              </div>
            </>
          )}
        </div>
        
        {isPlaying && (
          <motion.div 
            className="game-board"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {numbers.map((num, index) => (
              <motion.div
                key={index}
                className={`number-cell ${num === 0 ? 'completed' : ''}`}
                onClick={() => handleClick(num, index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {num !== 0 ? num : ''}
              </motion.div>
            ))}
          </motion.div>
        )}

        <AnimatePresence>
          {notification.show && (
            <motion.div 
              className="notification"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <div className="notification-content">
                <span className="notification-icon">⚠️</span>
                {notification.message}
              </div>
            </motion.div>
          )}

          {showRankings && (
            <motion.div 
              className="rankings-popup"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <div className="rankings-header">
                <h2>🏆 명예의 전당 🏆</h2>
                <motion.button 
                  className="close-button"
                  onClick={() => {
                    playButtonSound();
                    setShowRankings(false);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
              <div className="rankings-list">
                <div className="ranking-header">
                  <span>순위</span>
                  <span>닉네임</span>
                  <span>점수</span>
                  <span>시간</span>
                </div>
                {rankings.map((rank, index) => (
                  <motion.div 
                    key={index} 
                    className="ranking-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="rank-number">
                      {index + 1}
                      {index < 3 && <span className="medal">{'🥇🥈🥉'[index]}</span>}
                    </span>
                    <span className="player-name">{rank.player_name}</span>
                    <span className="score">{rank.score.toLocaleString()}점</span>
                    <span className="time">{rank.time}초</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {showComplete && (
            <motion.div 
              className="completion-popup"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <h2>🎉 게임 완료! 🎉</h2>
              <div className="score-info">
                <div className="score-item">
                  <span>시간</span>
                  <strong>{time}초</strong>
                </div>
                <div className="score-item">
                  <span>점수</span>
                  <strong>{score.toLocaleString()}점</strong>
                </div>
              </div>
              <div className="nickname-input">
                <label htmlFor="nickname">닉네임을 입력하세요</label>
                <input
                  id="nickname"
                  type="text"
                  placeholder="2-10자 이내"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 10))}
                  maxLength={10}
                />
              </div>
              <div className="popup-buttons">
                <motion.button 
                  className="save-score-button"
                  onClick={() => {
                    playButtonSound();
                    saveScore();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!playerName.trim() || playerName.length < 2}
                >
                  랭킹 등록하기
                </motion.button>
                <motion.button 
                  className="restart-button"
                  onClick={() => {
                    playButtonSound();
                    initializeGame();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  다시 시작하기
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
