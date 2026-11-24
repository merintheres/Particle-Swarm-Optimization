/**
 * Soft Computing Lab — Interactive Quiz System
 * Renders interactive multiple-choice questions with instant feedback and score tracking.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuizRunner = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function init(containerSelector, questions) {
    const container = document.querySelector(containerSelector);
    if (!container || !questions || !questions.length) return;

    let score = 0;
    const answered = new Array(questions.length).fill(null);

    function renderQuiz() {
      const letters = ['A', 'B', 'C', 'D'];
      const totalAnswered = answered.filter(a => a !== null).length;
      let html = `
        <div class="quiz-container">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div style="font-size:0.9rem; color:var(--text-secondary);">Answer the questions below to test your understanding:</div>
            <div style="font-family:'JetBrains Mono', monospace; font-size:0.9rem; font-weight:700; color:var(--pso-primary); background:rgba(255,112,67,0.1); padding:4px 14px; border-radius:14px; border:1px solid rgba(255,112,67,0.25);">
              Score: ${score} / ${questions.length}
            </div>
          </div>
      `;

      questions.forEach((qObj, qIdx) => {
        const state = answered[qIdx];
        const opts = qObj.options || qObj.opts || [];
        const answer = qObj.answer !== undefined ? qObj.answer : qObj.ans;
        const explanation = qObj.explanation || qObj.exp || '';

        let cardClass = 'quiz-card';
        if (state !== null) {
          cardClass += state.isCorrect ? ' answered correct' : ' answered wrong';
        }

        html += `
          <div class="${cardClass}" data-q-idx="${qIdx}">
            <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--pso-primary); font-weight:700; margin-bottom:6px;">Question ${qIdx + 1} of ${questions.length}</div>
            <div class="quiz-q">${escapeHtml(qObj.q)}</div>
            <div class="quiz-options">
              ${opts.map((opt, optIdx) => {
                let cls = 'quiz-option';
                if (state !== null) {
                  cls += ' disabled';
                  if (optIdx === answer) cls += ' correct';
                  else if (optIdx === state.selected && !state.isCorrect) cls += ' wrong';
                }
                return `
                  <button class="${cls}" data-opt-idx="${optIdx}" ${state !== null ? 'disabled' : ''} style="display:flex; align-items:center; gap:10px; width:100%; text-align:left;">
                    <span style="font-weight:700; opacity:0.6; font-family:'JetBrains Mono',monospace;">${letters[optIdx]}.</span>
                    <span>${escapeHtml(opt)}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${state !== null ? `
              <div class="quiz-feedback ${state.isCorrect ? 'correct' : 'wrong'}">
                <strong>${state.isCorrect ? '✓ Correct!' : '✗ Not quite.'}</strong> ${escapeHtml(explanation)}
              </div>
            ` : ''}
          </div>
        `;
      });

      if (totalAnswered === questions.length) {
        const pct = Math.round((score / questions.length) * 100);
        const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚';
        html += `
          <div style="margin-top:24px; padding:24px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); text-align:center;">
            <div style="font-size:1.4rem; font-weight:700; margin-bottom:8px;">${emoji} You scored ${score} / ${questions.length} (${pct}%)</div>
            <div style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
              ${pct >= 80 ? 'Outstanding work! You have mastered the fundamentals of Particle Swarm Optimization.' :
                pct >= 60 ? 'Good effort! Review the parameter tuning and equation sections to solidify your understanding.' :
                'Keep learning — scroll back up to the Concept and Equation sections, then try again!'}
            </div>
            <button class="ctrl-btn primary" id="quizResetBtn" style="padding:10px 24px;">↺ Retake Quiz</button>
          </div>
        `;
      } else {
        html += `
          <div style="text-align: right; margin-top: 14px;">
            <button class="ctrl-btn" id="quizResetBtn">↺ Reset Quiz</button>
          </div>
        `;
      }

      html += `</div>`;

      container.innerHTML = html;

      // Attach option click listeners
      container.querySelectorAll('.quiz-option:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
          const card = btn.closest('.quiz-card');
          const qIdx = parseInt(card.dataset.qIdx, 10);
          const optIdx = parseInt(btn.dataset.optIdx, 10);

          if (answered[qIdx] !== null) return;

          const qObj = questions[qIdx];
          const answer = qObj.answer !== undefined ? qObj.answer : qObj.ans;
          const isCorrect = optIdx === answer;
          if (isCorrect) score++;

          answered[qIdx] = { selected: optIdx, isCorrect };
          renderQuiz();
        });
      });

      const resetBtn = container.querySelector('#quizResetBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          score = 0;
          for (let i = 0; i < answered.length; i++) answered[i] = null;
          renderQuiz();
        });
      }
    }

    renderQuiz();
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { init };
});
