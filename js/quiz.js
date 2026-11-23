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
      let html = `
        <div class="quiz-header-bar">
          <div>
            <span class="section-tag">03 · Test Your Knowledge</span>
            <h2 class="section-title">Quick Concept Check</h2>
          </div>
          <div class="quiz-score-badge" id="quizScoreDisplay">
            Score: ${score} / ${questions.length}
          </div>
        </div>
      `;

      questions.forEach((qObj, qIdx) => {
        const state = answered[qIdx];
        html += `
          <div class="quiz-card" data-q-idx="${qIdx}">
            <div class="quiz-q-num">Question ${qIdx + 1} of ${questions.length}</div>
            <div class="quiz-q-text">${escapeHtml(qObj.q)}</div>
            <div class="quiz-options">
              ${qObj.options.map((opt, optIdx) => {
                let cls = 'quiz-option';
                if (state !== null) {
                  if (optIdx === qObj.answer) cls += ' correct';
                  else if (optIdx === state.selected && !state.isCorrect) cls += ' wrong';
                }
                return `
                  <button class="${cls}" data-opt-idx="${optIdx}" ${state !== null ? 'disabled' : ''}>
                    <span class="opt-letter">${letters[optIdx]}</span>
                    <span>${escapeHtml(opt)}</span>
                  </button>
                `;
              }).join('')}
            </div>
            ${state !== null ? `
              <div class="quiz-feedback ${state.isCorrect ? 'show-correct' : 'show-wrong'}">
                <strong>${state.isCorrect ? '✓ Correct!' : '✗ Incorrect.'}</strong> ${escapeHtml(qObj.explanation)}
              </div>
            ` : ''}
          </div>
        `;
      });

      html += `
        <div style="text-align: right; margin-top: 14px;">
          <button class="quiz-reset-btn" id="quizResetBtn">↺ Retake Quiz</button>
        </div>
      `;

      container.innerHTML = html;

      // Attach option click listeners
      container.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', e => {
          const card = btn.closest('.quiz-card');
          const qIdx = parseInt(card.dataset.qIdx, 10);
          const optIdx = parseInt(btn.dataset.optIdx, 10);

          if (answered[qIdx] !== null) return;

          const isCorrect = optIdx === questions[qIdx].answer;
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { init };
});
