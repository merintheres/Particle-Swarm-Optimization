/**
 * Soft Computing Lab — Safe Math Expression Parser
 * Compiles mathematical strings like "x^2 + y^2 - 10*cos(2*pi*x)" into callable JavaScript functions.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MathParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Sanitizes and compiles a single-variable expression f(x)
   * @param {string} expr - e.g. "x^2 + sin(10*pi*x)"
   * @returns {{ fn: Function, formula: string, error: string|null }}
   */
  function compile1D(expr) {
    if (!expr || !expr.trim()) {
      return { fn: null, formula: '', error: 'Expression cannot be empty.' };
    }

    try {
      const code = transformExpression(expr, ['x']);
      const fn = new Function('x', `"use strict"; return (${code});`);
      
      // Test run with sample values to detect division by zero or invalid syntax
      const testVal = fn(1.5);
      if (typeof testVal !== 'number') {
        return { fn: null, formula: expr, error: 'Expression did not return a valid numeric value.' };
      }

      return { fn, formula: expr.trim(), error: null };
    } catch (err) {
      return { fn: null, formula: expr, error: friendlyError(err) };
    }
  }

  /**
   * Sanitizes and compiles a two-variable expression f(x, y)
   * @param {string} expr - e.g. "x^2 + y^2 - 10*(cos(2*pi*x) + cos(2*pi*y))"
   * @returns {{ fn: Function, formula: string, error: string|null }}
   */
  function compile2D(expr) {
    if (!expr || !expr.trim()) {
      return { fn: null, formula: '', error: 'Expression cannot be empty.' };
    }

    try {
      const code = transformExpression(expr, ['x', 'y']);
      const fn = new Function('x', 'y', `"use strict"; return (${code});`);
      
      // Test run
      const testVal = fn(1.2, -0.8);
      if (typeof testVal !== 'number') {
        return { fn: null, formula: expr, error: 'Expression did not return a valid numeric value.' };
      }

      return { fn, formula: expr.trim(), error: null };
    } catch (err) {
      return { fn: null, formula: expr, error: friendlyError(err) };
    }
  }

  /**
   * Transforms math notation into safe JavaScript
   */
  function transformExpression(raw, allowedVars) {
    let s = raw.trim();

    // Check for disallowed characters / dangerous keywords
    if (/[;{}="`\\$]/.test(s) || /\b(window|document|eval|Function|alert|console|fetch|XMLHttpRequest|import|export|class|const|let|var|return)\b/i.test(s)) {
      throw new Error('Forbidden token or syntax detected in expression.');
    }

    // Replace exponentiation ^ with **
    s = s.replace(/\^/g, '**');

    // Replace constants pi, PI, e, E (only as standalone words)
    s = s.replace(/\bpi\b/gi, 'Math.PI');
    s = s.replace(/\be\b/gi, 'Math.E');

    // Math functions
    const funcs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'exp', 'log', 'log10', 'log2', 'sqrt', 'cbrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max'];
    funcs.forEach(fn => {
      const regex = new RegExp(`\\b${fn}\\b`, 'gi');
      s = s.replace(regex, `Math.${fn}`);
    });

    // Handle implicit multiplication like 2x -> 2*x, 3sin(x) -> 3*sin(x), )x -> )*x
    s = s.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
    s = s.replace(/(\))([a-zA-Z0-9(])/g, '$1*$2');

    return s;
  }

  function friendlyError(err) {
    const msg = err.message || '';
    if (msg.includes('Unexpected') || msg.includes('token') || msg.includes('syntax')) {
      return 'Syntax error in formula. Please check parentheses and operators (e.g., use "2*x" or "x^2").';
    }
    return msg;
  }

  return {
    compile1D,
    compile2D
  };
});
